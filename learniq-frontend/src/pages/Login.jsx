import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  ListChecks,
  NotebookPen,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import Robot from "../components/Robot";
import "../auth.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focus, setFocus] = useState(""); // "username" | "password" | ""
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // What the robot says, and how it moves
  const typedName = username.trim().slice(0, 20);
  let mood = "idle";
  let bubble = "Hi! Ready to learn something new?";
  if (loading) {
    mood = "busy";
    bubble = "Checking your details...";
  } else if (error) {
    mood = "sad";
    bubble = error.toLowerCase().includes("too many")
      ? "Take a short break, then try again."
      : "Oops! Check the message and try again.";
  } else if (focus === "password") {
    bubble = "Shh... I won't peek!";
  } else if (typedName) {
    bubble = `Nice to see you, ${typedName}!`;
  } else if (focus === "username") {
    bubble = "First, tell me your username.";
  }

  return (
    <div className="au-page">
      <span className="au-shape au-s1" aria-hidden="true" />
      <span className="au-shape au-s2" aria-hidden="true" />
      <span className="au-shape au-s3" aria-hidden="true" />
      <span className="au-shape au-s4" aria-hidden="true" />

      <div className="au-panel">
        <aside className="au-side">
          <div className="au-logo-row">
            <Logo size={40} />
            <span>LearnIQ</span>
          </div>

          <div className="au-bubble" key={bubble}>
            {bubble}
          </div>
          <div className={`au-robot ${mood}`} key={`${mood}-${error}`}>
            <Robot size={190} />
          </div>

          <h3 className="au-side-title">Study smarter, not harder</h3>
          <p className="au-side-sub">Pick up right where you left off.</p>
          <div className="au-chips">
            <span className="au-chip">
              <ListChecks size={14} /> Smart quizzes
            </span>
            <span className="au-chip">
              <NotebookPen size={14} /> Quick notes
            </span>
            <span className="au-chip">
              <CalendarDays size={14} /> Study plan
            </span>
          </div>
        </aside>

        <form className="au-card" onSubmit={handleSubmit}>
          <div className="au-mobile-logo">
            <Logo size={32} />
            <span>LearnIQ</span>
          </div>

          <h2 className="au-heading">Welcome back</h2>
          <p className="au-lead">Log in to continue learning</p>

          <div className="au-field">
            <label className="au-label" htmlFor="au-username">
              Username
            </label>
            <div className="au-input-wrap">
              <User size={18} className="au-icon" />
              <input
                id="au-username"
                className="au-input"
                type="text"
                autoComplete="username"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocus("username")}
                onBlur={() => setFocus("")}
                required
              />
            </div>
          </div>

          <div className="au-field">
            <label className="au-label" htmlFor="au-password">
              Password
            </label>
            <div className="au-input-wrap">
              <Lock size={18} className="au-icon" />
              <input
                id="au-password"
                className="au-input"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocus("password")}
                onBlur={() => setFocus("")}
                required
              />
              <button
                type="button"
                className="au-eye"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="au-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="au-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="au-spin" /> Logging in...
              </>
            ) : (
              <>
                <LogIn size={18} /> Log In
              </>
            )}
          </button>

          <p className="au-switch">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}