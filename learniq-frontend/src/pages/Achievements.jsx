import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Trophy,
  Flame,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Target,
  BookOpen,
  Library,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useReportActivity } from "../context/AssistantContext";
import "../tasks.css";

const ALL_BADGES = [
  {
    id: "first_quiz",
    title: "First Steps",
    desc: "Complete your first quiz or exam module",
    icon: "🎯",
    check: (s) => s.quizCount >= 1,
    tag: "Novice",
  },
  {
    id: "quiz_ten",
    title: "Question Hunter",
    desc: "Answer at least 25 questions across any subject",
    icon: "🏹",
    check: (s) => s.totalAttempts >= 25,
    tag: "Explorer",
  },
  {
    id: "accuracy_high",
    title: "Sharpshooter",
    desc: "Achieve 80% or higher accuracy in a tested subject",
    icon: "⚡",
    check: (s) => s.hasHighAccuracy,
    tag: "Skill",
  },
  {
    id: "boss_killer",
    title: "Boss Slayer",
    desc: "Conquer weak spots identified by Why Am I Stuck?",
    icon: "⚔️",
    check: (s) => s.masteredCount >= 1,
    tag: "Combat",
  },
  {
    id: "study_shelf",
    title: "Digital Librarian",
    desc: "Save at least 1 study material to your Study Shelf",
    icon: "📚",
    check: (s) => s.materialCount >= 1,
    tag: "Prep",
  },
  {
    id: "task_master",
    title: "Consistent Scholar",
    desc: "Clear at least 3 tasks in your Study Planner or Assignments",
    icon: "🏆",
    check: (s) => s.tasksDone >= 3,
    tag: "Habit",
  },
];

export default function Achievements() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    quizCount: 0,
    totalAttempts: 0,
    hasHighAccuracy: false,
    masteredCount: 0,
    materialCount: 0,
    tasksDone: 0,
  });

  useReportActivity({
    page: "Achievements & Badges",
    summary: "Student is inspecting unlocked trophies and study achievements.",
  });

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [resTelemetry, resMaterials, resTasks] = await Promise.all([
          fetch("/api/why-stuck/me", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/materials", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/tasks", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const dataTelemetry = resTelemetry.ok ? await resTelemetry.json() : null;
        const dataMaterials = resMaterials.ok ? await resMaterials.json() : null;
        const dataTasks = resTasks.ok ? await resTasks.json() : null;

        let highAcc = false;
        let mastered = 0;
        let attempts = 0;

        if (dataTelemetry) {
          attempts = dataTelemetry.total_attempts || 0;
          (dataTelemetry.topics || []).forEach((t) => {
            if ((t.accuracy || 0) >= 0.8) highAcc = true;
            (t.subtopic_breakdown || []).forEach((s) => {
              if ((s.accuracy || 0) >= 0.75) mastered++;
            });
          });
        }

        const matCount = dataMaterials?.materials?.length || 0;
        const doneTasks = Array.isArray(dataTasks?.tasks)
          ? dataTasks.tasks.filter((t) => t.done).length
          : 0;

        setStats({
          quizCount: attempts > 0 ? Math.ceil(attempts / 5) : 0,
          totalAttempts: attempts,
          hasHighAccuracy: highAcc,
          masteredCount: mastered,
          materialCount: matCount,
          tasksDone: doneTasks,
        });
      } catch (err) {
        console.error("Could not load achievements:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [token]);

  const unlockedCount = ALL_BADGES.filter((b) => b.check(stats)).length;
  const progressPercent = Math.round((unlockedCount / ALL_BADGES.length) * 100);

  return (
    <div className="td-page" style={{ maxWidth: 1080, margin: "0 auto" }}>
      {/* Back button */}
      <Link to="/" className="td-back">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      {/* Yellow Sticker Hero Banner */}
      <section className="td-hero">
        <div className="td-hero-text">
          <span className="td-badge-sticker">
            <Trophy size={14} /> Milestones & Trophies
          </span>
          <h2>Badges & Achievements</h2>
          <p>
            Earn verified trophies as you practice, clear assignments, and defeat learning
            bottlenecks.
          </p>
        </div>
        <div className="td-badge-sticker" style={{ background: "#facc15" }}>
          {unlockedCount} / {ALL_BADGES.length} Unlocked ({progressPercent}%)
        </div>
      </section>

      {/* Progress Bar Container */}
      <div className="td-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong style={{ fontSize: "0.95rem", color: "var(--text, #1e293b)" }}>
            Overall Trophy Progress
          </strong>
          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#6366f1" }}>
            {progressPercent}% Complete
          </span>
        </div>
        <div
          style={{
            height: 10,
            width: "100%",
            background: "var(--bg, #f1f5f9)",
            border: "1.5px solid var(--border, #cbd5e1)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: "linear-gradient(90deg, #6366f1, #a855f7)",
              borderRadius: 999,
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>

      {/* Badges Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 18 }}>
        {ALL_BADGES.map((badge) => {
          const isUnlocked = badge.check(stats);

          return (
            <div
              key={badge.id}
              className="td-card"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                padding: "20px",
                opacity: isUnlocked ? 1 : 0.65,
                background: isUnlocked ? "var(--surface, #ffffff)" : "var(--bg, #f8fafc)",
              }}
            >
              {/* Badge Icon circle */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  fontSize: "1.8rem",
                  background: isUnlocked ? "#fef08a" : "var(--border, #e2e8f0)",
                  border: "2px solid #000000",
                  borderRadius: 16,
                  boxShadow: isUnlocked ? "3px 3px 0px #000000" : "none",
                }}
              >
                {badge.icon}
              </div>

              {/* Badge Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span
                    className="td-prio-pill"
                    style={{
                      background: isUnlocked ? "#bbf7d0" : "var(--border, #e2e8f0)",
                      fontSize: "0.7rem",
                    }}
                  >
                    {badge.tag}
                  </span>
                  {isUnlocked ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", fontWeight: 800, color: "#16a34a" }}>
                      <CheckCircle2 size={13} /> Unlocked
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
                      <Lock size={12} /> Locked
                    </span>
                  )}
                </div>

                <h4 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 4px", color: "var(--text, #1e293b)" }}>
                  {badge.title}
                </h4>
                <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--muted, #64748b)", lineHeight: 1.4 }}>
                  {badge.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}