// Simple per-user rate limiters (kept in memory). They protect the free AI quota
// and the login from password guessing.
//
// Note: the counters live in memory, so they reset when the backend restarts,
// and they are not shared if you ever run more than one copy of the backend.

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

// ---------------------------------------------------------------------------
// 1) createLimiter: per signed-in user, per minute and per day.
//    Put it AFTER requireAuth on a route.
// ---------------------------------------------------------------------------
function createLimiter({ name, perMinute, perDay, message }) {
  const hits = new Map(); // user id -> list of request times (oldest first)

  // Forget users who have been quiet for a day, so memory stays small
  const cleaner = setInterval(() => {
    const cutoff = Date.now() - DAY;
    for (const [key, times] of hits) {
      if (times.length === 0 || times[times.length - 1] < cutoff) hits.delete(key);
    }
  }, 10 * MINUTE);
  if (cleaner.unref) cleaner.unref();

  return function limiter(req, res, next) {
    const key = String((req.user && req.user.id) || req.ip || "anonymous");
    const now = Date.now();
    const times = (hits.get(key) || []).filter((t) => t > now - DAY);

    const lastMinute = times.filter((t) => t > now - MINUTE);
    if (lastMinute.length >= perMinute) {
      const wait = Math.max(1, Math.ceil((lastMinute[0] + MINUTE - now) / 1000));
      console.warn(`[rate-limit] ${name}: too fast, user ${key}`);
      res.set("Retry-After", String(wait));
      return res.status(429).json({
        error: `You are going a little fast. Please wait ${wait} seconds and try again.`,
        retryAfterSeconds: wait,
      });
    }

    if (times.length >= perDay) {
      const wait = Math.ceil((times[0] + DAY - now) / 1000);
      const hours = Math.max(1, Math.ceil(wait / 3600));
      console.warn(`[rate-limit] ${name}: daily limit reached, user ${key}`);
      res.set("Retry-After", String(wait));
      return res.status(429).json({
        error:
          message ||
          `You have used today's free limit for this feature. Please try again in about ${hours} hour(s).`,
        retryAfterSeconds: wait,
      });
    }

    times.push(now);
    hits.set(key, times);
    next();
  };
}

// ---------------------------------------------------------------------------
// 2) createAttemptLimiter: for routes where nobody is signed in yet
//    (login, signup). You choose the key (for example the IP address).
//    max attempts in windowMinutes minutes.
//    countFailuresOnly: true = only requests that END with an error count,
//    so a normal successful login never uses up the allowance.
// ---------------------------------------------------------------------------
function createAttemptLimiter({
  name,
  max,
  windowMinutes,
  keyFn,
  countFailuresOnly = false,
  message,
}) {
  const WINDOW = windowMinutes * MINUTE;
  const hits = new Map(); // key -> list of attempt times (oldest first)

  const cleaner = setInterval(() => {
    const cutoff = Date.now() - WINDOW;
    for (const [key, times] of hits) {
      if (times.length === 0 || times[times.length - 1] < cutoff) hits.delete(key);
    }
  }, 5 * MINUTE);
  if (cleaner.unref) cleaner.unref();

  function record(key) {
    const now = Date.now();
    const times = (hits.get(key) || []).filter((t) => t > now - WINDOW);
    times.push(now);
    hits.set(key, times);
  }

  return function attemptLimiter(req, res, next) {
    const key = String(keyFn(req) || "unknown");
    const now = Date.now();
    const times = (hits.get(key) || []).filter((t) => t > now - WINDOW);

    if (times.length >= max) {
      const wait = Math.max(1, Math.ceil((times[0] + WINDOW - now) / 1000));
      const minutes = Math.max(1, Math.ceil(wait / 60));
      const text =
        message ||
        `Too many tries. Please wait about ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
      console.warn(`[rate-limit] ${name}: blocked, key ${key}`);
      res.set("Retry-After", String(wait));
      // "error" and "message" both carry the text, so any page can show it
      return res.status(429).json({ error: text, message: text, retryAfterSeconds: wait });
    }

    if (countFailuresOnly) {
      // Count it only if the request ends with an error (wrong password, bad input...)
      res.on("finish", () => {
        if (res.statusCode >= 400 && res.statusCode !== 429) record(key);
      });
    } else {
      record(key);
    }
    next();
  };
}

module.exports = { createLimiter, createAttemptLimiter };