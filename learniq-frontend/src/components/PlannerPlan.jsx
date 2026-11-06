import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  Pencil,
  Plus,
  Loader2,
  ListPlus,
  Play,
  BookOpen,
  Bell,
  X,
  Save,
  ArrowRightLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  todayStr,
  formatDate,
  formatMinutes,
  isoToLocalInput,
  localInputToIso,
  practiceState,
  api,
} from "../plannerUtils";
import "../planner.css";

const TYPE_LABEL = {
  learn: "Learn",
  practice: "Practice",
  retest: "Re-test",
  revision: "Revise",
  custom: "My task",
};
const PRIORITIES = ["high", "medium", "low"];
const MAX_TASKS_PER_DAY = 30;
const MAX_TASK_MINUTES = 240;

function newId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function dayTotal(day) {
  return (day.tasks || []).reduce((sum, t) => sum + (Number(t.minutes) || 0), 0);
}

function cleanMinutes(value, fallback = 15) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(5, Math.min(n, MAX_TASK_MINUTES));
}

function formatReminder(iso) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function dayName(d) {
  return `${d.label} - ${formatDate(d.date)}`;
}

export default function PlannerPlan({ plan, onPlanChange }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const today = todayStr();

  const days = Array.isArray(plan.days) ? plan.days : [];

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [moveId, setMoveId] = useState(null);
  const [addedToTodo, setAddedToTodo] = useState([]);

  const firstUpcoming = days.find((d) => d.date >= today) || days[days.length - 1];
  const [newTitle, setNewTitle] = useState("");
  const [newMinutes, setNewMinutes] = useState("20");
  const [newDate, setNewDate] = useState(firstUpcoming ? firstUpcoming.date : "");
  const [newPriority, setNewPriority] = useState("medium");

  useEffect(() => {
    let cancelled = false;
    async function loadTodos() {
      const res = await api(token, "GET", "/api/tasks");
      if (cancelled || !res.ok || !res.data || !Array.isArray(res.data.tasks)) return;
      const ids = res.data.tasks.map((t) => t.planTaskId).filter(Boolean);
      setAddedToTodo(ids);
    }
    loadTodos();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const allTasks = days.flatMap((d) => d.tasks || []);
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => t.done).length;
  const totalMin = allTasks.reduce((s, t) => s + (Number(t.minutes) || 0), 0);
  const doneMin = allTasks
    .filter((t) => t.done)
    .reduce((s, t) => s + (Number(t.minutes) || 0), 0);
  const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  async function saveDays(nextDays) {
    setError("");
    setSaving(true);
    const res = await api(token, "PUT", "/api/planner/me", { days: nextDays });
    setSaving(false);
    if (!res.ok || !res.data || !res.data.plan) {
      setError(res.error || "Could not save your change. Please try again.");
      return false;
    }
    onPlanChange(res.data.plan);
    return true;
  }

  function mapTask(taskId, fn) {
    return days.map((d) => ({
      ...d,
      tasks: (d.tasks || []).map((t) => (t.id === taskId ? fn(t) : t)),
    }));
  }

  function toggleDone(taskId) {
    saveDays(
      mapTask(taskId, (t) => ({
        ...t,
        done: !t.done,
        doneAt: !t.done ? new Date().toISOString() : null,
      }))
    );
  }

  function deleteTask(taskId) {
    const ok = window.confirm("Delete this task from your plan?");
    if (!ok) return;
    saveDays(days.map((d) => ({ ...d, tasks: (d.tasks || []).filter((t) => t.id !== taskId) })));
  }

  function startEdit(t) {
    setMoveId(null);
    setEditingId(t.id);
    setDraft({
      title: t.title || "",
      minutes: String(t.minutes || 15),
      priority: t.priority || "medium",
      remind: t.remindAt ? isoToLocalInput(t.remindAt) : "",
    });
  }

  async function saveEdit(taskId) {
    const title = draft.title.trim();
    if (!title) {
      setError("A task needs a title.");
      return;
    }
    const ok = await saveDays(
      mapTask(taskId, (t) => ({
        ...t,
        title: title.slice(0, 120),
        minutes: cleanMinutes(draft.minutes, t.minutes || 15),
        priority: draft.priority,
        remindAt: draft.remind ? localInputToIso(draft.remind) : null,
      }))
    );
    if (ok) {
      setEditingId(null);
      setDraft(null);
    }
  }

  async function moveTask(taskId, targetDate) {
    if (!targetDate) return;
    const source = days.find((d) => (d.tasks || []).some((t) => t.id === taskId));
    if (!source || source.date === targetDate) {
      setMoveId(null);
      return;
    }
    const target = days.find((d) => d.date === targetDate);
    if (!target) return;
    if ((target.tasks || []).length >= MAX_TASKS_PER_DAY) {
      setError("That day is full. Pick another day.");
      return;
    }
    const task = source.tasks.find((t) => t.id === taskId);
    const next = days.map((d) => {
      if (d.date === source.date) return { ...d, tasks: d.tasks.filter((t) => t.id !== taskId) };
      if (d.date === target.date) return { ...d, tasks: [...(d.tasks || []), task] };
      return d;
    });
    const ok = await saveDays(next);
    if (ok) setMoveId(null);
  }

  async function addOwnTask(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      setError("Type a title for your task.");
      return;
    }
    const target = days.find((d) => d.date === newDate);
    if (!target) {
      setError("Pick a day for your task.");
      return;
    }
    if ((target.tasks || []).length >= MAX_TASKS_PER_DAY) {
      setError("That day is full. Pick another day.");
      return;
    }
    const task = {
      id: newId(),
      type: "custom",
      title: title.slice(0, 120),
      minutes: cleanMinutes(newMinutes, 20),
      topic: "",
      subtopic: "",
      reason: "",
      priority: newPriority,
      done: false,
      doneAt: null,
      remindAt: null,
      source: "manual",
    };
    const ok = await saveDays(
      days.map((d) => (d.date === target.date ? { ...d, tasks: [...(d.tasks || []), task] } : d))
    );
    if (ok) setNewTitle("");
  }

  function openPractice(t) {
    navigate("/quiz", { state: practiceState(t.topic, t.subtopic) });
  }

  function openNotes(t) {
    navigate("/notes", {
      state: {
        autoTopic: t.subtopic || t.title || t.topic,
        subject: t.topic || "",
        subtopic: t.subtopic || t.title || "",
      },
    });
  }

  async function addToTodo(t, day) {
    setError("");
    if (addedToTodo.includes(t.id)) return;
    let link = { type: "", topic: "", subtopic: "" };
    if (t.type === "learn") link = { type: "notes", topic: t.topic || "", subtopic: t.subtopic || "" };
    else if (t.topic) link = { type: "practice", topic: t.topic, subtopic: t.subtopic || "" };

    const res = await api(token, "POST", "/api/tasks", {
      title: t.title,
      notes: t.reason || "",
      priority: t.priority || "medium",
      dueDate: day.date,
      remindAt: null,
      source: "planner",
      planTaskId: t.id,
      link,
    });
    if (!res.ok) {
      setError(res.error || "Could not add this to your to-do list.");
      return;
    }
    setAddedToTodo((prev) => [...prev, t.id]);
    window.dispatchEvent(new Event("learniq:tasks-changed"));
  }

  function renderActions(t, day) {
    const hasTopic = !!(t.topic || t.subtopic);
    const inTodo = addedToTodo.includes(t.id);
    return (
      <div className="sp-task-actions">
        {t.type === "learn" && (
          <button type="button" className="sp-mini go" onClick={() => openNotes(t)} title="Open Study Notes">
            <BookOpen size={13} /> Study
          </button>
        )}
        {(t.type === "practice" || t.type === "retest" || t.type === "revision") && hasTopic && (
          <button type="button" className="sp-mini go" onClick={() => openPractice(t)}>
            <Play size={13} /> {TYPE_LABEL[t.type]}
          </button>
        )}
        <button type="button" className="sp-mini" onClick={() => startEdit(t)} disabled={saving}>
          <Pencil size={13} /> Edit
        </button>
        <button
          type="button"
          className="sp-mini"
          onClick={() => setMoveId(moveId === t.id ? null : t.id)}
          disabled={saving}
        >
          <ArrowRightLeft size={13} /> Move
        </button>
        <button
          type="button"
          className="sp-mini"
          onClick={() => addToTodo(t, day)}
          disabled={saving || inTodo}
        >
          <ListPlus size={13} /> {inTodo ? "In my to-do" : "Add to my to-do"}
        </button>
        <button type="button" className="sp-mini" onClick={() => deleteTask(t.id)} disabled={saving}>
          <Trash2 size={13} /> Delete
        </button>
      </div>
    );
  }

  function renderEdit(t) {
    return (
      <div className="sp-edit">
        <label className="sp-field wide">
          Title
          <input
            className="sp-input"
            value={draft.title}
            maxLength={120}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label className="sp-field">
          Minutes (5 to {MAX_TASK_MINUTES})
          <input
            type="number"
            className="sp-input"
            min={5}
            max={MAX_TASK_MINUTES}
            value={draft.minutes}
            onChange={(e) => setDraft({ ...draft, minutes: e.target.value })}
          />
        </label>
        <label className="sp-field">
          Priority
          <select
            className="sp-input"
            value={draft.priority}
            onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="sp-field wide">
          Remind me at (optional)
          <input
            type="datetime-local"
            className="sp-input"
            value={draft.remind}
            onChange={(e) => setDraft({ ...draft, remind: e.target.value })}
          />
        </label>
        <div className="sp-actions wide">
          <button type="button" className="sp-btn small" onClick={() => saveEdit(t.id)} disabled={saving}>
            <Save size={14} /> Save
          </button>
          <button
            type="button"
            className="sp-btn ghost small"
            onClick={() => {
              setEditingId(null);
              setDraft(null);
            }}
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  function renderTask(t, day) {
    return (
      <div className={`sp-task sp-c-${t.type || "custom"} ${t.done ? "done" : ""}`} key={t.id}>
        {editingId === t.id && draft ? (
          renderEdit(t)
        ) : (
          <>
            <div className="sp-task-main">
              <input
                type="checkbox"
                checked={!!t.done}
                disabled={saving}
                onChange={() => toggleDone(t.id)}
                aria-label={`Mark "${t.title}" as done`}
              />
              <div className="sp-task-body">
                <div className="sp-task-title">{t.title}</div>
                <div className="sp-task-meta">
                  <span>{TYPE_LABEL[t.type] || "Task"}</span>
                  <span>{formatMinutes(t.minutes)}</span>
                  <span className={`sp-prio ${t.priority || "medium"}`}>{t.priority || "medium"}</span>
                  {t.remindAt && (
                    <span>
                      <Bell size={12} /> {formatReminder(t.remindAt)}
                    </span>
                  )}
                </div>
                {t.reason && <div className="sp-reason">{t.reason}</div>}
              </div>
            </div>

            {moveId === t.id && (
              <label className="sp-field">
                Move to which day?
                <select
                  className="sp-input"
                  value=""
                  onChange={(e) => moveTask(t.id, e.target.value)}
                  disabled={saving}
                >
                  <option value="">Choose a day...</option>
                  {days
                    .filter((d) => d.date !== day.date)
                    .map((d) => (
                      <option key={d.date} value={d.date}>
                        {dayName(d)}
                      </option>
                    ))}
                </select>
              </label>
            )}

            {renderActions(t, day)}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="sp-form">
      {plan.needsData && plan.message && <div className="sp-notice">{plan.message}</div>}
      {plan.capped && (
        <div className="sp-warn">
          Your goal date is far away, so the plan covers only the first 31 days.
        </div>
      )}

      {/* progress */}
      <div className="sp-summary">
        <div className="sp-stat">
          <strong>
            {doneTasks}/{totalTasks}
          </strong>
          <span>tasks done</span>
        </div>
        <div className="sp-stat">
          <strong>
            {formatMinutes(doneMin)} / {formatMinutes(totalMin)}
          </strong>
          <span>study time</span>
        </div>
        <div className="sp-stat">
          <strong>{percent}%</strong>
          <span>of your plan</span>
        </div>
      </div>
      <div className="sp-bar" aria-label="Plan progress">
        <span style={{ width: `${percent}%` }} />
      </div>

      {Array.isArray(plan.howItWorks) && plan.howItWorks.length > 0 && (
        <details className="sp-how">
          <summary>How was this plan made?</summary>
          <ul>
            {plan.howItWorks.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      )}

      {error && <div className="sp-error">{error}</div>}
      {saving && (
        <p className="sp-help">
          <Loader2 size={14} className="sp-spin" /> Saving...
        </p>
      )}

      {/* add my own task */}
      <form className="sp-step" onSubmit={addOwnTask}>
        <div className="sp-step-head">
          <h3 className="sp-step-title">Add your own task</h3>
        </div>
        <div className="sp-add-row">
          <input
            className="sp-input"
            placeholder="e.g. Finish lab record"
            value={newTitle}
            maxLength={120}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input
            type="number"
            className="sp-input"
            min={5}
            max={MAX_TASK_MINUTES}
            value={newMinutes}
            onChange={(e) => setNewMinutes(e.target.value)}
            aria-label="Minutes"
          />
          <select
            className="sp-input"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            aria-label="Day"
          >
            {days.map((d) => (
              <option key={d.date} value={d.date}>
                {dayName(d)}
              </option>
            ))}
          </select>
          <select
            className="sp-input"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            aria-label="Priority"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button type="submit" className="sp-btn small" disabled={saving}>
            <Plus size={14} /> Add
          </button>
        </div>
      </form>

      {/* the days */}
      <div className="sp-days">
        {days.map((day) => {
          const isToday = day.date === today;
          const isPast = day.date < today;
          const used = dayTotal(day);
          const over = day.capacity > 0 && used > day.capacity;
          const tasks = day.tasks || [];
          return (
            <div
              className={`sp-day ${isToday ? "today" : ""} ${isPast ? "past" : ""} ${
                day.rest ? "restday" : ""
              }`}
              key={day.date}
            >
              <div className="sp-day-head">
                <h4>{dayName(day)}</h4>
                <span>
                  {isToday && <span className="sp-badge">Today</span>}{" "}
                  {day.rest && tasks.length === 0 ? (
                    <span className="sp-badge">Rest day</span>
                  ) : (
                    <span className={`sp-badge ${over ? "warn" : ""}`}>
                      {formatMinutes(used)} / {formatMinutes(day.capacity)}
                    </span>
                  )}
                </span>
              </div>

              {tasks.length === 0 && (
                <p className="sp-rest-text">
                  {day.rest ? "Rest day. Enjoy it!" : "Nothing planned for this day."}
                </p>
              )}

              {tasks.map((t) => renderTask(t, day))}
            </div>
          );
        })}
      </div>

      {Array.isArray(plan.leftOut) && plan.leftOut.length > 0 && (
        <div className="sp-warn">
          <strong>Not enough time for these:</strong>
          <ul>
            {plan.leftOut.map((item, i) => (
              <li key={i}>
                {typeof item === "string"
                  ? item
                  : `${item.subtopic || item.topic || "Topic"}${item.reason ? ` - ${item.reason}` : ""}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}