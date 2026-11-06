import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Lightbulb, Loader2, Target, AlertTriangle, CheckCircle2, Zap, ShieldAlert, Trophy, Sparkles, Gamepad2, Video, ExternalLink } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useReportActivity } from "../context/AssistantContext";

function barTone(accuracy) {
  if (accuracy < 0.5) return "bad";
  if (accuracy < 0.75) return "mid";
  return "good";
}

function PracticeButton({ topic, subtopic, small = false }) {
  return (
    <Link
      to="/quiz"
      state={{ practice: { subject: topic, subtopic } }}
      className={`why-practice-btn ${small ? "small" : ""}`}
      style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "8px", textDecoration: "none", fontWeight: "600", fontSize: "0.85rem", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)" }}
    >
      <Gamepad2 size={small ? 14 : 16} /> Destroy Boss 🚀
    </Link>
  );
}

function VideoExplainerButton({ topic, subtopic }) {
  const searchQuery = encodeURIComponent(`${subtopic} ${topic} 3D animation visual explanation`);
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;

  return (
    <a
      href={youtubeSearchUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "8px", textDecoration: "none", fontWeight: "600", fontSize: "0.85rem", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)" }}
    >
      <Video size={16} /> Watch 3D / Visual Explainer <ExternalLink size={12} />
    </a>
  );
}

