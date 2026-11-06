import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  CalendarDays,
  FastForward,
  RefreshCw,
  FilePlus2,
  BellRing,
  HelpCircle,
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useReportActivity } from "../context/AssistantContext";
import Robot from "../components/Robot";
import PlannerSetup from "../components/PlannerSetup";
import PlannerPlan from "../components/PlannerPlan";
import { todayStr, api } from "../plannerUtils";
import "../planner.css";

const REMINDER_KEY = "learniq_study_reminder_time";
const ONBOARDING_KEY = "learniq_planner_guide_dismissed";

function readReminderTime() {
  try {
    return localStorage.getItem(REMINDER_KEY) || "";
  } catch {
    return "";
  }
}

function readGuideDismissed() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch {
    return false;
  }
}

export default function Planner() {
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [mode, setMode] = useState("plan"); // plan | setup
  const [busy, setBusy] = useState(""); // "" | "shift" | "refresh"
  const [confirmNew, setConfirmNew] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reminderTime, setReminderTime] = useState(readReminderTime());
  const [guideDismissed, setGuideDismissed] = useState(readGuideDismissed());

  // Load the saved plan
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await api(token, "GET", "/api/planner/me");
      if (cancelled) return;
      if (res.ok && res.data && res.data.plan) {
        setPlan(res.data.plan);
        setMode("plan");
      } else if (res.ok) {
        setPlan(null);
        setMode("setup");
      } else {
        setError(res.error || "Could not load your plan.");
        setMode("setup");
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Numbers for the robot bubble, missed tasks, and AI Teacher activity
  const today = todayStr();
  const days = plan && Array.isArray(plan.days) ? plan.days : [];
  const allTasks = days.flatMap((d) => d.tasks || []);
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => t.done).length;
  const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const missedCount = days
    .filter((d) => d.date < today)
    .reduce((sum, d) => sum + (d.tasks || []).filter((t) => !t.done).length, 0);

  // Tells the AI Teacher what the student is looking at
  useReportActivity({
    page: "Study Planner",
    summary: plan
      ? `Study plan until ${plan.targetDate}: ${doneTasks} of ${totalTasks} tasks done (${percent}%).`
      : "The student has no study plan yet and is setting one up.",
    details: plan ? `${missedCount} missed tasks from past days.` : "",
  });

  // Mascot bubble speech
  let bubbleText = "Let's plan your study!";
  let bubbleClass = "";
  if (loading) {
    bubbleText = "Looking for your plan...";
    bubbleClass = "busy";
  } else if (busy) {
    bubbleText = "Working on it...";
    bubbleClass = "busy";
  } else if (plan && mode === "plan") {
    if (percent === 100 && totalTasks > 0) {
      bubbleText = "Plan finished! Amazing work!";
      bubbleClass = "happy";
    } else if (missedCount > 0) {
      bubbleText = `${missedCount} missed task${missedCount === 1 ? "" : "s"}. No stress, click "Catch up" to move them forward.`;
    } else if (percent > 0) {
      bubbleText = `${percent}% done. Keep going!`;
      bubbleClass = "happy";
    } else {
      bubbleText = "Your plan is ready. Let's start with today!";
    }
  }

  // ---------- actions ----------
  async function shiftMissed() {
    setError("");
    setNotice("");
    setBusy("shift");
    const res = await api(token, "POST", "/api/planner/me/shift-missed", { today });
    setBusy("");
    if (!res.ok) {
      setError(res.error || "Could not move your missed tasks.");
      return;
    }
    if (res.data.plan) setPlan(res.data.plan);
    const moved = res.data.moved || 0;
    const notMoved = res.data.notMoved || 0;
    if (moved === 0 && notMoved === 0) {
      setNotice("You have no missed tasks. You are all caught up!");
    } else {
      setNotice(
        `Moved ${moved} missed task${moved === 1 ? "" : "s"} forward to upcoming days.` +
          (notMoved > 0
            ? ` ${notMoved} could not move because upcoming days are at capacity. You can move them manually.`
            : "")
      );
    }
  }

  async function refreshPlan() {
    setError("");
    setNotice("");
    setBusy("refresh");
    const res = await api(token, "POST", "/api/planner/me/refresh", { today });
    setBusy("");
    if (!res.ok) {
      setError(res.error || "Could not update your plan.");
      return;
    }
    if (res.data.plan) setPlan(res.data.plan);
    setNotice(
      "Your plan was updated with your latest weak topics from today onward. Completed tasks and custom tasks were kept safe."
    );
  }

  function handleBuilt(newPlan) {
    setPlan(newPlan);
    setMode("plan");
    setConfirmNew(false);
    setError("");
    setNotice("Your plan is ready! Start with today's tasks below.");
  }

  function saveReminderTime(value) {
    setReminderTime(value);
    try {
      if (value) localStorage.setItem(REMINDER_KEY, value);
      else localStorage.removeItem(REMINDER_KEY);
    } catch {
      /* ignore */
    }
  }

  function dismissGuide() {
    setGuideDismissed(true);
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="sp-page">
      <Link to="/" className="sp-back">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      {/* Header Banner */}
      <div className="sp-hero">
        <div className="sp-hero-text">
          <span className="sp-tag">
            <CalendarDays size={14} /> Study Planner
          </span>
          <h2>Plan your study, day by day</h2>
          <p>
            We turn your weak spots into a realistic daily routine. Edit tasks, reschedule when busy, and check them off at your own pace.
          </p>
        </div>
        <div className="sp-hero-bot">
          <div className={`sp-bubble ${bubbleClass}`} key={bubbleText}>
            {bubbleText}
          </div>
          <div className="sp-robot">
            <Robot size={110} />
          </div>
        </div>
      </div>

      {/* Closable 3-Step Beginner Guide Strip */}
      {!guideDismissed && (
        <div
          style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)",
            border: "1px solid #bae6fd",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "20px",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, fontSize: "0.95rem", color: "#0369a1" }}>
              <HelpCircle size={16} /> How your study plan works
            </span>
            <button
              type="button"
              onClick={dismissGuide}
              aria-label="Dismiss guide"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "grid", placeItems: "center" }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", fontSize: "0.85rem", color: "#334155" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ fontWeight: 800, color: "#0284c7" }}>1.</span>
              <span><strong>Quiz Weak Spots:</strong> Topics you struggle with are placed early so you master them first.</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ fontWeight: 800, color: "#0284c7" }}>2.</span>
              <span><strong>Bite-sized Steps:</strong> Each day has short tasks (study concepts, quick practice, or reviews).</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ fontWeight: 800, color: "#0284c7" }}>3.</span>
              <span><strong>Flexible Routine:</strong> Missed a day? Hit <em>Catch up</em> to shift missed tasks forward automatically.</span>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="sp-loading">
          <Loader2 size={28} className="sp-spin" />
          Loading your plan...
        </div>
      )}

      {!loading && error && <div className="sp-error">{error}</div>}
      {!loading && notice && <div className="sp-notice">{notice}</div>}

      {/* Setup Mode: No plan yet or student creating a new one */}
      {!loading && mode === "setup" && (
        <>
          <PlannerSetup onBuilt={handleBuilt} replacing={!!plan} />
          {plan && (
            <div className="sp-actions" style={{ marginTop: 16 }}>
              <button type="button" className="sp-btn ghost" onClick={() => setMode("plan")}>
                Return to my current plan
              </button>
            </div>
          )}
        </>
      )}

      {/* Plan Mode: Plan active */}
      {!loading && mode === "plan" && plan && (
        <>
          {/* Quick Action Bar with Friendly Labels */}
          <div className="sp-actions">
            <button
              type="button"
              className="sp-btn ghost"
              onClick={shiftMissed}
              disabled={!!busy || missedCount === 0}
              title={missedCount === 0 ? "No missed tasks" : "Move missed tasks to the next free day"}
            >
              {busy === "shift" ? (
                <Loader2 size={16} className="sp-spin" />
              ) : (
                <FastForward size={16} />
              )}{" "}
              Catch up on missed tasks{missedCount > 0 ? ` (${missedCount})` : ""}
            </button>

            <button type="button" className="sp-btn ghost" onClick={refreshPlan} disabled={!!busy}>
              {busy === "refresh" ? (
                <Loader2 size={16} className="sp-spin" />
              ) : (
                <RefreshCw size={16} />
              )}{" "}
              Add my new weak topics
            </button>

            <button
              type="button"
              className="sp-btn danger"
              onClick={() => setConfirmNew(true)}
              disabled={!!busy}
            >
              <FilePlus2 size={16} /> Start a fresh plan
            </button>
          </div>

          <p className="sp-help">
            💡 <strong>Helpful tip:</strong> "Add my new weak topics" scans your latest quiz scores and inserts new topics into future days without touching past days or completed tasks.
          </p>

          {confirmNew && (
            <div className="sp-warn">
              <p style={{ margin: "0 0 10px", fontWeight: 600 }}>
                Starting a fresh plan will replace your current schedule and reset your progress bar. Are you sure you want to proceed?
              </p>
              <div className="sp-actions">
                <button
                  type="button"
                  className="sp-btn danger small"
                  onClick={() => {
                    setConfirmNew(false);
                    setNotice("");
                    setError("");
                    setMode("setup");
                  }}
                >
                  Yes, start fresh plan
                </button>
                <button type="button" className="sp-btn ghost small" onClick={() => setConfirmNew(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Daily Reminder Time Picker */}
          <div className="sp-step" style={{ marginTop: 20 }}>
            <div className="sp-step-head">
              <div>
                <h3 className="sp-step-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <BellRing size={16} /> Daily study reminder time
                </h3>
                <p className="sp-help">
                  Pick what time of day you prefer to study. (Reminders appear when LearnIQ is open in your browser tab).
                </p>
              </div>
            </div>
            <label className="sp-field" style={{ maxWidth: 220, marginTop: 8 }}>
              Reminder time
              <input
                type="time"
                className="sp-input"
                value={reminderTime}
                onChange={(e) => saveReminderTime(e.target.value)}
              />
            </label>
          </div>

          {/* Day-by-Day Plan View */}
          <PlannerPlan plan={plan} onPlanChange={setPlan} />
        </>
      )}
    </div>
  );
}