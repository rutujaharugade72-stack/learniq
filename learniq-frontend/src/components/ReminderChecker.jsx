import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, X, Check, Clock, ArrowRight, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../reminders.css";

const CHECK_EVERY_MS = 15 * 1000; // Check every 15s so alarms fire promptly
const MISSED_AFTER_MS = 5 * 60 * 1000;
const MAX_CARDS = 4;
const SNOOZE_MIN = 10;

// Shared audio context singleton
let globalAudioCtx = null;

function getAudioContext() {
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  return globalAudioCtx;
}

// Gentle pleasant two-tone notification chime
async function playReminderChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: 880 Hz (A5), slight delay for pleasant chime effect
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn("Audio autoplay blocked by browser:", err.message);
  }
}

function timeLabel(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function destinationFor(card) {
  if (card.kind === "task") {
    const l = card.link || {};
    if (l.type === "practice") {
      return { path: "/quiz", state: { practice: { subject: l.topic, subtopic: l.subtopic } } };
    }
    if (l.type === "notes") return { path: "/notes" };
    return { path: "/assignments" };
  }
  if (["practice", "retest", "revision"].includes(card.type) && card.topic) {
    return { path: "/quiz", state: { practice: { subject: card.topic, subtopic: card.subtopic } } };
  }
  if (card.type === "learn") return { path: "/notes" };
  return { path: "/planner" };
}

export default function ReminderChecker() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [cards, setCards] = useState([]);
  const [busyKey, setBusyKey] = useState("");
  const [errors, setErrors] = useState({});
  const [perm, setPerm] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const seenRef = useRef(new Set());

  // Unlock AudioContext on the very first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  const authHeaders = useCallback(
    (json) => ({
      Authorization: `Bearer ${token}`,
      ...(json ? { "Content-Type": "application/json" } : {}),
    }),
    [token]
  );

  // Poll for due reminders
  const poll = useCallback(async () => {
    if (!token) return;
    try {
      const [tRes, pRes] = await Promise.all([
        fetch("/api/tasks", { headers: authHeaders(false) }),
        fetch("/api/planner/me", { headers: authHeaders(false) }),
      ]);

      const now = Date.now();
      const due = [];

      if (tRes.ok) {
        const data = await tRes.json();
        (data.tasks || []).forEach((t) => {
          if (t.done || !t.remindAt) return;
          const at = new Date(t.remindAt).getTime();
          if (Number.isNaN(at) || at > now) return;
          due.push({
            key: `task:${t.id}:${at}`,
            kind: "task",
            id: t.id,
            title: t.title,
            sub: t.tag ? `To-do · ${t.tag}` : "To-do",
            link: t.link,
            at,
            missed: now - at > MISSED_AFTER_MS,
          });
        });
      }

      if (pRes.ok) {
        const data = await pRes.json();
        const plan = data.plan;
        if (plan && Array.isArray(plan.days)) {
          plan.days.forEach((day) => {
            (day.tasks || []).forEach((t) => {
              if (t.done || !t.remindAt) return;
              const at = new Date(t.remindAt).getTime();
              if (Number.isNaN(at) || at > now) return;
              due.push({
                key: `plan:${t.id}:${at}`,
                kind: "plan",
                id: t.id,
                title: t.title,
                sub: `Study plan · ${day.label}`,
                type: t.type,
                topic: t.topic,
                subtopic: t.subtopic,
                at,
                missed: now - at > MISSED_AFTER_MS,
              });
            });
          });
        }
      }

      const fresh = due
        .filter((d) => !seenRef.current.has(d.key))
        .sort((a, b) => a.at - b.at);
      if (fresh.length === 0) return;

      fresh.forEach((d) => seenRef.current.add(d.key));
      setCards((prev) => [...prev, ...fresh]);

      // Play the chime
      playReminderChime();

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        fresh.forEach((d) => {
          try {
            new Notification(d.missed ? "You missed a reminder" : "LearnIQ reminder", {
              body: d.title,
              tag: d.key,
            });
          } catch {
            /* ignore notification error */
          }
        });
      }
    } catch (err) {
      console.error("Reminder check failed:", err.message);
    }
  }, [token, authHeaders]);

  useEffect(() => {
    if (!token) return undefined;

    poll();
    const id = setInterval(poll, CHECK_EVERY_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    const onCheck = () => poll();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("learniq:check-reminders", onCheck);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("learniq:check-reminders", onCheck);
    };
  }, [token, poll]);

  function removeCard(key) {
    setCards((prev) => prev.filter((c) => c.key !== key));
  }

  function showError(key, message) {
    setErrors((prev) => ({ ...prev, [key]: message }));
  }

  async function patchPlanTask(taskId, patch) {
    const res = await fetch("/api/planner/me", { headers: authHeaders(false) });
    if (!res.ok) throw new Error("Could not load your plan");
    const data = await res.json();
    if (!data.plan) return;

    let found = false;
    const days = data.plan.days.map((d) => ({
      ...d,
      tasks: d.tasks.map((t) => {
        if (t.id !== taskId) return t;
        found = true;
        return { ...t, ...patch };
      }),
    }));
    if (!found) return;

    const put = await fetch("/api/planner/me", {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify({ days }),
    });
    if (!put.ok) throw new Error("Could not save the change");
  }

  async function dismiss(card, snooze) {
    setBusyKey(card.key);
    try {
      if (card.kind === "task") {
        const res = await fetch(`/api/tasks/${card.id}/ack`, {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify(snooze ? { snoozeMinutes: SNOOZE_MIN } : {}),
        });
        if (!res.ok) throw new Error("Could not update the reminder");
      } else {
        const next = snooze ? new Date(Date.now() + SNOOZE_MIN * 60 * 1000).toISOString() : null;
        await patchPlanTask(card.id, { remindAt: next });
      }
      removeCard(card.key);
      window.dispatchEvent(new Event("learniq:tasks-changed"));
    } catch (err) {
      showError(card.key, err.message || "Something went wrong. Please try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function markDone(card) {
    setBusyKey(card.key);
    try {
      const res = await fetch(`/api/tasks/${card.id}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ done: true, remindAt: null }),
      });
      if (!res.ok) throw new Error("Could not mark it done");
      removeCard(card.key);
      window.dispatchEvent(new Event("learniq:tasks-changed"));
    } catch (err) {
      showError(card.key, err.message || "Something went wrong. Please try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function openCard(card) {
    const dest = destinationFor(card);
    await dismiss(card, false);
    navigate(dest.path, dest.state ? { state: dest.state } : undefined);
  }

  function allowNotifications() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setPerm);
  }

  if (cards.length === 0) return null;

  const visible = cards.slice(0, MAX_CARDS);
  const hidden = cards.length - visible.length;

  return (
    <div className="rm-stack" role="region" aria-label="Reminders">
      {visible.map((c) => {
        const busy = busyKey === c.key;
        return (
          <div key={c.key} className={`rm-card ${c.missed ? "missed" : ""}`}>
            <div className="rm-top">
              <span className="rm-icon">
                <BellRing size={16} />
              </span>
              <span className="rm-label">{c.missed ? "You missed this" : "Reminder"}</span>

              {/* Quick test chime button so user can test sound at any time */}
              <button
                type="button"
                className="rm-x"
                style={{ marginRight: 4 }}
                onClick={() => playReminderChime()}
                title="Test reminder chime"
              >
                <Volume2 size={15} />
              </button>

              <button
                type="button"
                className="rm-x"
                onClick={() => dismiss(c, false)}
                disabled={busy}
                aria-label="Dismiss reminder"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rm-title">{c.title}</div>
            <div className="rm-sub">
              {c.sub} · {c.missed ? `was due at ${timeLabel(c.at)}` : `due at ${timeLabel(c.at)}`}
            </div>

            {errors[c.key] && <div className="rm-err">{errors[c.key]}</div>}

            <div className="rm-actions">
              {c.kind === "task" && (
                <button
                  type="button"
                  className="rm-btn primary"
                  onClick={() => markDone(c)}
                  disabled={busy}
                >
                  <Check size={14} /> Done
                </button>
              )}
              <button
                type="button"
                className="rm-btn"
                onClick={() => dismiss(c, true)}
                disabled={busy}
              >
                <Clock size={14} /> Snooze {SNOOZE_MIN} min
              </button>
              <button
                type="button"
                className={c.kind === "task" ? "rm-btn" : "rm-btn primary"}
                onClick={() => openCard(c)}
                disabled={busy}
              >
                Open <ArrowRight size={14} />
              </button>
            </div>
          </div>
        );
      })}

      {hidden > 0 && <div className="rm-sub" style={{ textAlign: "right" }}>+{hidden} more reminders</div>}

      {perm === "default" && (
        <button type="button" className="rm-allow" onClick={allowNotifications}>
          Allow desktop notifications
        </button>
      )}
    </div>
  );
}