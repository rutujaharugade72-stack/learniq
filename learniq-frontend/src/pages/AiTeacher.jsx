import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Image as ImageIcon,
  X,
  Loader2,
  Paperclip,
  Check,
  Copy,
  Pin,
  PinOff,
  Edit2,
  Share2,
  MoreVertical,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useReportActivity } from "../context/AssistantContext";
import "../tasks.css";

const STORAGE_KEY = "learniq_teacher_sessions_v2";
const ACTIVE_SESSION_KEY = "learniq_active_session_id";

function getInitialSessions(user) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse sessions:", e);
  }
  const defaultId = `session_${Date.now()}`;
  return [
    {
      id: defaultId,
      title: "New Tutoring Session",
      pinned: false,
      messages: [
        {
          role: "assistant",
          text: `Hello ${user?.name || "there"}! 👋 I'm your AI Teacher.\n\nAsk me any concept doubts, paste code, or upload photos of diagrams and homework questions. What are we studying?`,
        },
      ],
    },
  ];
}

function getInitialActiveSessionId(sessionsList) {
  try {
    const savedActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (savedActiveId && sessionsList.some((s) => s.id === savedActiveId)) {
      return savedActiveId;
    }
  } catch (e) {
    console.error("Failed to get active session id:", e);
  }
  return sessionsList[0]?.id || "";
}

