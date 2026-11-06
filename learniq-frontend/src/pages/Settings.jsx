import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Zap,
  KeyRound,
  Mail,
  HelpCircle,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  Send,
  Lock,
  GraduationCap,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useReportActivity } from "../context/AssistantContext";

const MASCOTS = [
  { id: "owl", emoji: "🦉", name: "Scholar Owl", tag: "Wisdom" },
  { id: "fox", emoji: "🦊", name: "Ninja Fox", tag: "Agility" },
  { id: "astro", emoji: "🚀", name: "Cosmic Brain", tag: "Focus" },
  { id: "cat", emoji: "🐱", name: "Focus Neko", tag: "Calm" },
  { id: "robot", emoji: "🤖", name: "LearnBot", tag: "Logic" },
  { id: "lion", emoji: "🦁", name: "Campus Champ", tag: "Leader" },
];

const FAQS = [
  {
    q: "How does the AI Teacher generate personalized study notes?",
    a: "LearnIQ pairs Google Gemini with your syllabus criteria. It synthesizes definitions, comparison matrices, formula derivations, and self-test flashcards.",
  },
  {
    q: "How do I update my email or password securely?",
    a: "Open the 'Security Vault' card below. Enter your new credentials, confirm your current password, and click save.",
  },
  {
    q: "How does Study Planner sync with Assignments?",
    a: "Both systems are bidirectionally wired. Ticking off tasks in either view instantly updates your daily completion ring and overall study streaks.",
  },
];