function InsightChip({ item }) {
  if (!item.insight_label) return null;
  return (
    <span className={`why-insight ${item.insight}`} style={{ background: "rgba(245, 158, 11, 0.2)", color: "#f59e0b", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <ShieldAlert size={12} /> {item.insight_label}
    </span>
  );
}

function TrendChip({ item }) {
  if (!item.trend) return null;
  const then = Math.round(item.then_accuracy * 100);
  const now = Math.round(item.now_accuracy * 100);
  const label =
    item.trend === "improved" ? "Leveling Up!" : item.trend === "dropped" ? "Slipping" : "Steadying";
  const arrow = item.trend === "improved" ? "🔥" : item.trend === "dropped" ? "⚠️" : "⚡";
  return (
    <span className={`why-trend ${item.trend}`} style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--primary, #6366f1)" }}>
      {arrow} {label}: {then}% → {now}%
    </span>
  );
}

function timeText(seconds) {
  return seconds > 0 ? ` · ⏱️ ${Math.round(seconds)}s avg` : "";
}

export default function WhyStuck() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const summaryText = result
    ? result.weak_subtopics.length > 0
      ? `Quest Arena: Found ${result.weak_subtopics.length} active boss bottlenecks.`
      : `Quest Arena: All current levels cleared successfully!`
    : "Scanning game map...";

  const reportDetails = useMemo(() => {
    if (!result) return null;
    let mastered = 0;
    let learning = 0;
    let critical = 0;
    (result.topics || []).forEach((t) => {
      t.subtopic_breakdown.forEach((s) => {
        if (s.accuracy >= 0.75) mastered++;
        else if (s.accuracy >= 0.5) learning++;
        else critical++;
      });
    });
    return {
      total_attempts: result.total_attempts,
      mastered_subtopics: mastered,
      training_subtopics: learning,
      weak_subtopic_count: critical,
      weak_subtopics: (result.weak_subtopics || []).slice(0, 5).map((w) => ({
        topic: w.topic,
        subtopic: w.subtopic,
        accuracy_percent: Math.round(w.accuracy * 100),
        attempts: w.attempts,
        reason: w.insight_label || "",
      })),
    };
  }, [result]);

  useReportActivity({
    page: "Why Am I Stuck?",
    summary: summaryText,
    details: reportDetails,
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/why-stuck/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Could not load analysis");
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  let totalSubtopics = 0;
  let masteredCount = 0;
  let learningCount = 0;
  let criticalCount = 0;

  if (result && result.topics) {
    result.topics.forEach((t) => {
      t.subtopic_breakdown.forEach((s) => {
        totalSubtopics++;
        if (s.accuracy >= 0.75) masteredCount++;
        else if (s.accuracy >= 0.5) learningCount++;
        else criticalCount++;
      });
    });
  }

  const masteredPct = totalSubtopics ? Math.round((masteredCount / totalSubtopics) * 100) : 0;
  const learningPct = totalSubtopics ? Math.round((learningCount / totalSubtopics) * 100) : 0;
  const criticalPct = totalSubtopics ? Math.round((criticalCount / totalSubtopics) * 100) : 0;

  return (
    <div className="why-page" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Gamified Arcade Header Banner */}
      <div className="why-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem", background: "linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)", padding: "2rem", borderRadius: "20px", color: "#fff", boxShadow: "0 10px 25px rgba(79, 70, 229,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <span className="why-icon" style={{ background: "rgba(255,255,255,0.2)", padding: "14px", borderRadius: "16px", display: "flex" }}>
            <Trophy size={36} style={{ color: "#fde047" }} />
          </span>
          <div>
            <h2 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "0.25rem", color: "#ffffff", letterSpacing: "-0.5px" }}>Quest Arena & Weakness Breaker</h2>
            <p style={{ opacity: 0.9, fontSize: "1rem", color: "#f3e8ff" }}>Level up your knowledge by watching visual explainers and smashing boss battles!</p>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <Loader2 size={36} className="lq-spin" style={{ color: "#6366f1" }} />
          <p style={{ marginTop: "1rem", color: "var(--muted, #666)", fontWeight: "500" }}>Loading player stats & game telemetry...</p>
        </div>
      )}

      {error && <div className="why-error" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>{error}</div>}

      {result && result.total_attempts === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3rem", borderRadius: "16px" }}>
          <Sparkles size={48} style={{ color: "#a855f7", marginBottom: "1rem" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem" }}>Ready Player One?</h3>
          <p className="why-muted" style={{ marginBottom: "1.5rem" }}>
            No quest attempts recorded yet. Launch your first quiz or test to spawn your learning stats!
          </p>
          <Link to="/quiz" className="primary-btn" style={{ background: "#6366f1", color: "#fff", padding: "0.75rem 1.75rem", borderRadius: "10px", textDecoration: "none", fontWeight: "700", display: "inline-block" }}>Start First Quest 🚀</Link>
        </div>
      )}

      {result && result.total_attempts > 0 && (
        <div className="why-results" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Gamified Mastery XP Bar */}
          <div className="card" style={{ padding: "1.75rem", borderRadius: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={20} style={{ color: "#a855f7" }} />
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800" }}>Overall Mastery XP Progress</h3>
              </div>
              <span style={{ fontWeight: "700", color: "#6366f1", fontSize: "0.95rem" }}>{masteredPct}% Mastered</span>
            </div>

            <div style={{ display: "flex", height: "16px", width: "100%", background: "var(--bg, #f1f5f9)", borderRadius: "8px", overflow: "hidden", marginBottom: "1rem", padding: "2px", border: "1px solid var(--border, #e2e8f0)" }}>
              <div style={{ width: `${masteredPct}%`, background: "linear-gradient(90deg, #10b981, #34d399)", borderRadius: "6px", transition: "width 0.6s ease" }} />
              <div style={{ width: `${learningPct}%`, background: "linear-gradient(90deg, #f59e0b, #fbbf24)", borderRadius: "6px", transition: "width 0.6s ease" }} />
              <div style={{ width: `${criticalPct}%`, background: "linear-gradient(90deg, #ef4444, #f87171)", borderRadius: "6px", transition: "width 0.6s ease" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", fontSize: "0.85rem", color: "var(--muted, #64748b)", fontWeight: "600" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "12px", height: "12px", background: "#10b981", borderRadius: "50%" }} /> Mastered Quests: <strong>{masteredCount}</strong>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "12px", height: "12px", background: "#f59e0b", borderRadius: "50%" }} /> Training: <strong>{learningCount}</strong>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "12px", height: "12px", background: "#ef4444", borderRadius: "50%" }} /> Boss Fights Needed: <strong>{criticalCount}</strong>
              </span>
            </div>
          </div>

          {/* Active Boss Warning Card */}
          <div className={`card why-message ${result.weak_subtopics.length ? "weak" : "ok"}`} style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1.5rem", borderRadius: "16px", borderLeft: result.weak_subtopics.length ? "5px solid #ef4444" : "5px solid #10b981" }}>
            <div style={{ marginTop: "2px", color: result.weak_subtopics.length ? "#ef4444" : "#10b981" }}>
              {result.weak_subtopics.length ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
            </div>
            <div>
              <h4 style={{ fontWeight: "800", fontSize: "1.1rem", marginBottom: "0.25rem" }}>
                {result.weak_subtopics.length ? "⚠️ Active Boss Monster Spawned!" : "🌟 All Zones Conquered!"}
              </h4>
              <p style={{ fontSize: "0.95rem", lineHeight: "1.5", color: "var(--muted, #94a3b8)" }}>
                {result.weak_subtopics.length
                  ? `Your toughest opponent right now is "${result.weak_subtopics[0].subtopic}" under ${result.weak_subtopics[0].topic} (${Math.round(
                      result.weak_subtopics[0].accuracy * 100
                    )}% accuracy). Watch the visual explainer or defeat this boss to gain major XP!`
                  : `Fantastic work! You've cleared all primary boss fights with flying colors across ${result.total_attempts} attempts.`}
              </p>
            </div>
          </div>

          {/* Weak Subtopics / Boss Fight Grid with Video Explainer */}
          {result.weak_subtopics.length > 0 && (
            <div className="card" style={{ padding: "1.75rem", borderRadius: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <Zap size={22} style={{ color: "#ef4444" }} />
                <h3 className="why-h3" style={{ fontSize: "1.2rem", fontWeight: "800" }}>Active Boss Fights (Weak Spots)</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {result.weak_subtopics.map((w) => (
                  <div key={`${w.topic}-${w.subtopic}`} className="why-row" style={{ padding: "1.5rem", borderRadius: "16px", background: "var(--surface, #1e293b)", border: "1px solid var(--border, #334155)" }}>
                    <div className="why-row-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <strong style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          ⚔️ {w.subtopic} <InsightChip item={w} />
                        </strong>
                        <span className="why-muted" style={{ fontSize: "0.85rem", color: "var(--muted, #94a3b8)" }}>
                          Module: {w.topic} · {w.attempts} attempts{timeText(w.avg_time_seconds)}
                        </span>
                      </div>
                      <span className="why-pct" style={{ fontWeight: "800", color: "#ef4444", fontSize: "1.2rem", background: "rgba(239, 68, 68, 0.15)", padding: "4px 10px", borderRadius: "8px" }}>{Math.round(w.accuracy * 100)}%</span>
                    </div>

                    <div className="why-bar-row" style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                      <div className="why-bar" style={{ flex: 1, height: "10px", background: "var(--bg, #f1f5f9)", borderRadius: "5px", overflow: "hidden" }}>
                        <div
                          className={`why-bar-fill ${barTone(w.accuracy)}`}
                          style={{ width: `${Math.round(w.accuracy * 100)}%`, height: "100%", background: "linear-gradient(90deg, #ef4444, #f87171)", borderRadius: "5px" }}
                        />
                      </div>
                    </div>

                    {w.insight_text && <p className="why-insight-text" style={{ fontSize: "0.9rem", color: "var(--text, #cbd5e1)", marginBottom: "1rem", fontStyle: "italic", background: "rgba(255,255,255,0.06)", padding: "8px 12px", borderRadius: "8px" }}>💡 "{w.insight_text}"</p>}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginTop: "1rem" }}>
                      <TrendChip item={w} />
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <VideoExplainerButton topic={w.topic} subtopic={w.subtopic} />
                        <PracticeButton topic={w.topic} subtopic={w.subtopic} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Module Breakdown */}
          {result.topics.map((t) => (
            <div className="card" key={t.topic} style={{ padding: "1.75rem", borderRadius: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
              <h3 className="why-h3" style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "1.25rem", borderBottom: "1px solid var(--border, #f1f5f9)", paddingBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📁 {t.topic}</span>
                <span style={{ fontSize: "0.9rem", color: t.accuracy >= 0.75 ? "#10b981" : "#f59e0b", background: t.accuracy >= 0.75 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", padding: "4px 10px", borderRadius: "8px" }}>
                  {Math.round(t.accuracy * 100)}% Mastery
                </span>
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {t.subtopic_breakdown.map((s) => (
                  <div key={s.subtopic} className="why-row" style={{ padding: "1.25rem", borderRadius: "14px", background: "var(--surface, #1e293b)", border: "1px solid var(--border, #e2e8f0)" }}>
                    <div className="why-row-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <strong style={{ fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        🎯 {s.subtopic} <InsightChip item={s} />
                      </strong>
                      <span className="why-muted" style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)" }}>
                        {s.attempts} attempts · {s.avg_hints_used} hints {timeText(s.avg_time_seconds)}
                      </span>
                    </div>
                    <div className="why-bar-row" style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                      <div className="why-bar" style={{ flex: 1, height: "8px", background: "var(--bg, #e2e8f0)", borderRadius: "4px", overflow: "hidden" }}>
                        <div
                          className={`why-bar-fill ${barTone(s.accuracy)}`}
                          style={{ width: `${Math.round(s.accuracy * 100)}%`, height: "100%", background: s.accuracy >= 0.75 ? "#10b981" : "#f59e0b", borderRadius: "4px" }}
                        />
                      </div>
                      <span className="why-pct" style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--muted, #475569)" }}>{Math.round(s.accuracy * 100)}%</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginTop: "0.75rem" }}>
                      <TrendChip item={s} />
                      <VideoExplainerButton topic={t.topic} subtopic={s.subtopic} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* AI Recovery Plan */}
          {result.recovery_plan && (
            <div className="card" style={{ background: "linear-gradient(135deg, rgba(217, 70, 239, 0.1) 0%, rgba(168, 85, 247, 0.15) 100%)", padding: "2rem", borderRadius: "20px", border: "1px solid rgba(217, 70, 239, 0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <Lightbulb size={28} style={{ color: "#c084fc" }} />
                <h3 className="why-h3" style={{ fontSize: "1.25rem", fontWeight: "800", color: "#c084fc" }}>AI Power-Up Strategy for {result.recovery_subtopic}</h3>
              </div>
              <ol className="why-plan" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingLeft: "1.25rem", color: "var(--text, #e2e8f0)", fontWeight: "500" }}>
                {result.recovery_plan.map((step) => (
                  <li key={step.step} style={{ lineHeight: "1.6", fontSize: "0.95rem" }}>
                    {step.description}
                  </li>
                ))}
              </ol>
            </div>
          )}

        </div>
      )}
    </div>
  );
}