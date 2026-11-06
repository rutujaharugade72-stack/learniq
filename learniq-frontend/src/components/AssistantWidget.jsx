import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import Robot from "./Robot";
import { useAssistant } from "../context/AssistantContext";
import { useAuth } from "../context/AuthContext";
import "../assistant.css";

const WELCOME =
  "Hi! I am your AI Teacher. Ask me anything about what you are doing right now.";

// Live DOM scanner function: captures the actual screen content right at the moment of asking
function captureLiveScreenContext() {
  try {
    const pathname = window.location.pathname;

    // 1. Visible Headings
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
      .map((el) => el.innerText.trim())
      .filter((t) => t && t.length > 1 && !t.includes("AI Teacher"))
      .slice(0, 8);

    // 2. Visible Inputs, Placeholders, and Values
    const inputs = Array.from(document.querySelectorAll("input, select, textarea"))
      .filter((el) => !el.closest(".la-panel")) // Ignore AI Teacher chat input itself
      .map((el) => {
        const label =
          el.getAttribute("placeholder") ||
          el.getAttribute("aria-label") ||
          el.name ||
          el.id ||
          el.closest("label")?.innerText?.split("\n")[0]?.trim();
        const val = el.type === "password" ? "••••••" : el.value;
        return label ? `${label}: "${val || "empty"}"` : null;
      })
      .filter(Boolean)
      .slice(0, 10);

    // 3. Visible text snippet from main content area
    const contentArea =
      document.querySelector(".layout-content") ||
      document.querySelector("main") ||
      document.body;
    let snippet = "";
    if (contentArea) {
      // Clone and strip chat panel to avoid prompt loops
      const clone = contentArea.cloneNode(true);
      clone.querySelectorAll(".la-panel, script, style").forEach((n) => n.remove());
      snippet = (clone.innerText || "").replace(/\s+/g, " ").trim().slice(0, 1200);
    }

    return {
      path: pathname,
      headings,
      inputs,
      screenSnippet: snippet,
    };
  } catch {
    return { path: window.location.pathname, headings: [], inputs: [], screenSnippet: "" };
  }
}

export default function AssistantWidget() {
  const { activity, open, setOpen, pending, clearPending } = useAssistant();
  const { token } = useAuth();
  const [text, setText] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", text: WELCOME }]);
  const endRef = useRef(null);
  const handledRef = useRef(null);

  useEffect(() => {
    if (open && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, waiting, open]);

  // Sends one question to the AI Teacher with real-time page vision
  async function sendQuestion(question) {
    const history = messages
      .slice(1)
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setWaiting(true);

    // Capture real-time page snapshot at the exact moment user asks
    const liveScreen = captureLiveScreenContext();
    const effectivePage = activity?.page || liveScreen.path;
    const effectiveSummary =
      activity?.summary ||
      `Student is on ${liveScreen.path}. On screen: ${liveScreen.headings.slice(0, 3).join(", ")}`;

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          page: effectivePage,
          summary: effectiveSummary,
          details: {
            ...liveScreen,
            ...(activity?.details || {}),
          },
          history,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Something went wrong.");

      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: err.message || "I could not answer right now. Please try again.",
        },
      ]);
    } finally {
      setWaiting(false);
    }
  }

  // Handle questions dispatched from other buttons/pages
  useEffect(() => {
    if (!pending) return;
    if (handledRef.current === pending.id) return;
    handledRef.current = pending.id;
    const q = pending.text.slice(0, 500);
    clearPending();
    sendQuestion(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  function handleSend(e) {
    e.preventDefault();
    const question = text.trim();
    if (!question || waiting) return;
    setText("");
    sendQuestion(question);
  }

  // Derive readable status banner
  const activeRoute = window.location.pathname;
  const currentBadge =
    activity.summary ||
    (activeRoute === "/settings"
      ? "Settings & Student Passport"
      : activeRoute === "/notes"
      ? "Notes & Summary Generator"
      : activeRoute === "/quiz"
      ? "MCQ Generator & Practice"
      : activeRoute === "/materials"
      ? "Learning Materials Shelf"
      : activeRoute === "/planner"
      ? "Study Planner Timetable"
      : activeRoute === "/assignments"
      ? "Tasks & Assignments Checklist"
      : `Viewing ${activeRoute.replace("/", "") || "Dashboard"}`);

  return (
    <>
      {open && (
        <div className="la-panel" role="dialog" aria-label="AI Teacher">
          <div className="la-header">
            <div className="la-header-title">
              <Robot size={34} />
              <div>
                <strong>AI Teacher</strong>
                <span>Knows what you are doing</span>
              </div>
            </div>
            <button
              type="button"
              className="la-icon-btn"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              <X size={20} />
            </button>
          </div>

          <div className="la-context">
            <b>Active Page:</b> {currentBadge}
          </div>

          <div className="la-messages">
            {messages.map((m, i) => (
              <div key={i} className={`la-msg ${m.role}`}>
                {m.text}
              </div>
            ))}
            {waiting && (
              <div className="la-msg assistant la-typing">
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="la-form" onSubmit={handleSend}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask anything about this page..."
              maxLength={500}
            />
            <button type="submit" className="la-send" disabled={!text.trim() || waiting}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="la-fab"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close AI Teacher" : "Open AI Teacher"}
      >
        {open ? <X size={26} /> : <MessageCircle size={26} />}
      </button>
    </>
  );
}