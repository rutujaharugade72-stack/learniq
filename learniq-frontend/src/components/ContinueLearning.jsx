import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Code2, Database, Cpu, Globe, BookOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const TONES = ["purple", "green", "blue", "amber"];
const ICONS = [Code2, Database, Cpu, Globe, BookOpen];

// Groups all quiz attempts by topic and works out accuracy per topic
function buildCourses(attempts) {
  const map = {};
  attempts.forEach((a) => {
    if (!map[a.topic]) {
      map[a.topic] = { title: a.topic, total: 0, correct: 0, last: 0 };
    }
    const m = map[a.topic];
    m.total += 1;
    if (a.isCorrect) m.correct += 1;
    const t = new Date(a.createdAt).getTime();
    if (t > m.last) m.last = t;
  });

  return Object.values(map)
    .sort((x, y) => y.last - x.last)
    .slice(0, 4)
    .map((m) => {
      const pct = Math.round((m.correct / m.total) * 100);
      let status = "In Progress";
      if (m.total >= 5 && pct >= 75) status = "Mastered";
      else if (m.total < 5) status = "Just Started";
      return { ...m, pct, status };
    });
}

export default function ContinueLearning() {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/quiz-attempts/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCourses(buildCourses(data));
        }
      } catch (err) {
        console.error("Could not load subjects:", err.message);
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
    else setLoading(false);
  }, [token]);

  return (
    <section>
      <div className="section-head">
        <h3>Continue Learning</h3>
        <Link to="/why-stuck" className="view-all">Weak spots</Link>
      </div>

      {!loading && courses.length === 0 && (
        <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
          <p style={{ color: "#64748b", marginBottom: "1rem" }}>
            No subjects yet. Take your first quiz and your subjects will show up here.
          </p>
          <Link to="/quiz" className="primary-btn" style={{ display: "inline-block", padding: "0.6rem 1.25rem" }}>
            Start your first quiz
          </Link>
        </div>
      )}

      <div className="course-grid">
        {courses.map((c, i) => {
          const Icon = ICONS[i % ICONS.length];
          const tone = TONES[i % TONES.length];
          return (
            <Link
              key={c.title}
              to="/quiz"
              state={{ practice: { subject: c.title, subtopic: "" } }}
              className={`course-card tone-${tone}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="course-thumb">
                <span className="status-pill">{c.status}</span>
                <Icon size={44} strokeWidth={1.6} />
              </div>
              <div className="course-body">
                <h4>{c.title}</h4>
                <div className="course-meta">{c.total} questions answered</div>
                <div className="progress-row">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${c.pct}%` }} />
                  </div>
                  <span className="progress-pct">{c.pct}%</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}