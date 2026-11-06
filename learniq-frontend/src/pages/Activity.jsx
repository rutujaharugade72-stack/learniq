import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ListChecks, NotebookPen, FileText, CalendarDays, Library, Trophy, Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function getIcon(type) {
  switch (type) {
    case "quiz_generated":
    case "quiz_completed":
      return ListChecks;
    case "notes_created":
      return NotebookPen;
    case "summary_created":
      return FileText;
    case "plan_created":
      return CalendarDays;
    case "material_uploaded":
      return Library;
    default:
      return Trophy;
  }
}

function formatWhen(dateString) {
  return new Date(dateString).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Activity() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/activities/me?limit=50", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load activity");
        setItems(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <Link
        to="/"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#6366f1", fontWeight: 600, textDecoration: "none", marginBottom: "1.5rem" }}
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <h2 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.25rem" }}>All Activity</h2>
      <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
        Your last 50 learning activities.
      </p>

      {loading && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <Loader2 size={28} className="lq-spin" style={{ color: "#6366f1" }} />
        </div>
      )}

      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "1rem", borderRadius: "8px" }}>
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p style={{ color: "#64748b" }}>No activity yet. Take a quiz to get started!</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {items.map((a) => {
          const Icon = getIcon(a.type);
          return (
            <div
              key={a._id}
              style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc" }}
            >
              <span style={{ background: "#e0e7ff", color: "#4f46e5", padding: "10px", borderRadius: "10px", display: "flex" }}>
                <Icon size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#1e293b" }}>{a.title}</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{a.description}</div>
              </div>
              <span style={{ fontSize: "0.8rem", color: "#64748b", whiteSpace: "nowrap" }}>
                {formatWhen(a.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}