import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  AtSign,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Loader2,
  ListChecks,
  NotebookPen,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import Robot from "../components/Robot";
import "../auth.css";

export default function Signup() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focus, setFocus] = useState(""); // "name" | "username" | "password" | ""
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Every new account is a student for now
        body: JSON.stringify({ name, username, password, role: "student" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Signup failed");
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // What the robot says, and how it moves
  const firstName = name.trim().split(" ")[0].slice(0, 20);
  let mood = "idle";
  let bubble = "Hi! Let's set up your account.";
  if (loading) {
    mood = "busy";
    bubble = "Creating your account...";
  } else if (error) {
    mood = "sad";
    bubble = error.toLowerCase().includes("too many")
      ? "Take a short break, then try again."
      : "Oops! Check the message and try again.";
  } else if (focus === "password") {
    bubble =
      password.length > 0 && password.length < 6
        ? "A little longer please: at least 6 characters."
        : "Pick something only you know. I won't peek!";
  } else if (focus === "username") {
    bubble = "Choose a username (at least 3 characters). You will use it to log in.";
  } else if (firstName) {
    bubble = `Nice to meet you, ${firstName}!`;
  } else if (focus === "name") {
    bubble = "What should I call you?";
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

          <h3 className="au-side-title">Learn smarter, not harder</h3>
          <p className="au-side-sub">
            Your AI study buddy finds exactly where you get stuck and helps you fix it.
          </p>
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

          <h2 className="au-heading">Create your student account</h2>
          <p className="au-lead">It takes less than a minute</p>

          <div className="au-field">
            <label className="au-label" htmlFor="au-name">
              Name
            </label>
            <div className="au-input-wrap">
              <User size={18} className="au-icon" />
              <input
                id="au-name"
                className="au-input"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocus("name")}
                onBlur={() => setFocus("")}
                required
              />
            </div>
          </div>

          <div className="au-field">
            <label className="au-label" htmlFor="au-username">
              Username
            </label>
            <div className="au-input-wrap">
              <AtSign size={18} className="au-icon" />
              <input
                id="au-username"
                className="au-input"
                type="text"
                autoComplete="username"
                placeholder="Pick a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocus("username")}
                onBlur={() => setFocus("")}
                required
                minLength={3}
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
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocus("password")}
                onBlur={() => setFocus("")}
                required
                minLength={6}
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
                <Loader2 size={18} className="au-spin" /> Creating account...
              </>
            ) : (
              <>
                <UserPlus size={18} /> Sign Up
              </>
            )}
          </button>

          <p className="au-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}