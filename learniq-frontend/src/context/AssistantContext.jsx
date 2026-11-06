import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useLocation } from "react-router-dom";

const AssistantContext = createContext(null);

// Extracts the live text, inputs, and headings from the page right now
function getLiveDomSnapshot(pathname) {
  try {
    // 1. Gather all headings
    const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((el) => el.innerText.trim())
      .filter(Boolean)
      .slice(0, 8);

    // 2. Gather visible input labels & values
    const inputs = Array.from(document.querySelectorAll("input, select, textarea"))
      .map((el) => {
        const label =
          el.getAttribute("aria-label") ||
          el.getAttribute("placeholder") ||
          el.name ||
          el.id;
        const val = el.type === "password" ? "••••••" : el.value;
        return label ? `${label}: "${val || "empty"}"` : null;
      })
      .filter(Boolean)
      .slice(0, 10);

    // 3. Extract main content text (excluding scripts/styles)
    const mainArea = document.querySelector("main") || document.querySelector(".layout-content") || document.body;
    let text = mainArea.innerText || "";
    // Clean whitespace
    text = text.replace(/\s+/g, " ").trim().slice(0, 1500);

    return {
      path: pathname,
      headings,
      inputs,
      contentSnippet: text,
    };
  } catch {
    return { path: pathname, headings: [], inputs: [], contentSnippet: "" };
  }
}

export function AssistantProvider({ children }) {
  const location = useLocation();
  const [activity, setActivityState] = useState({
    page: location.pathname,
    summary: "Viewing " + location.pathname,
    details: {},
  });

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null);

  // Capture live page snapshot whenever location changes or user interacts
  const updateSnapshot = useCallback(() => {
    const snap = getLiveDomSnapshot(location.pathname);
    setActivityState((prev) => ({
      page: location.pathname,
      summary: `User is viewing route ${location.pathname} with headings: [${snap.headings.join(", ")}]`,
      details: snap,
    }));
  }, [location.pathname]);

  useEffect(() => {
    // Short timeout to allow page components to finish rendering DOM
    const t = setTimeout(updateSnapshot, 300);
    return () => clearTimeout(t);
  }, [location.pathname, updateSnapshot]);

  const setActivity = useCallback((next) => {
    setActivityState((prev) => ({
      ...prev,
      ...next,
      details: {
        ...prev.details,
        ...(next.details || {}),
      },
    }));
  }, []);

  const clearActivity = useCallback(() => {
    updateSnapshot();
  }, [updateSnapshot]);

  // When asking a question, refresh the live DOM snapshot right before sending
  const askAssistant = useCallback((text) => {
    const clean = String(text || "").trim();
    if (!clean) return;
    updateSnapshot();
    setOpen(true);
    setPending({ id: Date.now() + Math.random(), text: clean });
  }, [updateSnapshot]);

  const clearPending = useCallback(() => setPending(null), []);

  const value = useMemo(
    () => ({
      activity,
      setActivity,
      clearActivity,
      open,
      setOpen,
      pending,
      askAssistant,
      clearPending,
      updateSnapshot,
    }),
    [activity, setActivity, clearActivity, open, pending, askAssistant, clearPending, updateSnapshot]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used inside AssistantProvider");
  return ctx;
}

export function useReportActivity(customActivity) {
  const { setActivity, clearActivity } = useAssistant();
  const key = JSON.stringify(customActivity);

  useEffect(() => {
    setActivity(JSON.parse(key));
  }, [key, setActivity]);

  useEffect(() => () => clearActivity(), [clearActivity]);
}