import { useState, useEffect, useCallback, useRef } from "react";

import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Copy,
  Download,
  Check,
  Trash2,
  RotateCcw,
  Upload,
  Camera,
  History as HistoryIcon,
  Search,
  Play,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useReportActivity } from "../context/AssistantContext";
import * as activityModule from "../logActivity";
import Robot from "../components/Robot";
import { NoteTables, NoteCharts } from "../components/NoteExtras";
import "../notes.css";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
const logActivity = activityModule.logActivity || activityModule.default;

const LEVELS = {
  notes: ["Brief", "Standard", "Detailed"],
  summary: ["Short", "Medium", "Detailed"],
};
const DEFAULT_LEVEL = { notes: "Standard", summary: "Medium" };

const MODE_CARDS = [
  { id: "notes", emoji: "📝", title: "Notes", sub: "Headings, bullet points, key terms, comparison tables and revision checklist.", c: 1 },
  { id: "summary", emoji: "⚡", title: "Summary", sub: "A short paragraph and the key takeaways.", c: 3 },
];

const SOURCE_CARDS = [
  { id: "topic", emoji: "🔍", title: "Topic or Chapter", sub: "Enter your Board, Subject & Chapter — no file needed!", c: 5 },
  { id: "upload", emoji: "📎", title: "Upload file or photo", sub: "PDF, PPT, Word, TXT or a picture of your notes.", c: 2 },
  { id: "shelf", emoji: "📚", title: "My shelf", sub: "Use something you saved before.", c: 4 },
  { id: "paste", emoji: "✍️", title: "Paste text", sub: "Copy and paste from anywhere.", c: 0 },
];

const ALLOWED_EXT = [".pdf", ".pptx", ".docx", ".txt", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const OLD_FORMATS = {
  ".ppt": "Old .ppt files cannot be read. Please save it as .pptx and try again.",
  ".doc": "Old .doc files cannot be read. Please save it as .docx and try again.",
};
const ACCEPT = `${ALLOWED_EXT.join(",")},image/*`;
const MAX_MB = 10;

const TONE_ORDER = [0, 3, 1, 2, 4, 5];
const SECTION_EMOJI = ["📌", "💡", "🧠", "🔍", "📖", "🚀", "🎯", "🧩"];
const BOOK_EMOJI = ["📘", "📗", "📙", "📕", "📒", "📓"];

const LOAD_MESSAGES = [
  "Understanding your topic & syllabus...",
  "Structuring concepts and key definitions...",
  "Writing neat educational sections...",
  "Building comparison tables...",
  "Selecting key terms & flashcards...",
  "Creating the quick revision checklist...",
  "Almost there...",
];

const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  left: 3 + ((i * 37) % 94),
  delay: (i % 7) * 0.09,
  color: ["#7c5cf6", "#22c55e", "#f59e0b", "#ec4899", "#38bdf8"][i % 5],
  rotate: (i * 47) % 360,
}));

function clip(text, max) {
  const t = String(text ?? "");
  return t.length > max ? `${t.slice(0, max)}...` : t;
}

function asList(value) {
  return Array.isArray(value) ? value.filter((v) => v !== null && v !== undefined) : [];
}

