import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  Award,
  Target,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Flame,
  Activity,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useReportActivity } from "../context/AssistantContext";

// High-contrast, theme-agnostic status pills (works on light and dark mode)
function accuracyTone(rate) {
  if (rate >= 0.75) {
    return {
      bg: "rgba(34, 197, 94, 0.16)",
      border: "#22c55e",
      text: "#16a34a",
      label: "Mastered",
    };
  }
  if (rate >= 0.5) {
    return {
      bg: "rgba(245, 158, 11, 0.16)",
      border: "#f59e0b",
      text: "#d97706",
      label: "Improving",
    };
  }
  return {
    bg: "rgba(239, 68, 68, 0.16)",
    border: "#ef4444",
    text: "#dc2626",
    label: "Needs Practice",
  };
}

export default function Progress() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalAttempts: 0,
    overallAccuracy: 0,
    topics: [],
    recentActivity: [],
  });

  useReportActivity({
    page: "Progress & Mastery",
    summary: `Student is tracking subject mastery: ${stats.topics.length} subjects recorded, ${stats.overallAccuracy}% overall accuracy.`,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const resAnalytics = await fetch("/api/why-stuck/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataAnalytics = resAnalytics.ok ? await resAnalytics.json() : null;

        const resActivity = await fetch("/api/activity", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataActivity = resActivity.ok ? await resActivity.json() : [];

        if (dataAnalytics) {
          const totalAtt = dataAnalytics.total_attempts || 0;
          const topicList = (dataAnalytics.topics || []).map((t) => {
            const subtopics = t.subtopic_breakdown || [];
            const avgAcc = subtopics.length
              ? subtopics.reduce((acc, cur) => acc + (cur.accuracy || 0), 0) / subtopics.length
              : t.accuracy || 0;
            return {
              name: t.topic,
              accuracy: Math.round(avgAcc * 100),
              subtopics: subtopics.map((s) => ({
                name: s.subtopic,
                accuracy: Math.round((s.accuracy || 0) * 100),
                attempts: s.attempts || 0,
                materialId: s.materialId || null,
              })),
            };
          });

          const overall = topicList.length
            ? Math.round(topicList.reduce((acc, cur) => acc + cur.accuracy, 0) / topicList.length)
            : 0;

          setStats({
            totalAttempts: totalAtt,
            overallAccuracy: overall,
            topics: topicList,
            recentActivity: Array.isArray(dataActivity) ? dataActivity.slice(0, 8) : [],
          });
        }
      } catch (err) {
        setError(err.message || "Failed to load progress telemetry");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  return (
    <div className="td-page" style={{ maxWidth: 1080, margin: "0 auto", width: "100%" }}>
      {/* Back link */}
      <Link to="/" className="td-back">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      {/* Yellow Sticker Hero Banner */}
      <section className="td-hero" style={{ width: "100%" }}>
        <div className="td-hero-text">
          <span className="td-badge-sticker">
            <TrendingUp size={14} /> Learning Intelligence
          </span>
          <h2>My Progress & Mastery</h2>
          <p>
            Real metrics computed from actual quizzes and tests. Track your learning curve
            without shortcuts.
          </p>
        </div>
        <div
          className="td-badge-sticker"
          style={{
            background: "#facc15",
            color: "#0f172a",
            fontWeight: 900,
            fontSize: "0.95rem",
          }}
        >
          {stats.overallAccuracy}% Overall Mastery
        </div>
      </section>

      {/* Error alert banner if any */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(239, 68, 68, 0.15)",
            border: "1.5px solid #ef4444",
            color: "#ef4444",
            fontSize: "0.85rem",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Quick KPI Bento Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 20,
          width: "100%",
        }}
      >
        <div className="td-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              padding: 12,
              background: "#fef08a",
              border: "2px solid #000",
              borderRadius: 12,
              flexShrink: 0,
            }}
          >
            <Award size={26} color="#000" />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--muted, #94a3b8)" }}>
              TOTAL QUESTIONS TRIED
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--text, #0f172a)" }}>
              {stats.totalAttempts}
            </div>
          </div>
        </div>

        <div className="td-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              padding: 12,
              background: "#bbf7d0",
              border: "2px solid #000",
              borderRadius: 12,
              flexShrink: 0,
            }}
          >
            <Target size={26} color="#000" />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--muted, #94a3b8)" }}>
              SUBJECTS TRACKED
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--text, #0f172a)" }}>
              {stats.topics.length}
            </div>
          </div>
        </div>

        <div className="td-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              padding: 12,
              background: "#bae6fd",
              border: "2px solid #000",
              borderRadius: 12,
              flexShrink: 0,
            }}
          >
            <Flame size={26} color="#000" />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--muted, #94a3b8)" }}>
              STUDY CONSISTENCY
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--text, #0f172a)" }}>
              {stats.recentActivity.length > 3 ? "Active 🔥" : "Building ⚡"}
            </div>
          </div>
        </div>
      </div>

      {/* Weakest subtopics: "Fix these first" card */}
      {(() => {
        const weak = stats.topics
          .flatMap((t) => t.subtopics.map((s) => ({ ...s, topic: t.name })))
          .filter((s) => s.attempts >= 2 && s.accuracy < 60)
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 4);

        if (loading || weak.length === 0) return null;

        return (
          <div
            className="td-card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 20,
              width: "100%",
            }}
          >
            <h3 className="td-card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={18} color="#ef4444" /> Fix these first
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted, #94a3b8)" }}>
              Your lowest-scoring subtopics. One tap makes a quiz just for that topic.
            </p>
            {weak.map((s) => (
              <div
                key={s.topic + s.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: "10px 14px",
                  border: "1.5px solid var(--border, #334155)",
                  borderRadius: 12,
                  background: "var(--surface, rgba(255, 255, 255, 0.04))",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "var(--text, #0f172a)",
                      wordBreak: "break-word",
                    }}
                  >
                    {s.name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted, #94a3b8)", marginTop: 2 }}>
                    {s.topic} · <strong style={{ color: "#ef4444" }}>{s.accuracy}%</strong> right · {s.attempts} tries
                  </div>
                </div>
                <Link
                  to="/quiz"
                  state={{
                    practice: {
                      subject: s.topic,
                      subtopic: s.name,
                      materialId: s.materialId || null,
                    },
                  }}
                  className="td-btn small"
                  style={{ textDecoration: "none", flexShrink: 0 }}
                >
                  <RotateCcw size={14} /> Practise
                </Link>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Main Grid: Subject Breakdown vs Recent Activity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
          width: "100%",
        }}
      >
        {/* Left Column: Subject Mastery Cards */}
        <div className="td-card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h3 className="td-card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <BookOpen size={18} /> Subject Accuracy & Mastery
            </h3>
            <Link to="/quiz" className="td-btn small" style={{ textDecoration: "none" }}>
              Take New Test
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted, #94a3b8)" }}>
              Analyzing quiz telemetry...
            </div>
          ) : stats.topics.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--muted, #94a3b8)" }}>
              <p style={{ margin: "0 0 1rem", fontWeight: 700 }}>No subject tests completed yet.</p>
              <Link to="/quiz" className="td-btn small" style={{ textDecoration: "none" }}>
                Generate your first quiz →
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {stats.topics.map((t) => {
                const tone = accuracyTone(t.accuracy / 100);
                return (
                  <div
                    key={t.name}
                    style={{
                      border: "1.5px solid var(--border, #334155)",
                      borderRadius: 14,
                      padding: "14px 16px",
                      background: "var(--surface, rgba(255, 255, 255, 0.03))",
                    }}
                  >
                    {/* Header: Title and Pill wrap safely without collision */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 10,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "1rem",
                          color: "var(--text, #0f172a)",
                          minWidth: 0,
                          flex: "1 1 180px",
                          wordBreak: "break-word",
                          lineHeight: 1.4,
                        }}
                      >
                        {t.name}
                      </strong>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          padding: "3px 10px",
                          borderRadius: 999,
                          border: `1.5px solid ${tone.border}`,
                          background: tone.bg,
                          color: tone.text,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {t.accuracy}% · {tone.label}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: 8,
                        width: "100%",
                        background: "rgba(148, 163, 184, 0.15)",
                        borderRadius: 6,
                        overflow: "hidden",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: `${t.accuracy}%`,
                          height: "100%",
                          background:
                            t.accuracy >= 75 ? "#22c55e" : t.accuracy >= 50 ? "#f59e0b" : "#ef4444",
                          borderRadius: 6,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>

                    {/* Subtopic Chips */}
                    {t.subtopics.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {t.subtopics.map((s) => (
                          <span
                            key={s.name}
                            style={{
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: "rgba(148, 163, 184, 0.1)",
                              border: "1px solid var(--border, #334155)",
                              color: "var(--muted, #94a3b8)",
                              wordBreak: "break-word",
                            }}
                          >
                            {s.name}: {s.accuracy}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="td-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 className="td-card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={18} /> Verified Learning Logs
          </h3>

          {stats.recentActivity.length === 0 ? (
            <p style={{ fontSize: "0.88rem", color: "var(--muted, #94a3b8)" }}>
              No completed sessions recorded yet today.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.recentActivity.map((act, i) => (
                <div
                  key={act._id || i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--surface, rgba(255, 255, 255, 0.03))",
                    border: "1.5px solid var(--border, #334155)",
                    borderRadius: 10,
                  }}
                >
                  <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        color: "var(--text, #0f172a)",
                        wordBreak: "break-word",
                      }}
                    >
                      {act.title}
                    </div>
                    {act.description && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--muted, #94a3b8)",
                          marginTop: 2,
                          wordBreak: "break-word",
                        }}
                      >
                        {act.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}