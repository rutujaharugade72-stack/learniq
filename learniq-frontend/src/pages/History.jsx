import { useEffect, useState } from "react";
import { Clock, Play, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// List of the student's saved quizzes. onOpen(id) is given by Quiz.jsx.
export default function History({ onOpen }) {
  const { token } = useAuth();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mcq/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Could not load history");
        setSets(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleOpen(id) {
    setOpeningId(id);
    setError("");
    try {
      await onOpen(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div>
      {loading && (
        <p className="lq-note">
          <Loader2 size={16} className="lq-spin" /> Loading your quizzes...
        </p>
      )}

      {error && <div className="lq-error">{error}</div>}

      {!loading && !error && sets.length === 0 && (
        <p className="lq-note">No saved quizzes yet. Make a quiz and it will show up here.</p>
      )}

      <div className="lq-history">
        {sets.map((s) => (
          <div className="lq-history-item" key={s._id}>
            <div className="lq-history-info">
              <strong>{s.topicName}</strong>
              <span className="lq-history-meta">
                <Clock size={13} /> {formatDate(s.createdAt)} · {s.numQuestions} questions ·{" "}
                {s.difficulty}
                {s.questionType && s.questionType !== "Mixed" ? ` · ${s.questionType}` : ""}
              </span>
            </div>
            <button
              type="button"
              className="lq-btn auto small"
              onClick={() => handleOpen(s._id)}
              disabled={openingId !== null}
            >
              {openingId === s._id ? (
                <Loader2 size={14} className="lq-spin" />
              ) : (
                <Play size={14} />
              )}{" "}
              Open
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}