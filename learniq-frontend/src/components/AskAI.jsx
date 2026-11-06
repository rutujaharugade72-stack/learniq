import { useState } from "react";
import { Sparkles, Send, RefreshCw } from "lucide-react";
import { useAssistant } from "../context/AssistantContext";

const ALL_SUGGESTIONS = [
  "Explain Neural Networks",
  "What is Time Complexity?",
  "Help with Python Code",
  "How do I study for exams faster?",
  "Explain recursion with an example",
  "What is the difference between a list and a tuple?",
  "How does a database index work?",
  "Give me tips to remember formulas",
  "What is Object Oriented Programming?",
];

const PER_PAGE = 3;

export default function AskAI() {
  const [question, setQuestion] = useState("");
  const [page, setPage] = useState(0);
  const { askAssistant } = useAssistant();

  const totalPages = Math.ceil(ALL_SUGGESTIONS.length / PER_PAGE);
  const suggestions = ALL_SUGGESTIONS.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  const handleSend = () => {
    const q = question.trim();
    if (!q) return;
    askAssistant(q);
    setQuestion("");
  };

  return (
    <section className="ask-ai">
      <div className="ask-left">
        <h3>
          <Sparkles size={22} /> Ask AI Anything
        </h3>
        <p>
          Ask questions, get explanations, solve doubts and learn better with
          your AI companion.
        </p>
      </div>

      <div className="ask-right">
        <div className="ask-input">
          <input
            type="text"
            placeholder="Type your question here..."
            value={question}
            maxLength={500}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button className="send-btn" onClick={handleSend} aria-label="Send">
            <Send size={18} />
          </button>
        </div>

        <div className="chips">
          {suggestions.map((s) => (
            <button key={s} className="chip" onClick={() => askAssistant(s)}>
              {s}
            </button>
          ))}
          <button
            className="chip chip-more"
            onClick={() => setPage((p) => (p + 1) % totalPages)}
          >
            <RefreshCw size={12} /> More suggestions
          </button>
        </div>
      </div>
    </section>
  );
}