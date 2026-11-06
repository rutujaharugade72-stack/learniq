import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  ListChecks,
  NotebookPen,
  Trophy,
  CalendarDays,
  FileText,
  Library,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Maps an activity type to an icon and a color tone
function getToneAndIcon(type) {
  switch (type) {
    case "quiz_generated":
    case "quiz_completed":
      return { Icon: ListChecks, tone: "green" };
    case "notes_created":
      return { Icon: NotebookPen, tone: "pink" };
    case "summary_created":
      return { Icon: FileText, tone: "teal" };
    case "plan_created":
      return { Icon: CalendarDays, tone: "blue" };
    case "material_uploaded":
      return { Icon: Library, tone: "amber" };
    case "ai_teacher":
      return { Icon: Bot, tone: "purple" };
    case "assignment_done":
      return { Icon: CheckCircle2, tone: "green" };
    default:
      return { Icon: Trophy, tone: "amber" };
  }
}

function timeAgo(dateString) {
  const seconds = Math.round((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function SidePanel() {
  const { token } = useAuth();
  const [goal, setGoal] = useState({ done: 0, total: 5 });
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState("5");
  const [goalError, setGoalError] = useState("");

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [settingsRes, actRes, taskRes] = await Promise.all([
        fetch("/api/settings", { headers }),
        fetch("/api/activities/me?limit=6", { headers }),
        fetch("/api/tasks", { headers }),
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setGoal({ done: s.doneToday || 0, total: s.dailyGoal || 5 });
      }

      if (actRes.ok) {
        setActivities(await actRes.json());
      }

      if (taskRes.ok) {
        const data = await taskRes.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to load side panel data:", err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
    const onTasksChanged = () => loadData();
    window.addEventListener("learniq:tasks-changed", onTasksChanged);
    return () => window.removeEventListener("learniq:tasks-changed", onTasksChanged);
  }, [loadData]);

  async function saveGoal() {
    const n = Number(goalInput);
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      setGoalError("Enter a whole number from 1 to 50");
      return;
    }
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dailyGoal: n }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save goal");
      setGoal((g) => ({ ...g, total: n }));
      setGoalError("");
      setEditing(false);
    } catch (err) {
      setGoalError(err.message);
    }
  }

  async function toggleTaskDone(taskId, currentDone) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ done: !currentDone }),
      });
      if (res.ok) {
        loadData();
        window.dispatchEvent(new Event("learniq:tasks-changed"));
      }
    } catch (err) {
      console.error("Could not complete task:", err.message);
    }
  }

  const pct = Math.min(100, Math.round((goal.done / Math.max(1, goal.total)) * 100));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  let headline = "Let's get started! 💪";
  if (pct >= 100) headline = "Goal Smashed! 🎉";
  else if (pct > 0) headline = "Great Progress! 🎉";

  // Filter open (undone) tasks and take the first 3
  const openTasks = tasks.filter((t) => !t.done).slice(0, 3);

  return (
    <>
      {/* Daily Goal */}
      <div className="card side-card">
        <div className="side-head">
          <h3>Daily Goal</h3>
          {!editing && (
            <button
              className="link-btn"
              onClick={() => {
                setGoalInput(String(goal.total));
                setGoalError("");
                setEditing(true);
              }}
            >
              Edit Goal
            </button>
          )}
        </div>

        {editing && (
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              Finished activities per day (1 to 50)
              <input
                type="number"
                min={1}
                max={50}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "6px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>
            {goalError && (
              <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: "6px" }}>{goalError}</p>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button className="link-btn" onClick={saveGoal}>
                Save
              </button>
              <button className="link-btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="goal-row">
          <div className="ring">
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r={radius} className="ring-bg" />
              <circle
                cx="55"
                cy="55"
                r={radius}
                className="ring-fg"
                strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
                transform="rotate(-90 55 55)"
              />
            </svg>
            <span className="ring-text">{pct}%</span>
          </div>
          <div className="goal-info">
            <strong>{headline}</strong>
            <p>You finished {goal.done} out of {goal.total} activities today.</p>
          </div>
        </div>
        <Link to="/quiz" className="primary-btn">
          Continue Learning
        </Link>
      </div>

      {/* Activity */}
      <div className="card side-card">
        <div className="side-head">
          <h3>Activity</h3>
          <Link to="/activity" className="link-btn">
            View All
          </Link>
        </div>
        {activities.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "#666", padding: "10px 0" }}>
            {loading ? "Loading activity..." : "No recent activity yet. Take a quiz or explore an AI agent!"}
          </p>
        ) : (
          <ul className="act-list">
            {activities.map((act) => {
              const { Icon, tone } = getToneAndIcon(act.type);
              return (
                <li key={act._id} className={`act-item tone-${tone}`}>
                  <span className="act-icon">
                    <Icon size={18} />
                  </span>
                  <div className="act-text">
                    <div className="act-title">{act.title}</div>
                    <div className="act-sub">{act.description || "Learning activity"}</div>
                  </div>
                  <span className="act-time">{timeAgo(act.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Real Upcoming Tasks */}
      <div className="card side-card">
        <div className="side-head">
          <h3>Upcoming Tasks</h3>
          <Link to="/assignments" className="link-btn">
            View All
          </Link>
        </div>
        {openTasks.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "#666", padding: "10px 0" }}>
            {loading ? "Loading tasks..." : "No upcoming tasks right now. Great job!"}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
            {openTasks.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <input
                  type="checkbox"
                  checked={!!t.done}
                  onChange={() => toggleTaskDone(t.id, t.done)}
                  style={{ cursor: "pointer", width: 16, height: 16 }}
                  title="Mark as done"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      color: "#1e293b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: 2,
                    }}
                  >
                    {t.dueDate && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Calendar size={11} /> {t.dueDate}
                      </span>
                    )}
                    {t.tag && <span>• {t.tag}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}