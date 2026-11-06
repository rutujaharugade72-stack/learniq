// Tells the backend "the student did something" so it shows in the
// Activity feed (and counts toward the Daily Goal when it is a finished thing).
// It never throws, so a logging problem can never break a page.
export async function logActivity(token, { type, title, description = "", link = "" }) {
  if (!token) return;
  try {
    await fetch("/api/activities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, title, description, link }),
    });
  } catch (err) {
    console.error("Could not log activity:", err.message);
  }
}