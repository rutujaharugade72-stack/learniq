import { Link } from "react-router-dom";
import {
  Bot,
  ListChecks,
  CalendarDays,
  NotebookPen,
  FileText,
  Brain,
} from "lucide-react";
import { useAssistant } from "../context/AssistantContext";

const agents = [
  {
    kind: "chat",
    title: "AI Teacher",
    tone: "purple",
    icon: Bot,
    desc: "Ask doubts and get simple explanations",
    cta: "Chat Now",
  },
  {
    kind: "link",
    to: "/quiz",
    title: "MCQ Generator",
    tone: "green",
    icon: ListChecks,
    desc: "Generate MCQs from any topic or notes",
    cta: "Generate",
  },
  {
    kind: "link",
    to: "/why-stuck",
    title: "Why Am I Stuck?",
    tone: "amber",
    icon: Brain,
    desc: "Find your weak spots and fix them",
    cta: "Analyze",
  },
  {
    kind: "link",
    to: "/planner",
    title: "Study Planner",
    tone: "blue",
    icon: CalendarDays,
    desc: "Turn your weak topics into a daily plan",
    cta: "Plan my study",
  },
  {
    kind: "link",
    to: "/notes",
    title: "Notes Assistant",
    tone: "pink",
    icon: NotebookPen,
    desc: "Create, organize & improve your notes",
    cta: "Make notes",
  },
  {
    kind: "link",
    to: "/notes?mode=summary",
    title: "Summarizer",
    tone: "teal",
    icon: FileText,
    desc: "Summarize long content quickly",
    cta: "Summarize",
  },
];

const buttonReset = {
  border: 0,
  font: "inherit",
  cursor: "pointer",
  width: "100%",
};

const soonStyle = {
  opacity: 0.55,
  cursor: "not-allowed",
  pointerEvents: "none",
};

export default function AgentCards() {
  const { setOpen } = useAssistant();

  return (
    <section id="agents" style={{ width: "100%", margin: "16px 0" }}>
      <div className="section-head" style={{ marginBottom: "12px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>AI Learning Agents</h3>
      </div>

      {/* Force strict 6-column single row layout */}
      <div
        className="agent-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: "12px",
          width: "100%",
        }}
      >
        {agents.map(({ kind, to, title, tone, icon: Icon, desc, cta }) => (
          <div
            key={title}
            className={`agent-card tone-${tone}`}
            style={{
              minWidth: 0,
              padding: "16px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div className="agent-icon" style={{ marginBottom: "10px" }}>
              <Icon size={24} />
            </div>
            <h4
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                margin: "0 0 4px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                width: "100%",
              }}
            >
              {title}
            </h4>
            <p
              style={{
                fontSize: "0.72rem",
                lineHeight: 1.3,
                margin: "0 0 12px",
                flex: 1,
              }}
            >
              {desc}
            </p>

            {kind === "chat" && (
              <button
                type="button"
                className="agent-btn"
                style={{ ...buttonReset, fontSize: "0.75rem", padding: "6px 8px" }}
                onClick={() => setOpen(true)}
              >
                {cta}
              </button>
            )}

            {kind === "link" && (
              <Link
                to={to}
                className="agent-btn"
                style={{ width: "100%", fontSize: "0.75rem", padding: "6px 8px", textAlign: "center" }}
              >
                {cta}
              </Link>
            )}

            {kind === "soon" && (
              <span
                className="agent-btn"
                style={{ ...soonStyle, width: "100%", fontSize: "0.75rem", padding: "6px 8px", textAlign: "center" }}
                aria-disabled="true"
              >
                {cta}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}