import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Trophy,
  Medal,
  Flame,
  Crown,
  Sparkles,
  TrendingUp,
  Loader2,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useReportActivity } from "../context/AssistantContext";
import "../tasks.css";

export default function Leaderboard() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");

  useReportActivity({
    page: "Leaderboard & Peer Ranks",
    summary: "Student is viewing real campus leaderboard ranks computed via MongoDB aggregation.",
  });

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/leaderboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load leaderboard");
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [token]);

  const userRankEntry = leaderboard.find((p) => p.isUser);
  const userRank = userRankEntry ? userRankEntry.rank : 1;
  const userXp = userRankEntry ? userRankEntry.xp : 0;

  return (
    <div className="td-page" style={{ maxWidth: 1040, margin: "0 auto" }}>
      {/* Back button */}
      <Link to="/" className="td-back">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      {/* Hero Banner */}
      <section className="td-hero">
        <div className="td-hero-text">
          <span className="td-badge-sticker">
            <Trophy size={14} /> Verified League
          </span>
          <h2>Campus Leaderboard</h2>
          <p>
            Real metrics calculated dynamically from quiz attempts, accuracy bonuses, and completed planner tasks.
          </p>
        </div>
        <div className="td-badge-sticker" style={{ background: "#facc15" }}>
          Rank: #{userRank} ({userXp} XP)
        </div>
      </section>

      {loading ? (
        <div className="td-card" style={{ textAlign: "center", padding: "3rem" }}>
          <Loader2 size={24} className="sp-spin" style={{ margin: "0 auto 8px" }} />
          Computing verified campus rankings...
        </div>
      ) : error ? (
        <div className="td-card" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
          {error}
        </div>
      ) : (
        <>
          {/* Top Podium Cards (Top 3 real registered students) */}
          {leaderboard.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {leaderboard.slice(0, 3).map((podium) => {
                const isFirst = podium.rank === 1;
                const isSecond = podium.rank === 2;
                const medalBg = isFirst ? "#fef08a" : isSecond ? "#e2e8f0" : "#fed7aa";

                return (
                  <div
                    key={podium.userId || podium.rank}
                    className="td-card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      padding: "24px 18px",
                      position: "relative",
                      borderWidth: isFirst ? 3.5 : 2.5,
                    }}
                  >
                    {isFirst && (
                      <Crown
                        size={24}
                        color="#eab308"
                        style={{ position: "absolute", top: 12, right: 14 }}
                      />
                    )}

                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 18,
                        background: medalBg,
                        border: "2px solid #000",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "2rem",
                        marginBottom: 10,
                        boxShadow: "3px 3px 0 #000",
                      }}
                    >
                      {podium.avatar}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span className="td-prio-pill medium" style={{ fontSize: "0.72rem" }}>
                        #{podium.rank} Rank
                      </span>
                      {podium.isUser && (
                        <span className="td-prio-pill low" style={{ fontSize: "0.72rem" }}>
                          YOU
                        </span>
                      )}
                    </div>

                    <strong style={{ fontSize: "1.1rem", color: "var(--text, #1e293b)" }}>
                      {podium.name}
                    </strong>
                    <span style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)", marginBottom: 12 }}>
                      {podium.title} · {podium.totalAttempts} questions answered
                    </span>

                    <div
                      style={{
                        width: "100%",
                        padding: "8px 0",
                        background: "var(--bg, #f8fafc)",
                        border: "1.5px solid var(--border, #cbd5e1)",
                        borderRadius: 10,
                        display: "flex",
                        justifyContent: "space-around",
                        fontSize: "0.85rem",
                        fontWeight: 800,
                      }}
                    >
                      <span style={{ color: "#6366f1" }}>{podium.xp} XP</span>
                      <span style={{ color: "#c2410c", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Flame size={14} /> {podium.streak}d streak
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Verified League Table */}
          <div className="td-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="td-card-title" style={{ margin: 0 }}>
                <Medal size={18} /> Verified League Table
              </h3>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
                <Users size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {leaderboard.length} Registered {leaderboard.length === 1 ? "Learner" : "Learners"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leaderboard.map((row) => (
                <div
                  key={row.userId || row.rank}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: row.isUser ? "2px solid #6366f1" : "1.5px solid var(--border, #e2e8f0)",
                    background: row.isUser ? "rgba(99, 102, 241, 0.12)" : "var(--bg, #f8fafc)",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 900,
                        width: 28,
                        color: row.rank <= 3 ? "#eab308" : "var(--muted, #64748b)",
                      }}
                    >
                      #{row.rank}
                    </span>

                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: "var(--surface, #fff)",
                        border: "1.5px solid #000",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "1.2rem",
                      }}
                    >
                      {row.avatar}
                    </div>

                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text, #1e293b)" }}>
                        {row.name} {row.isUser && "(You)"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
                        {row.title} · {row.accuracy}% accuracy ({row.correctAnswers}/{row.totalAttempts})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c2410c", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Flame size={14} /> {row.streak}d
                    </span>
                    <span
                      style={{
                        fontSize: "0.92rem",
                        fontWeight: 900,
                        color: "var(--text, #1e293b)",
                        minWidth: 70,
                        textAlign: "right",
                      }}
                    >
                      {row.xp} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}