export default function AiTeacher() {
  const { token, user } = useAuth();
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const menuRef = useRef(null);

  // --- Sessions State ---
  const [sessions, setSessions] = useState(() => getInitialSessions(user));
  const [activeSessionId, setActiveSessionId] = useState(() => getInitialActiveSessionId(sessions));

  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIdx, setCopiedIdx] = useState(null);

  // Session Action Menu State (Pin, Rename, Share, Delete)
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  useReportActivity({
    page: "AI Teacher Arena",
    summary: `Student in tutoring session: "${activeSession?.title || "Session"}".`,
  });

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Persist active session ID across page refreshes
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  // Auto-scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    const scrollToBottom = () => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    requestAnimationFrame(scrollToBottom);
    const timeout = setTimeout(scrollToBottom, 60);
    return () => clearTimeout(timeout);
  }, [messages, loading]);

  // Close kebab menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  }

  // --- Session Handlers ---
  function handleSelectSession(id) {
    setActiveSessionId(id);
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
    setError("");
  }

  function handleNewSession() {
    const newId = `session_${Date.now()}`;
    const newSession = {
      id: newId,
      title: "New Tutoring Session",
      pinned: false,
      messages: [
        {
          role: "assistant",
          text: `Fresh session ready! Ask a question or drop an image to get started.`,
        },
      ],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    localStorage.setItem(ACTIVE_SESSION_KEY, newId);
    setInput("");
    setSelectedImage(null);
    setError("");
    setMenuOpenId(null);
  }

  function handleTogglePin(id) {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    );
    setMenuOpenId(null);
    showToast("Session pinned status updated");
  }

  function handleStartRename(s) {
    setEditingId(s.id);
    setEditTitle(s.title);
    setMenuOpenId(null);
  }

  function handleSaveRename(id) {
    if (!editTitle.trim()) return setEditingId(null);
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: editTitle.trim() } : s))
    );
    setEditingId(null);
    showToast("Renamed session");
  }

  function handleShareChat(session) {
    const transcript = session.messages
      .map((m) => `[${m.role === "assistant" ? "AI Teacher" : "Student"}]:\n${m.text}`)
      .join("\n\n---\n\n");

    navigator.clipboard.writeText(
      `--- LearnIQ AI Tutoring Session: ${session.title} ---\n\n${transcript}`
    );
    setMenuOpenId(null);
    showToast("Chat transcript copied to clipboard! 📋");
  }

  function handleDeleteSession(id) {
    if (sessions.length <= 1) {
      handleNewSession();
      setSessions((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      const nextId = filtered[0].id;
      setActiveSessionId(nextId);
      localStorage.setItem(ACTIVE_SESSION_KEY, nextId);
    }
    setMenuOpenId(null);
    showToast("Session deleted");
  }

  // Image Upload Handler (<canvas> compression for fast transmission)
  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image (PNG, JPG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1024;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        setSelectedImage(compressed);
        setError("");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // Handle Send Message
  async function handleSend(e) {
    if (e) e.preventDefault();
    const query = input.trim();
    const imagePayload = selectedImage;

    if ((!query && !imagePayload) || loading) return;

    setError("");

    const userMessage = {
      role: "user",
      text: query || "Explain what is shown in this image step-by-step:",
      image: imagePayload || undefined,
    };

    setInput("");
    setSelectedImage(null);

    const updatedMessages = [...messages, userMessage];
    const newTitle =
      activeSession.title === "New Tutoring Session"
        ? (query || "Image Analysis").slice(0, 26)
        : activeSession.title;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, title: newTitle, messages: updatedMessages }
          : s
      )
    );

    setLoading(true);

    try {
      const historyPayload = updatedMessages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: userMessage.text,
          image: imagePayload,
          page: "AI Teacher Arena",
          history: historyPayload,
          details: { studentName: user?.name || "Student" },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI could not process request.");

      const aiMessage = {
        role: "assistant",
        text: data.reply || "Done! What else would you like to explore?",
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...updatedMessages, aiMessage] }
            : s
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text, idx) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  const pinnedSessions = sessions.filter((s) => s.pinned);
  const unpinnedSessions = sessions.filter((s) => !s.pinned);

  return (
    <div className="td-page" style={{ maxWidth: 1240, margin: "0 auto", paddingBottom: 24, position: "relative" }}>
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#0f172a",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 12,
            border: "1.5px solid #6366f1",
            boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
            zIndex: 999,
            fontSize: "0.85rem",
            fontWeight: 700,
          }}
        >
          {toastMsg}
        </div>
      )}

      <Link to="/" className="td-back">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 16,
          height: "calc(100vh - 165px)",
          minHeight: 560,
        }}
      >
        {/* Left Column: Chat History Sessions */}
        <div
          className="td-card"
          style={{
            display: "flex",
            flexDirection: "column",
            padding: 14,
            gap: 10,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <button
            type="button"
            className="td-btn"
            onClick={handleNewSession}
            style={{ width: "100%", justifyContent: "center", gap: 6, padding: "10px" }}
          >
            <Plus size={16} /> New Session
          </button>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 2 }}>
            {pinnedSessions.length > 0 && (
              <>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--muted, #64748b)", textTransform: "uppercase", margin: "6px 4px 2px", display: "flex", alignItems: "center", gap: 4 }}>
                  <Pin size={11} /> Pinned
                </div>
                {pinnedSessions.map((s) => renderSessionRow(s))}
              </>
            )}

            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--muted, #64748b)", textTransform: "uppercase", margin: "10px 4px 2px" }}>
              Recent Chats
            </div>
            {unpinnedSessions.map((s) => renderSessionRow(s))}
          </div>
        </div>

        {/* Right Column: Active Conversation */}
        <div
          className="td-card"
          style={{
            display: "flex",
            flexDirection: "column",
            padding: 18,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 12,
              borderBottom: "1.5px solid var(--border, #e2e8f0)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                }}
              >
                <Bot size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--text, #1e293b)" }}>
                  {activeSession?.title}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
                  Context-aware tutor · Accepts text, code & high-res photos
                </span>
              </div>
            </div>

            <button
              type="button"
              className="td-btn ghost small"
              onClick={() => handleShareChat(activeSession)}
              title="Share entire transcript"
              style={{ fontSize: "0.75rem", gap: 4 }}
            >
              <Share2 size={13} /> Share
            </button>
          </div>

          {/* Messages Stream: top-anchored with flex-start */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: 16,
              padding: "16px 8px 16px 0",
              scrollBehavior: "smooth",
            }}
          >
            {messages.map((m, idx) => {
              const isAI = m.role === "assistant";
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    alignSelf: isAI ? "flex-start" : "flex-end",
                    maxWidth: "84%",
                  }}
                >
                  {isAI && (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "grid",
                        placeItems: "center",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      <Bot size={16} />
                    </div>
                  )}

                  <div
                    style={{
                      position: "relative",
                      padding: "14px 18px",
                      borderRadius: 16,
                      border: isAI ? "1.5px solid var(--border, #cbd5e1)" : "1.5px solid #4f46e5",
                      background: isAI ? "var(--bg, #f8fafc)" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                      color: isAI ? "var(--text, #1e293b)" : "#ffffff",
                      fontSize: "0.93rem",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      boxShadow: isAI
                        ? "0 2px 8px rgba(0,0,0,0.04)"
                        : "0 4px 14px rgba(79, 70, 229, 0.25)",
                    }}
                  >
                    {m.image && (
                      <div style={{ marginBottom: 10 }}>
                        <img
                          src={m.image}
                          alt="Uploaded question"
                          style={{
                            maxWidth: "100%",
                            maxHeight: 260,
                            borderRadius: 10,
                            border: "1.5px solid rgba(255,255,255,0.4)",
                            objectFit: "contain",
                            display: "block",
                          }}
                        />
                      </div>
                    )}

                    {m.text}

                    {isAI && (
                      <button
                        type="button"
                        onClick={() => handleCopy(m.text, idx)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 8,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "var(--muted, #64748b)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {copiedIdx === idx ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                        {copiedIdx === idx ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  <Loader2 size={16} className="sp-spin" />
                </div>
                <div
                  style={{
                    padding: "10px 16px",
                    borderRadius: 14,
                    background: "var(--bg, #f8fafc)",
                    border: "1.5px solid var(--border, #cbd5e1)",
                    fontSize: "0.85rem",
                    color: "var(--muted, #64748b)",
                    fontStyle: "italic",
                  }}
                >
                  AI Teacher is inspecting question and formulation...
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1.5px solid #ef4444",
                  color: "#b91c1c",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            )}

            <div ref={chatBottomRef} style={{ height: 1 }} />
          </div>

          {/* Pending Upload Image Preview */}
          {selectedImage && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                background: "var(--bg, #f8fafc)",
                border: "1.5px solid #6366f1",
                borderRadius: 10,
                marginBottom: 8,
                alignSelf: "flex-start",
              }}
            >
              <ImageIcon size={14} color="#6366f1" />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text, #1e293b)" }}>
                Image attached
              </span>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <X size={14} color="#ef4444" />
              </button>
            </div>
          )}

          {/* Input Box with Attachment Button */}
          <form
            onSubmit={handleSend}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingTop: 10,
              borderTop: "1.5px solid var(--border, #e2e8f0)",
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*"
              onChange={handleImageUpload}
            />

            <button
              type="button"
              className="td-btn ghost small"
              onClick={() => fileInputRef.current?.click()}
              title="Attach diagram, handwritten problem, or screenshot"
              style={{ padding: "10px 12px" }}
            >
              <Paperclip size={18} />
            </button>

            <input
              className="td-input"
              style={{ flex: 1, margin: 0, padding: "12px 16px", fontSize: "0.95rem" }}
              placeholder={
                selectedImage
                  ? "Add instructions for the image, or press Ask..."
                  : "Type doubt, paste code, or attach textbook snapshot..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />

            <button
              type="submit"
              className="td-btn"
              disabled={loading || (!input.trim() && !selectedImage)}
              style={{ padding: "12px 20px" }}
            >
              {loading ? <Loader2 size={16} className="sp-spin" /> : <Send size={16} />}
              Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  function renderSessionRow(s) {
    const isActive = s.id === activeSessionId;
    const isEditing = editingId === s.id;
    const isMenuOpen = menuOpenId === s.id;

    return (
      <div
        key={s.id}
        onClick={() => {
          if (!isEditing) {
            handleSelectSession(s.id);
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderRadius: 10,
          cursor: "pointer",
          background: isActive ? "rgba(99, 102, 241, 0.15)" : "transparent",
          border: isActive ? "1.5px solid #6366f1" : "1.5px solid transparent",
          position: "relative",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          <MessageSquare
            size={14}
            color={isActive ? "#6366f1" : "var(--muted, #64748b)"}
            style={{ flexShrink: 0 }}
          />

          {isEditing ? (
            <input
              autoFocus
              className="td-input"
              style={{ padding: "2px 6px", fontSize: "0.82rem", margin: 0, height: 26 }}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveRename(s.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              onBlur={() => handleSaveRename(s.id)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              style={{
                fontSize: "0.84rem",
                fontWeight: isActive ? 800 : 600,
                color: "var(--text, #1e293b)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s.title}
            </span>
          )}
        </div>

        <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setMenuOpenId(isMenuOpen ? null : s.id)}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted, #94a3b8)",
              cursor: "pointer",
              padding: "2px 4px",
              display: "flex",
              borderRadius: 4,
            }}
          >
            <MoreVertical size={14} />
          </button>

          {isMenuOpen && (
            <div
              ref={menuRef}
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                width: 140,
                background: "var(--surface, #ffffff)",
                border: "1.5px solid var(--border, #cbd5e1)",
                borderRadius: 10,
                boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                zIndex: 100,
                padding: "4px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <button
                type="button"
                onClick={() => handleTogglePin(s.id)}
                style={menuItemStyle}
              >
                {s.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                {s.pinned ? "Unpin" : "Pin Chat"}
              </button>

              <button
                type="button"
                onClick={() => handleStartRename(s)}
                style={menuItemStyle}
              >
                <Edit2 size={13} /> Rename
              </button>

              <button
                type="button"
                onClick={() => handleShareChat(s)}
                style={menuItemStyle}
              >
                <Share2 size={13} /> Share Chat
              </button>

              <button
                type="button"
                onClick={() => handleDeleteSession(s.id)}
                style={{ ...menuItemStyle, color: "#ef4444" }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 8px",
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "var(--text, #1e293b)",
  background: "none",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
};