export default function Settings() {
  const { user, token, updateUser } = useAuth();

  const [notice, setNotice] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  // Profile Fields
  const [name, setName] = useState(user?.name || user?.username || "Student");
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || "🦉");
  const [boardOrUni, setBoardOrUni] = useState(user?.boardOrUni || "Mumbai University / State Board");
  const [gradeOrYear, setGradeOrYear] = useState(user?.gradeOrYear || "Final Year BE / Class 10");
  const [targetExam, setTargetExam] = useState(user?.targetExam || "Semester Finals");

  // Security Drawer State
  const [vaultOpen, setVaultOpen] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(user?.email || "student@learniq.ai");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassConfirm, setEmailPassConfirm] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Help & FAQs
  const [openFaq, setOpenFaq] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [sentFeedback, setSentFeedback] = useState(false);

  useReportActivity({
    page: "Settings & Student Passport",
    summary: `Student is editing their settings and passport: Name: "${name}", Board/University: "${boardOrUni}", Standard/Year: "${gradeOrYear}", Target Exam: "${targetExam}", Mascot: "${selectedAvatar}".`,
    details: {
      screen: "Settings",
      name,
      boardOrUni,
      gradeOrYear,
      targetExam,
      mascot: selectedAvatar,
      vaultOpen,
    },
  });

  function triggerNotice(text, type = "success") {
    setNotice({ text, type });
    setTimeout(() => setNotice({ text: "", type: "" }), 4000);
  }

  async function handleSaveIdentity(e) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      name: name.trim(),
      avatar: selectedAvatar,
      boardOrUni: boardOrUni.trim(),
      gradeOrYear: gradeOrYear.trim(),
      targetExam: targetExam.trim(),
    };

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      updateUser(payload);
      triggerNotice("Student passport updated! Ready to learn ⚡");
    } catch {
      updateUser(payload);
      triggerNotice("Passport updated locally! ✨");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateEmail(e) {
    e.preventDefault();
    if (!newEmail.trim() || !emailPassConfirm) {
      triggerNotice("Enter your new email and current password!", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newEmail.trim(), password: emailPassConfirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update email.");

      setCurrentEmail(newEmail.trim());
      updateUser({ email: newEmail.trim() });
      setNewEmail("");
      setEmailPassConfirm("");
      triggerNotice("Email updated to " + newEmail.trim() + " 🚀");
    } catch (err) {
      triggerNotice(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      triggerNotice("Enter current and new passwords!", "error");
      return;
    }
    if (newPassword.length < 6) {
      triggerNotice("Password must be at least 6 characters!", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerNotice("Passwords do not match!", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password update failed.");

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      triggerNotice("Password updated successfully! 🔒");
    } catch (err) {
      triggerNotice(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 24px" }}>
      {/* Top Bar Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Link className="nl-back" to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0 }}>
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--muted, #64748b)" }}>
          <ShieldCheck size={16} color="#10b981" /> Authenticated Student Session
        </div>
      </div>

      {/* Notice Banner */}
      {notice.text && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            background: notice.type === "error" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
            border: `2px solid ${notice.type === "error" ? "#ef4444" : "#10b981"}`,
            borderRadius: 14,
            color: notice.type === "error" ? "#ef4444" : "#10b981",
            fontWeight: 800,
            marginBottom: 20,
          }}
        >
          {notice.type === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          {notice.text}
        </div>
      )}

      {/* BENTO GRID WORKSPACE */}
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 20 }}>
        
        {/* LEFT COLUMN: Identity & Curriculum Matrix */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Bento Card 1: Student Passport */}
          <div
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              borderRadius: 24,
              padding: 26,
              color: "#ffffff",
              boxShadow: "0 10px 30px rgba(124, 58, 237, 0.25)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
              <div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <Sparkles size={12} /> Student Passport
                </span>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 900, marginTop: 8, letterSpacing: "-0.02em" }}>
                  {name || "Student"}
                </h2>
                <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>{currentEmail}</div>
              </div>

              {/* Big Mascot Display */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.25)",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.6rem",
                  boxShadow: "inset 0 0 12px rgba(255,255,255,0.3)",
                }}
              >
                {selectedAvatar}
              </div>
            </div>

            {/* Mascot Quick Toggles */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.18)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.85, marginBottom: 8 }}>
                Choose Your Study Mascot
              </div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {MASCOTS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedAvatar(m.emoji)}
                    style={{
                      background: selectedAvatar === m.emoji ? "#ffffff" : "rgba(255,255,255,0.14)",
                      color: selectedAvatar === m.emoji ? "#1e1b4b" : "#ffffff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      transition: "transform 0.15s ease",
                      transform: selectedAvatar === m.emoji ? "scale(1.05)" : "none",
                    }}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bento Card 2: Academic Profile Form */}
          <form
            onSubmit={handleSaveIdentity}
            className="card"
            style={{
              borderRadius: 24,
              padding: 24,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ padding: 8, background: "rgba(124, 58, 237, 0.15)", color: "#a855f7", borderRadius: 10 }}>
                <GraduationCap size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>Curriculum & Goals</h3>
                <p style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>Feeds syllabus targets directly into AI generators.</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", fontWeight: 800 }}>
                Student Display Name
                <input
                  className="td-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  required
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", fontWeight: 800 }}>
                Target Board / University
                <input
                  className="td-input"
                  value={boardOrUni}
                  onChange={(e) => setBoardOrUni(e.target.value)}
                  placeholder="e.g. Mumbai University"
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", fontWeight: 800 }}>
                Current Standard / Year & Stream
                <input
                  className="td-input"
                  value={gradeOrYear}
                  onChange={(e) => setGradeOrYear(e.target.value)}
                  placeholder="e.g. BE IT / Class 10"
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", fontWeight: 800 }}>
                Immediate Exam / Milestone
                <input
                  className="td-input"
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value)}
                  placeholder="e.g. Sem 6 Finals"
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button
                type="submit"
                disabled={loading}
                className="nl-btn go"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px" }}
              >
                <Save size={16} /> {loading ? "Updating..." : "Save Passport"}
              </button>
            </div>
          </form>

        </div>

        {/* RIGHT COLUMN: Security Vault & Help Hub */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Bento Card 3: Expandable Security Vault */}
          <div
            className="card"
            style={{
              borderRadius: 24,
              padding: 22,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            }}
          >
            <div
              onClick={() => setVaultOpen(!vaultOpen)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ padding: 8, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", borderRadius: 10 }}>
                  <Lock size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>Security Vault</h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>Update email & change passwords</div>
                </div>
              </div>
              <ChevronDown
                size={18}
                color="var(--muted, #64748b)"
                style={{ transform: vaultOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}
              />
            </div>

            {vaultOpen && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border, #f1f5f9)", display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Email Change */}
                <form onSubmit={handleUpdateEmail} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 800 }}>Change Registered Email</div>
                  <input
                    type="email"
                    className="td-input"
                    placeholder="New email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    className="td-input"
                    placeholder="Current password to authorize"
                    value={emailPassConfirm}
                    onChange={(e) => setEmailPassConfirm(e.target.value)}
                    required
                  />
                  <button type="submit" disabled={loading} className="td-btn small" style={{ alignSelf: "flex-end" }}>
                    <Mail size={13} /> Update Email
                  </button>
                </form>

                <hr style={{ border: "none", borderTop: "1px solid var(--border, #f1f5f9)" }} />

                {/* Password Change */}
                <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 800 }}>Reset Password</div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showOldPass ? "text" : "password"}
                      className="td-input"
                      placeholder="Current password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted, #94a3b8)" }}
                    >
                      {showOldPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNewPass ? "text" : "password"}
                      className="td-input"
                      placeholder="New password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted, #94a3b8)" }}
                    >
                      {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <input
                    type="password"
                    className="td-input"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button type="submit" disabled={loading} className="td-btn small" style={{ alignSelf: "flex-end" }}>
                    <KeyRound size={13} /> Update Password
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Bento Card 4: Quick Help & Ping Box */}
          <div
            className="card"
            style={{
              borderRadius: 24,
              padding: 22,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ padding: 8, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", borderRadius: 10 }}>
                <Compass size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>Help Corner</h3>
                <div style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>Quick solutions for LearnIQ tools</div>
              </div>
            </div>

            {/* FAQ Accordion Pills */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {FAQS.map((faq, idx) => {
                const open = openFaq === idx;
                return (
                  <div key={idx} style={{ border: "1px solid var(--border, #f1f5f9)", borderRadius: 12, overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : idx)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: open ? "var(--bg, #f8fafc)" : "var(--surface, #ffffff)",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--text, #334155)",
                        textAlign: "left",
                      }}
                    >
                      <span>{faq.q}</span>
                      <ChevronDown size={14} color="var(--muted, #94a3b8)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
                    </button>
                    {open && (
                      <div style={{ padding: "10px 14px", fontSize: "0.78rem", color: "var(--muted, #64748b)", background: "var(--bg, #f8fafc)", lineHeight: 1.5 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Feedback Ping */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!feedback.trim()) return;
                setSentFeedback(true);
                setFeedback("");
                setTimeout(() => setSentFeedback(false), 3000);
              }}
              style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}
            >
              {sentFeedback && (
                <div style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 700 }}>
                  Feedback received! Thanks for helping improve LearnIQ ✨
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="td-input"
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                  placeholder="Spot a bug? Tell us here..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
                <button type="submit" className="nl-btn go small" style={{ padding: "6px 12px" }}>
                  <Send size={13} />
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}