function getExt(name) {
  const m = /\.[a-z0-9]+$/i.exec(String(name || ""));
  return m ? m[0].toLowerCase() : "";
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function bookIndex(id) {
  return [...String(id)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 6;
}

function resultToText(data) {
  const r = data.result || {};
  const lines = [];
  lines.push(data.title || "Notes");
  lines.push("=".repeat(Math.min(40, (data.title || "Notes").length)));
  lines.push("");

  if (data.mode === "summary") {
    if (r.summary) lines.push(r.summary, "");
    const takeaways = asList(r.key_takeaways);
    if (takeaways.length) {
      lines.push("Key takeaways");
      takeaways.forEach((t) => lines.push(`- ${t}`));
    }
    return lines.join("\n");
  }

  if (r.overview) lines.push(r.overview, "");
  asList(r.sections).forEach((s) => {
    lines.push(String(s.heading || "").toUpperCase());
    asList(s.points).forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  });
  asList(r.tables).forEach((t) => {
    lines.push(String(t.title || "").toUpperCase());
    lines.push(asList(t.columns).join(" | "));
    asList(t.rows).forEach((row) => lines.push(asList(row).join(" | ")));
    lines.push("");
  });
  asList(r.charts).forEach((c) => {
    lines.push(String(c.title || "").toUpperCase());
    asList(c.items).forEach((it) =>
      lines.push(`- ${it.label}: ${it.value}${c.unit ? ` ${c.unit}` : ""}`)
    );
    lines.push("");
  });
  const terms = asList(r.key_terms);
  if (terms.length) {
    lines.push("KEY TERMS");
    terms.forEach((t) => lines.push(`- ${t.term}: ${t.meaning}`));
    lines.push("");
  }
  const revision = asList(r.quick_revision);
  if (revision.length) {
    lines.push("QUICK REVISION");
    revision.forEach((p) => lines.push(`- ${p}`));
  }
  return lines.join("\n");
}

function ResultView({ data, ticked, onTick, flipped, onFlip }) {
  const r = data.result || {};

  if (data.mode === "summary") {
    const takeaways = asList(r.key_takeaways);
    return (
      <>
        {r.summary && <p className="nl-paper">{r.summary}</p>}
        {takeaways.length > 0 && (
          <div>
            <h4 className="nl-block-title">🔑 Key takeaways</h4>
            <ol className="nl-takes">
              {takeaways.map((t, i) => (
                <li
                  key={i}
                  className={`nl-take nl-c-${TONE_ORDER[i % 6]}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 0.07}s` }}
                >
                  <span className="nl-take-num">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </>
    );
  }

  const sections = asList(r.sections);
  const terms = asList(r.key_terms);
  const revision = asList(r.quick_revision);

  return (
    <>
      {r.overview && <p className="nl-overview">{r.overview}</p>}

      {sections.length > 0 && (
        <div className="nl-grid">
          {sections.map((s, i) => (
            <div
              className={`nl-card nl-c-${TONE_ORDER[i % 6]}`}
              key={i}
              style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}
            >
              <div className="nl-card-head">
                <span className="nl-card-emoji">{SECTION_EMOJI[i % SECTION_EMOJI.length]}</span>
                <h4>{s.heading}</h4>
              </div>
              <ul className="nl-points">
                {asList(s.points).map((p, j) => (
                  <li key={j}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <NoteTables tables={r.tables} />
      <NoteCharts charts={r.charts} />

      {terms.length > 0 && (
        <div>
          <h4 className="nl-block-title">🃏 Key terms</h4>
          <p className="nl-block-help">Tap a card to see the meaning.</p>
          <div className="nl-flips">
            {terms.map((t, i) => (
              <button
                type="button"
                key={i}
                className={`nl-flip nl-c-${TONE_ORDER[(i + 2) % 6]} ${flipped[i] ? "flipped" : ""}`}
                onClick={() => onFlip(i)}
                aria-pressed={Boolean(flipped[i])}
              >
                <span className="nl-flip-inner">
                  <span className="nl-flip-face nl-flip-front">
                    <small>Tap to flip</small>
                    <strong>{t.term}</strong>
                  </span>
                  <span className="nl-flip-face nl-flip-back">{t.meaning}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {revision.length > 0 && (
        <div className="nl-revision">
          <div className="nl-rev-head">
            <h4>
              <Sparkles size={22} /> Quick revision
            </h4>
            <span className="nl-rev-count">
              {ticked.length}/{revision.length} remembered
            </span>
          </div>
          <p className="nl-block-help">Tick each one when you remember it.</p>
          <ul className="nl-rev-list">
            {revision.map((p, i) => {
              const done = ticked.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={`nl-rev-item ${done ? "done" : ""}`}
                    onClick={() => onTick(i)}
                    aria-pressed={done}
                  >
                    <span className="nl-rev-box">{done && <Check size={16} />}</span>
                    <span className="nl-rev-text">{p}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

export default function Notes() {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [view, setView] = useState("new");
  const [mode, setMode] = useState(params.get("mode") === "summary" ? "summary" : "notes");
  const [level, setLevel] = useState(
    params.get("mode") === "summary" ? DEFAULT_LEVEL.summary : "Detailed"
  );
  const [source, setSource] = useState("topic");

  // Topic search fields
  const [topicBoard, setTopicBoard] = useState("");
  const [topicSubject, setTopicSubject] = useState("");
  const [topicChapter, setTopicChapter] = useState("");

  const [title, setTitle] = useState("");
  const [pastedText, setPastedText] = useState("");

  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialId, setMaterialId] = useState("");
  const [headings, setHeadings] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState([]);
  const [headingsLoading, setHeadingsLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");
  const [dragging, setDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadIndex, setLoadIndex] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [ticked, setTicked] = useState([]);
  const [flipped, setFlipped] = useState({});
  const [celebrate, setCelebrate] = useState(false);

  const [myNotes, setMyNotes] = useState([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myError, setMyError] = useState("");

  const autoHandledRef = useRef(false);
  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const wanted = params.get("mode") === "summary" ? "summary" : "notes";
    setMode(wanted);
    setLevel(wanted === "summary" ? DEFAULT_LEVEL.summary : "Detailed");
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/materials", { headers: authHeaders });
        const data = await readJson(res);
        if (!res.ok) throw new Error(data.error || "Could not load your materials");
        if (!cancelled) setMaterials(Array.isArray(data.materials) ? data.materials : []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setHeadings([]);
    setSelectedIdx([]);
    if (!materialId) return;
    let cancelled = false;
    async function load() {
      setHeadingsLoading(true);
      try {
        const res = await fetch(`/api/materials/${materialId}`, { headers: authHeaders });
        const data = await readJson(res);
        if (!res.ok) throw new Error(data.error || "Could not open this material");
        if (!cancelled) {
          const list = Array.isArray(data.sections) ? data.sections.map((s) => s.heading) : [];
          setHeadings(list);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setHeadingsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [materialId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMyNotes = useCallback(async () => {
    setMyLoading(true);
    setMyError("");
    try {
      const res = await fetch("/api/notes/mine", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Could not load your notes");
      setMyNotes(Array.isArray(data.notes) ? data.notes : []);
      return data.notes || [];
    } catch (err) {
      setMyError(err.message);
      return [];
    } finally {
      setMyLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (view === "mine") loadMyNotes();
  }, [view, loadMyNotes]);

  // Handle generation when coming from the study planner
  useEffect(() => {
    const autoTopic = location.state?.autoTopic;
    if (!autoTopic || autoHandledRef.current || !token) return;
    autoHandledRef.current = true;

    async function handleAuto() {
      const parentSubject = location.state?.subject || "";
      const displayTitle = parentSubject ? `${parentSubject}: ${autoTopic}` : autoTopic;

      setLoading(true);
      setError("");

      const promptText = `ACADEMIC STUDY GUIDE & COMPREHENSIVE NOTES
Subject / Domain: ${parentSubject || "Engineering / Science"}
Topic: ${autoTopic}

Generate complete, multi-section academic notes with definitions, architectural/procedural breakdowns, comparisons, examples, key terms, and revision points.`;

      try {
        const studyRes = await fetch("/api/notes/study", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            mode: "notes",
            level: "Detailed",
            title: displayTitle,
            text: promptText,
          }),
        });

        const studyData = await readJson(studyRes);
        if (!studyRes.ok) throw new Error(studyData.error || studyData.message || "Could not generate notes");

        showResult(studyData);

        if (typeof logActivity === "function") {
          logActivity(token, {
            type: "notes_created",
            title: `Notes: ${clip(studyData.title, 60)}`,
            description: `Study notes for ${displayTitle}`,
            link: "/notes",
          });
        }
      } catch (err) {
        setError(err.message);
        setSource("topic");
        setTopicSubject(parentSubject);
        setTopicChapter(autoTopic);
      } finally {
        setLoading(false);
      }
    }

    handleAuto();
  }, [location.state, token]);

  useEffect(() => {
    if (!loading) return;
    setLoadIndex(0);
    const id = setInterval(
      () => setLoadIndex((i) => Math.min(i + 1, LOAD_MESSAGES.length - 1)),
      3500
    );
    return () => clearInterval(id);
  }, [loading]);

  const revisionCount =
    result && result.mode !== "summary" ? asList(result.result && result.result.quick_revision).length : 0;
  useEffect(() => {
    if (revisionCount > 0 && ticked.length === revisionCount) {
      setCelebrate(true);
      const id = setTimeout(() => setCelebrate(false), 3200);
      return () => clearTimeout(id);
    }
  }, [ticked.length, revisionCount]);

  const activity = result
    ? {
        page: "Notes",
        summary: `Reading ${result.mode === "summary" ? "a summary" : "notes"}: ${clip(result.title, 60)}`,
        details: {
          mode: result.mode,
          level: result.level,
          title: clip(result.title, 80),
          content: clip(resultToText(result), 1500),
        },
      }
    : {
        page: "Notes",
        summary: view === "mine" ? "Looking at my saved notes" : `Setting up ${mode === "summary" ? "a summary" : "notes"}`,
        details: { mode },
      };
  useReportActivity(activity);

  function showResult(data) {
    setResult(data);
    setTicked([]);
    setFlipped({});
    setCelebrate(false);
    setCopied(false);
  }

  function changeMode(next) {
    setMode(next);
    setLevel(next === "summary" ? DEFAULT_LEVEL.summary : "Detailed");
    setError("");
  }

  function changeSource(next) {
    setSource(next);
    setMaterialId("");
    setError("");
    setUploadError("");
    setUploadNotice("");
  }

  function toggleSection(i) {
    setSelectedIdx((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  function toggleAllSections() {
    setSelectedIdx((prev) => (prev.length === headings.length ? [] : headings.map((_, i) => i)));
  }

  function toggleTick(i) {
    setTicked((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  function toggleFlip(i) {
    setFlipped((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  async function uploadFile(picked) {
    setUploadError("");
    setUploadNotice("");
    setError("");
    if (!picked) return;

    const ext = getExt(picked.name);
    if (OLD_FORMATS[ext]) {
      setUploadError(OLD_FORMATS[ext]);
      return;
    }
    if (!ALLOWED_EXT.includes(ext)) {
      setUploadError("Oops! Please choose a PDF, PPTX, DOCX, TXT or a photo (JPG, PNG, WEBP).");
      return;
    }
    if (picked.size > MAX_MB * 1024 * 1024) {
      setUploadError(`This file is too big (maximum ${MAX_MB} MB).`);
      return;
    }

    setUploading(true);
    setUploadName(picked.name);
    setMaterialId("");

    try {
      const formData = new FormData();
      formData.append("title", picked.name.replace(/\.[a-z0-9]+$/i, ""));
      formData.append("file", picked);

      const res = await fetch("/api/materials/upload", {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const m = data.material;
      setMaterials((prev) => [m, ...prev]);
      setMaterialId(String(m.id));
      setUploadNotice(
        data.truncated
          ? "Saved! This file was very long, so only the first part was kept."
          : `Saved to your shelf and ready to use! (${m.sectionCount} sections found)`
      );

      if (typeof logActivity === "function") {
        logActivity(token, {
          type: "material_uploaded",
          title: `Uploaded: ${clip(m.title, 60)}`,
          description: `${m.sectionCount} sections`,
          link: "/materials",
        });
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e) {
    uploadFile(e.target.files[0]);
    e.target.value = "";
  }

  function handleDragOver(e) {
    e.preventDefault();
    if (!dragging) setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    uploadFile(e.dataTransfer.files[0]);
  }

  const canGenerate =
    source === "topic"
      ? topicChapter.trim().length > 0 || topicSubject.trim().length > 0
      : source === "paste"
      ? pastedText.trim().length >= 50
      : materialId !== "" && !headingsLoading && !uploading;

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setCopied(false);

    let generatedTitle = title.trim();
    let payloadText = "";

    if (source === "topic") {
      const parts = [
        topicBoard.trim() && `Board/Grade: ${topicBoard.trim()}`,
        topicSubject.trim() && `Subject: ${topicSubject.trim()}`,
        topicChapter.trim() && `Chapter/Topic: ${topicChapter.trim()}`,
      ].filter(Boolean);

      payloadText = `SYLLABUS STUDY GUIDE & EXHAUSTIVE NOTES
${parts.join("\n")}

Provide complete, high-yield academic study notes covering the full syllabus of this chapter/topic thoroughly, including definitions, architectural/process diagrams in text, types, comparisons, formulas/reactions/code, and exam checklist.`;

      if (!generatedTitle) {
        generatedTitle = [topicSubject.trim(), topicChapter.trim()].filter(Boolean).join(" - ") || topicBoard.trim() || "Study Notes";
      }
    } else if (source === "paste") {
      payloadText = pastedText;
    }

    const payload = {
      mode,
      level,
      title: generatedTitle,
      text: payloadText,
    };

    if (source !== "paste" && source !== "topic") {
      payload.materialId = materialId;
      if (selectedIdx.length > 0) payload.sectionIndexes = [...selectedIdx].sort((a, b) => a - b);
    }

    try {
      const res = await fetch("/api/notes/study", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || data.message || "Could not make your notes");

      showResult(data);

      if (typeof logActivity === "function") {
        logActivity(token, {
          type: data.mode === "summary" ? "summary_created" : "notes_created",
          title: `${data.mode === "summary" ? "Summary" : "Notes"}: ${clip(data.title, 60)}`,
          description: `${data.level} ${data.mode === "summary" ? "summary" : "notes"}`,
          link: "/notes",
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleStartPractice() {
    if (!result) return;
    const cleanTitle = result.title.replace(/^Notes:\s*/i, "");
    const parts = cleanTitle.includes(":") ? cleanTitle.split(":") : cleanTitle.split("-");
    const subject = parts.length > 1 ? parts[0].trim() : cleanTitle;
    const subtopic = parts.length > 1 ? parts.slice(1).join("-").trim() : cleanTitle;

    const matchedMaterialId = result.materialId || (source !== "paste" && source !== "topic" ? materialId : null);

    navigate("/quiz", {
      state: {
        practice: {
          subject,
          subtopic,
          materialId: matchedMaterialId || null,
        },
      },
    });
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(resultToText(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Try the Download button instead.");
    }
  }

  async function handleDownload() {
    if (!result) return;
    try {
      const { downloadNotesPdf } = await import("../notesPdf");
      downloadNotesPdf(result);
    } catch (err) {
      console.error("PDF download failed:", err);
      setError("Could not make the PDF. Please try again.");
    }
  }

  async function handleOpenSaved(id) {
    setMyError("");
    try {
      const res = await fetch(`/api/notes/mine/${id}`, { headers: authHeaders });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Could not open this note");
      showResult(data);
      setError("");
    } catch (err) {
      setMyError(err.message);
    }
  }

  async function handleDeleteSaved(id) {
    const ok = window.confirm("Delete this saved note? This cannot be undone.");
    if (!ok) return;
    setMyError("");
    try {
      const res = await fetch(`/api/notes/mine/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Could not delete this note");
      setMyNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setMyError(err.message);
    }
  }

  function handleNew() {
    setResult(null);
    setError("");
    setCopied(false);
    setTicked([]);
    setFlipped({});
    setCelebrate(false);
  }

  const uploadIsPhoto = IMAGE_EXT.includes(getExt(uploadName));
  let mood = "idle";
  let speech = "Pick what you want to study!";
  if (loading) {
    mood = "busy";
    speech = LOAD_MESSAGES[loadIndex];
  } else if (uploading) {
    mood = "busy";
    speech = uploadIsPhoto ? "Reading the text in your photo..." : "Reading your file...";
  } else if (dragging) {
    mood = "excited";
    speech = "Ooh! Drop it right here!";
  } else if (celebrate) {
    mood = "happy";
    speech = "You remembered everything! Amazing!";
  } else if (result) {
    mood = "happy";
    speech = result.mode === "summary" ? "Here is your summary!" : "Done! Tap the term cards to flip them.";
  } else if (error || uploadError || myError) {
    mood = "sad";
    speech = "Hmm, that did not work. Let us try again!";
  } else if (view === "mine") {
    speech = "Open any old note. No AI needed!";
  } else if (uploadNotice) {
    mood = "happy";
    speech = "Got it! Now press the big button.";
  }

  const showForm = view === "new" && !result && !loading;
  const showSections = source !== "paste" && source !== "topic" && materialId && headings.length > 0;

  return (
    <div className="nl-page">
      {celebrate && (
        <div className="nl-confetti" aria-hidden="true">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              style={{
                left: `${c.left}%`,
                animationDelay: `${c.delay}s`,
                background: c.color,
                "--r": `${c.rotate}deg`,
              }}
            />
          ))}
        </div>
      )}

      {result ? (
        <button type="button" className="nl-back" onClick={handleNew}>
          <ArrowLeft size={16} /> Back
        </button>
      ) : (
        <Link className="nl-back" to="/">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
      )}

      {/* Hero Banner */}
      <section className="nl-hero">
        <div className="nl-hero-text">
          <span className="nl-tag">
            <Sparkles size={14} /> Study lab
          </span>
          <h2>
            {result
              ? `Your ${result.mode === "summary" ? "summary" : "notes"} are ready!`
              : view === "mine"
              ? "Your saved notes"
              : "Notes and summaries"}
          </h2>
          <p>
            {view === "mine" && !result
              ? "Open an old note or summary. No AI needed."
              : "Search any curriculum chapter, or turn any file, photo or text into clean notes."}
          </p>
        </div>
        <div className="nl-hero-bot">
          <div className={`nl-bubble ${mood}`} key={speech}>
            {speech}
          </div>
          <div className={`nl-robot ${mood}`}>
            <Robot size={96} />
          </div>
        </div>
      </section>

      {/* Result Display */}
      {result && (
        <>
          <div className="nl-result-head">
            <div>
              <h3 className="nl-title">{result.title}</h3>
              <div className="nl-chips">
                <span className="nl-chip">{result.mode === "summary" ? "⚡ Summary" : "📝 Notes"}</span>
                {result.level && <span className="nl-chip">{result.level}</span>}
                {result.materialTitle && <span className="nl-chip">📚 {result.materialTitle}</span>}
              </div>
            </div>
            <div className="nl-toolbar">
              <button type="button" className="nl-btn ghost small" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied!" : "Copy"}
              </button>
              <button type="button" className="nl-btn ghost small" onClick={handleDownload}>
                <Download size={16} /> Download PDF
              </button>
            </div>
          </div>

          {result.truncated && (
            <p className="nl-warn">
              Only the first part of your text was used, because the AI reads about 12,000 characters
              at a time.
            </p>
          )}

          {error && <div className="nl-error">{error}</div>}

          <ResultView
            data={result}
            ticked={ticked}
            onTick={toggleTick}
            flipped={flipped}
            onFlip={toggleFlip}
          />

          <div className="nl-actions">
            <button type="button" className="nl-btn go" onClick={handleStartPractice}>
              <Play size={18} /> Test Yourself on this Topic
            </button>
            <button type="button" className="nl-btn" onClick={handleNew}>
              <RotateCcw size={18} /> Make another
            </button>
            <Link className="nl-btn ghost" to="/">
              Dashboard
            </Link>
          </div>
        </>
      )}

      {/* Tabs */}
      {!result && !loading && (
        <div className="nl-tabs">
          <button
            type="button"
            className={`nl-tab ${view === "new" ? "active" : ""}`}
            onClick={() => setView("new")}
          >
            <Sparkles size={18} /> Make new
          </button>
          <button
            type="button"
            className={`nl-tab ${view === "mine" ? "active" : ""}`}
            onClick={() => setView("mine")}
          >
            <HistoryIcon size={18} /> My notes
          </button>
        </div>
      )}

      {/* Loading Display */}
      {view === "new" && !result && loading && (
        <div className="nl-loading">
          <h3>Making your comprehensive {mode === "summary" ? "summary" : "notes"}...</h3>
          <div className="nl-progress" aria-hidden="true">
            <span />
          </div>
          <p>Generating definitions, multi-card sections, tables & revision checklist. Stay on this page!</p>
        </div>
      )}

      {/* Saved Notes List */}
      {view === "mine" && !result && (
        <div className="nl-list">
          {myLoading && (
            <p className="nl-note">
              <Loader2 className="nl-spin" size={14} /> Loading your notes...
            </p>
          )}
          {myError && <div className="nl-error">{myError}</div>}
          {!myLoading && myNotes.length === 0 && !myError && (
            <p className="nl-empty">
              📭 Nothing saved yet. Make your first notes or summary and it will show up here.
            </p>
          )}
          {myNotes.map((n, i) => (
            <div className="nl-item" key={n.id}>
              <button
                type="button"
                className={`nl-item-main nl-c-${TONE_ORDER[i % 6]}`}
                onClick={() => handleOpenSaved(n.id)}
              >
                <span className="nl-item-icon">{n.mode === "summary" ? "⚡" : "📝"}</span>
                <span className="nl-item-text">
                  <strong>{n.title}</strong>
                  <small>
                    {n.mode === "summary" ? "Summary" : "Notes"} · {n.level}
                    {n.materialTitle ? ` · ${n.materialTitle}` : ""} ·{" "}
                    {new Date(n.createdAt).toLocaleDateString()}
                  </small>
                </span>
              </button>
              <button
                type="button"
                className="nl-delete"
                onClick={() => handleDeleteSaved(n.id)}
                aria-label="Delete this note"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <p className="nl-note">Your latest 30 are kept. The oldest one is removed after that.</p>
        </div>
      )}

      {/* Generation Form */}
      {showForm && (
        <form className="nl-form" onSubmit={handleGenerate}>
          {/* Step 1 */}
          <section className="nl-step">
            <div className="nl-step-head">
              <span className="nl-step-num nl-c-1">1</span>
              <h3 className="nl-step-title">What do you want?</h3>
            </div>
            <div className="nl-picks">
              {MODE_CARDS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={`nl-pick nl-c-${m.c} ${mode === m.id ? "active" : ""}`}
                  onClick={() => changeMode(m.id)}
                  aria-pressed={mode === m.id}
                >
                  <span className="nl-pick-check">
                    <Check size={14} />
                  </span>
                  <span className="nl-pick-emoji">{m.emoji}</span>
                  <span className="nl-pick-title">{m.title}</span>
                  <span className="nl-pick-sub">{m.sub}</span>
                </button>
              ))}
            </div>
            <div className="nl-levels">
              <span className="nl-levels-label">{mode === "summary" ? "How long?" : "Detail level:"}</span>
              {LEVELS[mode].map((l) => (
                <button
                  type="button"
                  key={l}
                  className={`nl-level ${level === l ? "active" : ""}`}
                  onClick={() => setLevel(l)}
                  aria-pressed={level === l}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          {/* Step 2 */}
          <section className="nl-step">
            <div className="nl-step-head">
              <span className="nl-step-num nl-c-2">2</span>
              <h3 className="nl-step-title">Where is your material?</h3>
            </div>
            <div className="nl-picks">
              {SOURCE_CARDS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className={`nl-pick nl-c-${s.c} ${source === s.id ? "active" : ""}`}
                  onClick={() => changeSource(s.id)}
                  aria-pressed={source === s.id}
                >
                  <span className="nl-pick-check">
                    <Check size={14} />
                  </span>
                  <span className="nl-pick-emoji">{s.emoji}</span>
                  <span className="nl-pick-title">{s.title}</span>
                  <span className="nl-pick-sub">{s.sub}</span>
                </button>
              ))}
            </div>

            {/* Option A: Search by Topic / Syllabus */}
            {source === "topic" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label className="nl-field" style={{ margin: 0 }}>
                    Board or Standard (Optional)
                    <input
                      value={topicBoard}
                      onChange={(e) => setTopicBoard(e.target.value)}
                      placeholder="e.g. Maharashtra State Board 10th / Mumbai University BE"
                    />
                  </label>
                  <label className="nl-field" style={{ margin: 0 }}>
                    Subject
                    <input
                      value={topicSubject}
                      onChange={(e) => setTopicSubject(e.target.value)}
                      placeholder="e.g. Science Part 1 / Software Testing"
                      required
                    />
                  </label>
                </div>
                <label className="nl-field" style={{ margin: 0 }}>
                  Chapter Name or Specific Topic
                  <input
                    value={topicChapter}
                    onChange={(e) => setTopicChapter(e.target.value)}
                    placeholder="e.g. Chapter 3: Chemical Reactions and Equations / Verification & Validation"
                    required
                  />
                </label>
                <small style={{ color: "#64748b" }}>
                  💡 The AI references official curriculum textbooks to build your notes. No file needed.
                </small>
              </div>
            )}

            {/* Option B: Upload */}
            {source === "upload" && (
              <div className="nl-upload">
                <label
                  className={`nl-drop ${dragging ? "over" : ""} ${materialId ? "has-file" : ""} ${uploading ? "busy" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <span className="nl-drop-icon">
                    {uploading ? <Loader2 className="nl-spin" size={28} /> : <Upload size={28} />}
                  </span>
                  <span className="nl-drop-text">
                    {uploading ? (
                      <>
                        <strong>Reading {uploadName}...</strong>
                        <small>Photos can take a few seconds more.</small>
                      </>
                    ) : materialId ? (
                      <>
                        <strong>{uploadName}</strong>
                        <small>Tap to choose a different file</small>
                      </>
                    ) : (
                      <>
                        <strong>Drag a file here, or tap to choose</strong>
                        <small>From your phone or laptop (up to {MAX_MB} MB)</small>
                      </>
                    )}
                  </span>
                  <input
                    type="file"
                    accept={ACCEPT}
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>

                <div className="nl-upload-row">
                  <label className="nl-btn ghost small nl-camera">
                    <Camera size={16} /> Take a photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                  </label>
                  <div className="nl-types">
                    {["PDF", "PPTX", "DOCX", "TXT", "JPG", "PNG", "WEBP"].map((t) => (
                      <span className="nl-type" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {uploadError && <div className="nl-error">{uploadError}</div>}
                {uploadNotice && <div className="nl-notice">{uploadNotice}</div>}
              </div>
            )}

            {/* Option C: Shelf */}
            {source === "shelf" && (
              <>
                {materialsLoading && (
                  <p className="nl-note">
                    <Loader2 className="nl-spin" size={14} /> Loading your shelf...
                  </p>
                )}
                {!materialsLoading && materials.length === 0 && (
                  <p className="nl-empty">
                    📚 Your shelf is empty. Choose <strong>Upload file or photo</strong> or <strong>Topic or Chapter</strong> above.
                  </p>
                )}
                {materials.length > 0 && (
                  <div className="nl-shelf">
                    {materials.map((m) => {
                      const idx = bookIndex(m.id);
                      return (
                        <button
                          type="button"
                          key={m.id}
                          className={`nl-book nl-c-${TONE_ORDER[idx]} ${String(m.id) === materialId ? "active" : ""}`}
                          onClick={() => setMaterialId(String(m.id))}
                          aria-pressed={String(m.id) === materialId}
                        >
                          <span className="nl-book-emoji">{BOOK_EMOJI[idx]}</span>
                          <span className="nl-book-title">{m.title}</span>
                          <span className="nl-book-meta">{m.sectionCount} sections</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {showSections && (
              <div>
                <div className="nl-sec-head">
                  <p>Pick sections, or leave all empty to use the whole material:</p>
                  <button type="button" className="nl-link" onClick={toggleAllSections}>
                    {selectedIdx.length === headings.length ? "Unselect all" : "Select all"}
                  </button>
                </div>
                <div className="nl-sec-chips">
                  {headings.map((h, i) => (
                    <button
                      type="button"
                      key={i}
                      title={h}
                      className={`nl-sec-chip ${selectedIdx.includes(i) ? "on" : ""}`}
                      onClick={() => toggleSection(i)}
                      aria-pressed={selectedIdx.includes(i)}
                    >
                      {selectedIdx.includes(i) ? "✓ " : ""}
                      {clip(h, 60)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Option D: Paste */}
            {source === "paste" && (
              <label className="nl-field">
                Paste your text (at least a few sentences)
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste a chapter, class notes or any study text here..."
                />
                <span className="nl-counter">
                  {pastedText.trim().length} characters (need at least 50)
                </span>
              </label>
            )}
          </section>

          {/* Step 3 */}
          <section className="nl-step">
            <div className="nl-step-head">
              <span className="nl-step-num nl-c-0">3</span>
              <h3 className="nl-step-title">Make it!</h3>
            </div>
            <label className="nl-field">
              Give it a custom name (optional)
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Science Chapter 3 Notes"
                maxLength={120}
              />
            </label>

            {error && <div className="nl-error">{error}</div>}

            <button type="submit" className="nl-btn go" disabled={loading || !canGenerate}>
              <Sparkles size={20} /> {mode === "summary" ? "Make my summary" : "Make my notes"}
            </button>
          </section>
        </form>
      )}
    </div>
  );
}