import { useEffect, useState } from "react";
import { Loader2, Plus, X, CalendarDays, Sparkles, Clock, BookOpen, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import * as activityModule from "../logActivity";
import { WEEKDAYS, todayStr, addDays, api } from "../plannerUtils";
import "../planner.css";

// logActivity might be a named or a default export, so accept both
const logActivity = activityModule.logActivity || activityModule.default;

const FALLBACK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MIN_PER_DAY = 15; // the server never accepts less than this
const MAX_PER_DAY = 240; // ...or more than this
const MAX_OWN_TOPICS = 10; // the server keeps only the first 10

function clampMinutes(value, fallback, min = MIN_PER_DAY) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(n, MAX_PER_DAY));
}

// Form that builds a study plan. onBuilt(plan) is called when the plan is ready.
// replacing: true when the student already has a plan (shows a warning).
export default function PlannerSetup({ onBuilt, replacing = false }) {
  const { token } = useAuth();
  const dayNames = Array.isArray(WEEKDAYS) && WEEKDAYS.length === 7 ? WEEKDAYS : FALLBACK_DAYS;

  const today = todayStr();
  const [targetDate, setTargetDate] = useState("");
  const [minutesPerDay, setMinutesPerDay] = useState("60");
  const [perWeekday, setPerWeekday] = useState(false);
  const [weekdayMinutes, setWeekdayMinutes] = useState(["60", "60", "60", "60", "60", "60", "60"]);

  const [weak, setWeak] = useState([]); // weak subtopics from Why Am I Stuck?
  const [picked, setPicked] = useState([]); // keys of the ticked ones
  const [weakLoading, setWeakLoading] = useState(true);

  const [manual, setManual] = useState([]); // topics the student types
  const [topicInput, setTopicInput] = useState("");
  const [subtopicInput, setSubtopicInput] = useState("");

  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");

  const keyOf = (w) => `${w.topic}||${w.subtopic}`;

  // Load the student's weak subtopics
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await api(token, "GET", "/api/why-stuck/me");
      if (cancelled) return;
      if (res.ok && res.data && Array.isArray(res.data.weak_subtopics)) {
        setWeak(res.data.weak_subtopics);
        setPicked(res.data.weak_subtopics.map(keyOf)); // all ticked by default
      }
      setWeakLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function togglePicked(key) {
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function toggleAllWeak() {
    setPicked((prev) => (prev.length === weak.length ? [] : weak.map(keyOf)));
  }

  function setDayMinutes(index, value) {
    setWeekdayMinutes((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function addManual() {
    setError("");
    const topic = topicInput.trim();
    if (!topic) return;
    if (manual.length >= MAX_OWN_TOPICS) {
      setError(`You can add up to ${MAX_OWN_TOPICS} topics of your own.`);
      return;
    }
    const subtopic = subtopicInput.trim() || topic;
    const exists = manual.some((m) => m.topic === topic && m.subtopic === subtopic);
    if (!exists) {
      setManual((prev) => [...prev, { topic, subtopic }]);
    }
    setTopicInput("");
    setSubtopicInput("");
  }

  function removeManual(index) {
    setManual((prev) => prev.filter((_, i) => i !== index));
  }

  // Quick preset helpers
  function pickQuickDays(daysCount) {
    const d = addDays(today, daysCount);
    setTargetDate(d);
  }

  async function handleBuild(e) {
    e.preventDefault();
    setError("");

    const selectedWeak = weak
      .filter((w) => picked.includes(keyOf(w)))
      .map((w) => ({ topic: w.topic, subtopic: w.subtopic }));

    if (!targetDate) {
      setError("Please pick your exam date or goal date.");
      return;
    }
    if (targetDate <= today) {
      setError("The date must be after today.");
      return;
    }
    if (targetDate > addDays(today, 30)) {
      setError("A plan can cover at most 31 days. Pick a date within the next 30 days.");
      return;
    }
    if (selectedWeak.length === 0 && manual.length === 0) {
      setError("Please choose at least one topic (from your weak areas or type your own).");
      return;
    }

    const perDay = clampMinutes(minutesPerDay, 60);
    const byWeekday = {};
    for (let i = 0; i < 7; i++) {
      let m = perWeekday ? clampMinutes(weekdayMinutes[i], perDay, 0) : perDay;
      if (m > 0 && m < MIN_PER_DAY) m = MIN_PER_DAY;
      byWeekday[String(i)] = m;
    }
    if (Object.values(byWeekday).every((m) => m === 0)) {
      setError("Every day is marked as a rest day. Please set study time for at least one day.");
      return;
    }

    setBuilding(true);
    const res = await api(token, "POST", "/api/planner/build", {
      startDate: today,
      targetDate,
      minutesPerDay: perDay,
      minutesByWeekday: byWeekday,
      useWeak: selectedWeak.length > 0,
      selectedWeak,
      manualTopics: manual,
    });
    setBuilding(false);

    if (!res.ok || !res.data || !res.data.plan) {
      setError(res.error || "Could not build your plan. Please try again.");
      return;
    }

    try {
      if (typeof logActivity === "function") {
        logActivity(token, {
          type: "plan_created",
          title: "Made a study plan",
          description: `Plan until ${targetDate}`,
          link: "/planner",
        });
      }
    } catch {
      /* ignore */
    }

    if (onBuilt) onBuilt(res.data.plan);
  }

  return (
    <form className="sp-form" onSubmit={handleBuild}>
      {replacing && (
        <div className="sp-warn">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>Note: You already have a study plan. Creating this new plan will replace it.</span>
        </div>
      )}

      {/* Step 1: Target Date */}
      <div className="sp-step">
        <div className="sp-step-head">
          <span className="sp-step-num">1</span>
          <div>
            <h3 className="sp-step-title">When is your exam or goal date?</h3>
            <p className="sp-help">Choose when you want to finish preparing. Your plan runs from today until then.</p>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "10px 0 14px" }}>
          <button
            type="button"
            className={`sp-btn ghost small ${targetDate === addDays(today, 7) ? "active" : ""}`}
            onClick={() => pickQuickDays(7)}
          >
            In 1 Week
          </button>
          <button
            type="button"
            className={`sp-btn ghost small ${targetDate === addDays(today, 14) ? "active" : ""}`}
            onClick={() => pickQuickDays(14)}
          >
            In 2 Weeks
          </button>
          <button
            type="button"
            className={`sp-btn ghost small ${targetDate === addDays(today, 30) ? "active" : ""}`}
            onClick={() => pickQuickDays(30)}
          >
            In 1 Month (Max)
          </button>
        </div>

        <label className="sp-field">
          Pick custom target date
          <input
            type="date"
            className="sp-input"
            value={targetDate}
            min={addDays(today, 1)}
            max={addDays(today, 30)}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </label>
      </div>

      {/* Step 2: Study Time */}
      <div className="sp-step">
        <div className="sp-step-head">
          <span className="sp-step-num">2</span>
          <div>
            <h3 className="sp-step-title">How much time can you study each day?</h3>
            <p className="sp-help">Be realistic. A light plan you finish consistently is much better than a heavy plan you skip.</p>
          </div>
        </div>

        {/* Quick Minutes Presets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "10px 0 14px" }}>
          {[30, 60, 90, 120].map((mins) => (
            <button
              key={mins}
              type="button"
              className={`sp-btn ghost small ${minutesPerDay === String(mins) && !perWeekday ? "active" : ""}`}
              onClick={() => {
                setMinutesPerDay(String(mins));
                setWeekdayMinutes(Array(7).fill(String(mins)));
              }}
            >
              <Clock size={13} /> {mins} minutes/day
            </button>
          ))}
        </div>

        <div className="sp-row">
          <label className="sp-field">
            Daily study time (in minutes, {MIN_PER_DAY} to {MAX_PER_DAY})
            <input
              type="number"
              className="sp-input"
              min={MIN_PER_DAY}
              max={MAX_PER_DAY}
              value={minutesPerDay}
              onChange={(e) => setMinutesPerDay(e.target.value)}
            />
          </label>
        </div>

        <label className="sp-help" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={perWeekday}
            onChange={(e) => setPerWeekday(e.target.checked)}
          />
          <strong>Customize study time for each day of the week</strong> (set 0 for a rest day)
        </label>

        {perWeekday && (
          <div className="sp-week" style={{ marginTop: 12 }}>
            {dayNames.map((name, i) => {
              const isRest = parseInt(weekdayMinutes[i], 10) === 0;
              return (
                <label className={`sp-day-box ${isRest ? "rest" : ""}`} key={name}>
                  {name}
                  <input
                    type="number"
                    min={0}
                    max={MAX_PER_DAY}
                    value={weekdayMinutes[i]}
                    onChange={(e) => setDayMinutes(i, e.target.value)}
                  />
                  <small>{isRest ? "rest day" : "minutes"}</small>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 3: Topics to Cover */}
      <div className="sp-step">
        <div className="sp-step-head">
          <span className="sp-step-num">3</span>
          <div>
            <h3 className="sp-step-title">What topics do you want to cover?</h3>
            <p className="sp-help">We automatically include weak spots from your quizzes. You can also add any chapter of your own.</p>
          </div>
        </div>

        {weakLoading && (
          <p className="sp-help">
            <Loader2 size={14} className="sp-spin" /> Checking your recent quizzes for weak spots...
          </p>
        )}

        {!weakLoading && weak.length === 0 && (
          <div className="sp-notice" style={{ margin: "10px 0" }}>
            No weak spots detected yet! You can add your own subjects and chapters below.
          </div>
        )}

        {weak.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)" }}>
                Detected weak areas from your quizzes:
              </span>
              <button type="button" className="sp-btn ghost small" onClick={toggleAllWeak}>
                {picked.length === weak.length ? "Untick all" : "Select all"}
              </button>
            </div>

            <div className="sp-topics">
              {weak.map((w) => {
                const on = picked.includes(keyOf(w));
                return (
                  <label className={`sp-topic ${on ? "on" : ""}`} key={keyOf(w)}>
                    <input type="checkbox" checked={on} onChange={() => togglePicked(keyOf(w))} />
                    <span className="sp-topic-text">
                      <strong>{w.subtopic}</strong>
                      <small>{w.topic}</small>
                    </span>
                    <span className="sp-pct">{Math.round(w.accuracy * 100)}%</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 }}>
            Add your own subject or chapter (optional, up to {MAX_OWN_TOPICS}):
          </span>
          <div className="sp-add-row">
            <input
              className="sp-input"
              placeholder="Subject (e.g. Operating Systems)"
              value={topicInput}
              maxLength={60}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManual();
                }
              }}
            />
            <input
              className="sp-input"
              placeholder="Chapter (optional, e.g. Memory Management)"
              value={subtopicInput}
              maxLength={60}
              onChange={(e) => setSubtopicInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManual();
                }
              }}
            />
            <button type="button" className="sp-btn small" onClick={addManual}>
              <Plus size={14} /> Add
            </button>
          </div>

          {manual.length > 0 && (
            <div className="sp-chips" style={{ marginTop: 10 }}>
              {manual.map((m, i) => (
                <span className="sp-chip" key={`${m.topic}-${m.subtopic}-${i}`}>
                  <BookOpen size={13} style={{ opacity: 0.7 }} />
                  {m.subtopic === m.topic ? m.topic : `${m.subtopic} (${m.topic})`}
                  <button type="button" aria-label="Remove topic" onClick={() => removeManual(i)}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div className="sp-error">{error}</div>}

      <div className="sp-actions" style={{ marginTop: 10 }}>
        <button type="submit" className="sp-btn" disabled={building}>
          {building ? (
            <>
              <Loader2 size={16} className="sp-spin" /> Building your daily plan...
            </>
          ) : (
            <>
              <Sparkles size={16} /> <CalendarDays size={16} /> Generate My Study Plan
            </>
          )}
        </button>
      </div>
    </form>
  );
}