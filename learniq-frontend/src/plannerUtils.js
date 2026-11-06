// Small helpers shared by the Study Planner and My Tasks pages.

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAYS_LONG = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

const pad = (n) => String(n).padStart(2, "0");

// Today's date in the student's own timezone, as "YYYY-MM-DD"
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "YYYY-MM-DD" -> a Date at local midnight
export function parseDate(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Whole days from a to b (b later = positive)
export function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

// "Tue, 4 Nov"
export function formatDate(s) {
  if (!s) return "";
  return parseDate(s).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Monday = 0 ... Sunday = 6 (same as the planner engine)
export function weekdayIndex(s) {
  return (parseDate(s).getDay() + 6) % 7;
}

// Reminder time: ISO string <-> the value of <input type="datetime-local">
export function isoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatMinutes(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

// Calls the backend with the login token. Never throws.
// Returns { ok, status, data, error }
export async function api(token, method, path, body) {
  try {
    const res = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: data.error || data.message || "Something went wrong. Please try again.",
      };
    }
    return { ok: true, status: res.status, data, error: "" };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: {},
      error: "Could not reach the server. Please check your connection.",
    };
  }
}

// Where a plan task's "Practice" button should go (router state for /quiz)
export function practiceState(topic, subtopic) {
  return { practice: { subject: topic || "", subtopic: subtopic || "" } };
}