import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Trash2,
  Play,
  FileText,
  Brain,
  GraduationCap,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useReportActivity } from "../context/AssistantContext";
import "../tasks.css";

const DEFAULT_COURSES = [
  { id: "c-1", name: "Software Testing", code: "ST-601", target: "Semester Finals" },
  { id: "c-2", name: "Python Programming", code: "CS-204", target: "Technical Interviews" },
];

export default function MyCourses() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState(() => {
    try {
      const saved = localStorage.getItem("learniq_enrolled_courses");
      return saved ? JSON.parse(saved) : DEFAULT_COURSES;
    } catch {
      return DEFAULT_COURSES;
    }
  });

  const [topicStats, setTopicStats] = useState({});
  const [newSubject, setNewSubject] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useReportActivity({
    page: "My Courses",
    summary: `Student has ${courses.length} active courses enrolled.`,
  });

  // Sync courses to localStorage
  useEffect(() => {
    localStorage.setItem("learniq_enrolled_courses", JSON.stringify(courses));
  }, [courses]);

  // Load telemetry from real quizzes to compute completion stats
  useEffect(() => {
    async function fetchTelemetry() {
      try {
        const res = await fetch("/api/why-stuck/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data && Array.isArray(data.topics)) {
          const statsMap = {};
          data.topics.forEach((t) => {
            statsMap[t.topic.toLowerCase().trim()] = {
              accuracy: Math.round((t.accuracy || 0) * 100),
              subtopicsCount: (t.subtopic_breakdown || []).length,
            };
          });
          setTopicStats(statsMap);

          // Auto-add any real quiz topic as a course if not already enrolled
          setCourses((prev) => {
            const existingNames = new Set(prev.map((c) => c.name.toLowerCase().trim()));
            const toAdd = [];
            data.topics.forEach((t) => {
              const clean = t.topic.trim();
              if (clean && !existingNames.has(clean.toLowerCase())) {
                existingNames.add(clean.toLowerCase());
                toAdd.push({
                  id: `auto-${Date.now()}-${Math.random()}`,
                  name: clean,
                  code: "ACTIVE",
                  target: "Syllabus Goal",
                });
              }
            });
            return toAdd.length ? [...prev, ...toAdd] : prev;
          });
        }
      } catch (err) {
        console.error("Could not fetch course telemetry:", err.message);
      }
    }
    fetchTelemetry();
  }, [token]);

  function handleAddCourse(e) {
    e.preventDefault();
    if (!newSubject.trim()) return;

    const courseObj = {
      id: `c-${Date.now()}`,
      name: newSubject.trim(),
      code: newCode.trim() || "CORE",
      target: newTarget.trim() || "Semester Target",
    };

    setCourses((prev) => [courseObj, ...prev]);
    setNewSubject("");
    setNewCode("");
    setNewTarget("");
    setShowAdd(false);
  }

  function handleDeleteCourse(id) {
    if (!window.confirm("Remove this subject from your active courses?")) return;
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="td-page" style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Back to dashboard */}
      <Link to="/" className="td-back">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      {/* Yellow Sticker Hero Banner */}
      <section className="td-hero">
        <div className="td-hero-text">
          <span className="td-badge-sticker">
            <BookOpen size={14} /> Academic Subjects
          </span>
          <h2>My Enrolled Courses</h2>
          <p>
            Your syllabus hubs. Launch quizzes, build notes, and track mastery for each subject
            independently.
          </p>
        </div>
        <div className="td-badge-sticker" style={{ background: "#facc15" }}>
          {courses.length} Active Subjects
        </div>
      </section>

      {/* Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          className="td-btn"
          onClick={() => setShowAdd((s) => !s)}
        >
          <Plus size={16} /> {showAdd ? "Close Form" : "Add New Subject"}
        </button>

        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
          ✨ Auto-syncs with your quiz attempts
        </span>
      </div>

      {/* Quick Add Form Drawer */}
      {showAdd && (
        <form className="td-card" onSubmit={handleAddCourse}>
          <h3 className="td-card-title">
            <GraduationCap size={18} /> Enroll a New Course / Subject
          </h3>
          <div className="td-input-row">
            <input
              className="td-input"
              placeholder="Subject Name (e.g. Database Management Systems)"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              required
            />
            <input
              className="td-input"
              placeholder="Course Code / Tag (e.g. CS-301)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
            <input
              className="td-input"
              placeholder="Target Milestone (e.g. Unit Test 2)"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button type="submit" className="td-btn small">
              <Plus size={14} /> Save to My Courses
            </button>
          </div>
        </form>
      )}

      {/* Courses Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
        {courses.map((c) => {
          const stats = topicStats[c.name.toLowerCase().trim()];
          const accuracy = stats ? stats.accuracy : 0;
          const tested = Boolean(stats);

          return (
            <div
              key={c.id}
              className="td-card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                position: "relative",
              }}
            >
              {/* Card Top */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span className="td-prio-pill low" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                      {c.code}
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
                      {c.target}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text, #000)", margin: 0, wordBreak: "break-word" }}>
                    {c.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteCourse(c.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted, #94a3b8)",
                    cursor: "pointer",
                    padding: 4,
                  }}
                  title="Remove course"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Mastery Progress Bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 800, marginBottom: 6 }}>
                  <span style={{ color: "var(--muted, #64748b)" }}>Mastery Level</span>
                  <span style={{ color: tested ? "#10b981" : "var(--muted, #64748b)" }}>
                    {tested ? `${accuracy}%` : "Not tested yet"}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    width: "100%",
                    background: "var(--bg, #f1f5f9)",
                    border: "1.5px solid var(--border, #cbd5e1)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${accuracy}%`,
                      height: "100%",
                      background: accuracy >= 75 ? "#10b981" : accuracy >= 50 ? "#f59e0b" : "#6366f1",
                      borderRadius: 999,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons: Instant AI Agent Shortcuts */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: "auto",
                  paddingTop: 10,
                  borderTop: "1.5px dashed var(--border, #cbd5e1)",
                }}
              >
                <button
                  type="button"
                  className="td-btn small"
                  onClick={() =>
                    navigate("/quiz", {
                      state: { practice: { subject: c.name, subtopic: "" } },
                    })
                  }
                  style={{ fontSize: "0.78rem", padding: "8px 6px" }}
                >
                  <Play size={12} /> Test MCQs
                </button>

                <button
                  type="button"
                  className="td-btn ghost small"
                  onClick={() =>
                    navigate("/notes", {
                      state: { autoTopic: c.name, subject: c.name },
                    })
                  }
                  style={{ fontSize: "0.78rem", padding: "8px 6px" }}
                >
                  <FileText size={12} /> Make Notes
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}