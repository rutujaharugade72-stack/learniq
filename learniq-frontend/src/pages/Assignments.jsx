import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Calendar,
  Clock,
  Tag,
  Trash2,
  Pencil,
  BookOpen,
  Play,
  Repeat,
  CheckCircle2,
  ListTodo,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useReportActivity } from "../context/AssistantContext";
import "../tasks.css";

const PRIORITIES = ["low", "medium", "high"];

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Assignments() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const today = todayStr();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all | today | upcoming | done

  // Quick add form state
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(today);
  const [priority, setPriority] = useState("medium");
  const [tag, setTag] = useState("");
  const [repeat, setRepeat] = useState("none");
  const [adding, setAdding] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  // Subtask input state per task id
  const [newSubtask, setNewSubtask] = useState({});

  const authHeaders = useCallback(
    (isJson = false) => ({
      Authorization: `Bearer ${token}`,
      ...(isJson ? { "Content-Type": "application/json" } : {}),
    }),
    [token]
  );

  const loadTasks = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/tasks", { headers: authHeaders(false) });
      const data = await res.json();
      if (res.ok && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      } else {
        setError(data.error || "Could not load assignments.");
      }
    } catch (err) {
      setError(err.message || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  useEffect(() => {
    loadTasks();
    const onTasksChanged = () => loadTasks();
    window.addEventListener("learniq:tasks-changed", onTasksChanged);
    return () => window.removeEventListener("learniq:tasks-changed", onTasksChanged);
  }, [loadTasks]);

  // Report activity context to AI Teacher
  const doneCount = tasks.filter((t) => t.done).length;
  useReportActivity({
    page: "Assignments & Tasks",
    summary: `Student has ${tasks.length} total tasks (${doneCount} completed).`,
    details: `Filter: ${filter}`,
  });

  // Synchronize task completion status with Study Planner if linked
  async function syncPlannerTaskStatus(planTaskId, nextDoneState) {
    if (!planTaskId || !token) return;
    try {
      const res = await fetch("/api/planner/me", { headers: authHeaders(false) });
      const data = await res.json();
      if (!res.ok || !data.plan || !Array.isArray(data.plan.days)) return;

      let found = false;
      const updatedDays = data.plan.days.map((day) => ({
        ...day,
        tasks: (day.tasks || []).map((t) => {
          if (t.id === planTaskId) {
            found = true;
            return {
              ...t,
              done: nextDoneState,
              doneAt: nextDoneState ? new Date().toISOString() : null,
            };
          }
          return t;
        }),
      }));

      if (found) {
        await fetch("/api/planner/me", {
          method: "PUT",
          headers: authHeaders(true),
          body: JSON.stringify({ days: updatedDays }),
        });
      }
    } catch {
      /* ignore background planner sync errors */
    }
  }

  // Toggle task complete
  async function toggleDone(t) {
    const nextDone = !t.done;
    try {
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ done: nextDone }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((item) => (item.id === t.id ? { ...item, done: nextDone } : item))
        );
        window.dispatchEvent(new Event("learniq:tasks-changed"));

        // Keep Study Planner in sync
        if (t.planTaskId) {
          syncPlannerTaskStatus(t.planTaskId, nextDone);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Delete task
  async function deleteTask(id) {
    if (!window.confirm("Delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: authHeaders(false),
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((item) => item.id !== id));
        window.dispatchEvent(new Event("learniq:tasks-changed"));
      }
    } catch {
      /* ignore */
    }
  }

  // Quick add task
  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    setError("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          title: title.trim(),
          dueDate,
          priority,
          tag: tag.trim(),
          repeat,
        }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks((prev) => [data.task, ...prev]);
        setTitle("");
        setTag("");
        window.dispatchEvent(new Event("learniq:tasks-changed"));
      } else {
        setError(data.error || "Could not add task.");
      }
    } catch (err) {
      setError(err.message || "Failed to add task.");
    } finally {
      setAdding(false);
    }
  }

  // Inline edit
  function startEdit(t) {
    setEditingId(t.id);
    setEditDraft({
      title: t.title,
      dueDate: t.dueDate || "",
      priority: t.priority || "medium",
      tag: t.tag || "",
    });
  }

  async function saveEdit(id) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify(editDraft),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks((prev) => prev.map((item) => (item.id === id ? data.task : item)));
        setEditingId(null);
      }
    } catch {
      /* ignore */
    }
  }

  // Subtask handlers
  async function addSubtask(taskId) {
    const text = (newSubtask[taskId] || "").trim();
    if (!text) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const nextSubtasks = [...(task.subtasks || []), { title: text, done: false }];
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ subtasks: nextSubtasks }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks((prev) => prev.map((item) => (item.id === taskId ? data.task : item)));
        setNewSubtask((prev) => ({ ...prev, [taskId]: "" }));
      }
    } catch {
      /* ignore */
    }
  }

  async function toggleSubtask(taskId, subId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const nextSubtasks = (task.subtasks || []).map((s) =>
      s.id === subId ? { ...s, done: !s.done } : s
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ subtasks: nextSubtasks }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks((prev) => prev.map((item) => (item.id === taskId ? data.task : item)));
      }
    } catch {
      /* ignore */
    }
  }

  // Filter tasks
  const filtered = tasks.filter((t) => {
    if (filter === "done") return t.done;
    if (filter === "today") return !t.done && t.dueDate === today;
    if (filter === "upcoming") return !t.done && t.dueDate > today;
    return true; // all
  });

  return (
    <div className="td-page">
      <Link to="/" className="td-back">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      {/* Yellow Sticker Hero Banner */}
      <div className="td-hero">
        <div className="td-hero-text">
          <span className="td-badge-sticker">
            <ListTodo size={14} /> Sticker Checklist
          </span>
          <h2>My Tasks & Assignments</h2>
          <p>Organize homework, revisions, and planner goals with clear deadlines.</p>
        </div>
        <div className="td-badge-sticker" style={{ background: "#facc15" }}>
          {doneCount} / {tasks.length} Completed
        </div>
      </div>

      {error && (
        <div className="td-card" style={{ background: "#fee2e2", borderColor: "#ef4444" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#b91c1c", fontWeight: 700 }}>
            <AlertCircle size={18} /> {error}
          </div>
        </div>
      )}

      {/* Quick Add Card */}
      <div className="td-card">
        <h3 className="td-card-title">
          <Plus size={18} /> Add New Task or Assignment
        </h3>
        <form className="td-add-grid" onSubmit={handleAdd}>
          <div className="td-input-row">
            <input
              className="td-input"
              placeholder="What do you need to do? (e.g. Finish Chapter 4 Assignment)"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="td-input-row">
            <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>Due Date</span>
              <input
                type="date"
                className="td-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>Priority</span>
              <select
                className="td-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>Subject Tag (Optional)</span>
              <input
                className="td-input"
                placeholder="e.g. Python, Math"
                value={tag}
                maxLength={40}
                onChange={(e) => setTag(e.target.value)}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>Repeat</span>
              <select
                className="td-input"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              >
                <option value="none">No repeat</option>
                <option value="daily">Daily repeat</option>
              </select>
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="td-btn" disabled={adding}>
              {adding ? (
                <>
                  <Loader2 size={16} className="sp-spin" /> Adding...
                </>
              ) : (
                <>
                  <Plus size={16} /> Add to Checklist
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="td-filters">
        {["all", "today", "upcoming", "done"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`td-filter-btn ${filter === tab ? "active" : ""}`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} (
            {tab === "all"
              ? tasks.length
              : tab === "today"
              ? tasks.filter((t) => !t.done && t.dueDate === today).length
              : tab === "upcoming"
              ? tasks.filter((t) => !t.done && t.dueDate > today).length
              : doneCount}
            )
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="td-empty">
          <Loader2 size={24} className="sp-spin" style={{ margin: "0 auto 8px" }} />
          Loading your checklist...
        </div>
      ) : filtered.length === 0 ? (
        <div className="td-empty">
          <CheckCircle2 size={32} style={{ margin: "0 auto 8px", color: "#10b981" }} />
          No tasks found under "{filter}".
        </div>
      ) : (
        <div className="td-task-list">
          {filtered.map((t) => {
            const isEditing = editingId === t.id;

            return (
              <div key={t.id} className={`td-task-item ${t.done ? "done" : ""}`}>
                <div className="td-task-top">
                  <input
                    type="checkbox"
                    className="td-checkbox"
                    checked={!!t.done}
                    onChange={() => toggleDone(t)}
                    aria-label={`Mark ${t.title} as completed`}
                  />

                  <div className="td-task-content">
                    {isEditing ? (
                      <div className="td-add-grid">
                        <input
                          className="td-input"
                          value={editDraft.title}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, title: e.target.value })
                          }
                        />
                        <div className="td-input-row">
                          <input
                            type="date"
                            className="td-input"
                            value={editDraft.dueDate}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, dueDate: e.target.value })
                            }
                          />
                          <select
                            className="td-input"
                            value={editDraft.priority}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, priority: e.target.value })
                            }
                          >
                            {PRIORITIES.map((p) => (
                              <option key={p} value={p}>
                                {p.toUpperCase()}
                              </option>
                            ))}
                          </select>
                          <input
                            className="td-input"
                            value={editDraft.tag}
                            placeholder="Tag"
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, tag: e.target.value })
                            }
                          />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="td-btn small"
                            onClick={() => saveEdit(t.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="td-btn ghost small"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="td-title-text">{t.title}</div>
                        <div className="td-meta-row">
                          {t.dueDate && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <Calendar size={13} /> {t.dueDate}
                            </span>
                          )}
                          <span className={`td-prio-pill ${t.priority || "medium"}`}>
                            {t.priority || "medium"}
                          </span>
                          {t.tag && (
                            <span className="td-tag-pill">
                              <Tag size={11} style={{ marginRight: 2 }} /> {t.tag}
                            </span>
                          )}
                          {t.repeat === "daily" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <Repeat size={12} /> Daily
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    {/* Subtasks checklist */}
                    {Array.isArray(t.subtasks) && t.subtasks.length > 0 && (
                      <div className="td-subtasks">
                        {t.subtasks.map((st) => (
                          <label
                            key={st.id}
                            className={`td-subtask-item ${st.done ? "done" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={!!st.done}
                              onChange={() => toggleSubtask(t.id, st.id)}
                            />
                            <span>{st.title}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Add subtask input */}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <input
                        className="td-input"
                        style={{ padding: "4px 8px", fontSize: "0.8rem", maxWidth: 260 }}
                        placeholder="Add subtask..."
                        value={newSubtask[t.id] || ""}
                        onChange={(e) =>
                          setNewSubtask({ ...newSubtask, [t.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSubtask(t.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="td-btn ghost small"
                        onClick={() => addSubtask(t.id)}
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Task card actions */}
                <div className="td-task-actions">
                  {t.link?.type === "practice" && (
                    <button
                      type="button"
                      className="td-btn small"
                      onClick={() =>
                        navigate("/quiz", {
                          state: {
                            practice: {
                              subject: t.link.topic || t.tag || "",
                              subtopic: t.link.subtopic || t.title || "",
                            },
                          },
                        })
                      }
                    >
                      <Play size={12} /> Practice Quiz
                    </button>
                  )}
                  {t.link?.type === "notes" && (
                    <button
                      type="button"
                      className="td-btn small"
                      onClick={() =>
                        navigate("/notes", {
                          state: {
                            autoTopic: t.link.subtopic || t.title || "",
                            subject: t.link.topic || t.tag || "",
                            subtopic: t.link.subtopic || t.title || "",
                          },
                        })
                      }
                    >
                      <BookOpen size={12} /> View Notes
                    </button>
                  )}
                  <button
                    type="button"
                    className="td-btn ghost small"
                    onClick={() => startEdit(t)}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    className="td-btn danger small"
                    onClick={() => deleteTask(t.id)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}