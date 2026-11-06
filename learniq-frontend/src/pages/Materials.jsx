import { useEffect, useState } from "react";
import { Library, Upload, FileText, Trash2, Loader2, Clock, Layers, CalendarDays } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Robot from "../components/Robot";
import "../materials.css";

const SHELF_LIMIT = 10;

const TONES = ["purple", "green", "blue", "amber", "pink", "teal"];
const EMOJIS = ["📘", "📗", "📙", "📕", "📒", "📓"];

const MAX_FILE_MB = 10;
const DOC_EXTENSIONS = [".pdf", ".pptx", ".docx", ".txt"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const OLD_FORMATS = {
  ".ppt": "Old .ppt files cannot be read. Please save it as .pptx and try again.",
  ".doc": "Old .doc files cannot be read. Please save it as .docx and try again.",
};
const ACCEPT = [...DOC_EXTENSIONS, ...IMAGE_EXTENSIONS].join(",");

function extensionOf(name) {
  const match = /\.[a-z0-9]+$/i.exec(String(name || ""));
  return match ? match[0].toLowerCase() : "";
}

function kindOf(name) {
  const ext = extensionOf(name);
  if (ext === ".pdf") return "PDF";
  if (ext === ".pptx") return "Slides";
  if (ext === ".docx") return "Word";
  if (ext === ".txt") return "Text";
  if (IMAGE_EXTENSIONS.includes(ext)) return "Photo";
  return "File";
}

function checkPicked(file, shelfCount, shelfLimit) {
  const ext = extensionOf(file.name);
  if (OLD_FORMATS[ext]) return OLD_FORMATS[ext];
  if (!DOC_EXTENSIONS.includes(ext) && !IMAGE_EXTENSIONS.includes(ext)) {
    return "Oops! I cannot read that kind of file. Use a PDF, PPTX, DOCX, TXT or a photo (JPG, PNG, WEBP).";
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `This file is too big (maximum ${MAX_FILE_MB} MB).`;
  }
  if (shelfCount >= shelfLimit) {
    return `Your shelf is full (${shelfLimit} materials). Delete one to add a new one.`;
  }
  return "";
}

function readingSteps(kind) {
  if (kind === "Photo") {
    return [
      "Looking at your photo...",
      "Reading the text in it...",
      "Finding the headings...",
      "Saving it to your shelf...",
    ];
  }
  if (kind === "Slides") {
    return [
      "Opening your slides...",
      "Reading slide by slide...",
      "Finding the titles...",
      "Saving it to your shelf...",
    ];
  }
  if (kind === "PDF") {
    return [
      "Opening your PDF...",
      "Reading page by page...",
      "Finding the headings...",
      "Saving it to your shelf...",
    ];
  }
  return [
    "Opening your file...",
    "Reading the text...",
    "Finding the headings...",
    "Saving it to your shelf...",
  ];
}

const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  left: 5 + ((i * 53) % 90),
  delay: (i % 6) * 0.08,
  color: ["#7c5cf6", "#22c55e", "#f59e0b", "#ec4899", "#38bdf8"][i % 5],
  rotate: (i * 47) % 360,
}));

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function toneIndex(id) {
  return [...String(id)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TONES.length;
}

export default function Materials() {
  const { token } = useAuth();

  const [materials, setMaterials] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fileKind = file ? kindOf(file.name) : "PDF";
  const steps = readingSteps(fileKind);

  async function loadMaterials() {
    try {
      const res = await fetch("/api/materials", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Could not load your materials");
      setMaterials(data.materials || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    if (!uploading) return;
    setStepIndex(0);
    const id = setInterval(() => setStepIndex((i) => Math.min(i + 1, steps.length - 1)), 2200);
    return () => clearInterval(id);
  }, [uploading]);

  useEffect(() => {
    if (!celebrate) return;
    const id = setTimeout(() => setCelebrate(false), 3000);
    return () => clearTimeout(id);
  }, [celebrate]);

  function pickFile(picked) {
    setError("");
    setNotice("");
    if (!picked) return;
    const problem = checkPicked(picked, materials.length, SHELF_LIMIT);
    if (problem) {
      setError(problem);
      return;
    }
    setFile(picked);
    setTitle(picked.name.replace(/\.[a-z0-9]+$/i, ""));
  }

  function handleFileChange(e) {
    pickFile(e.target.files[0]);
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
    pickFile(e.dataTransfer.files[0]);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setNotice("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("file", file);

      const res = await fetch("/api/materials/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setNotice(
        data.truncated
          ? "Saved! This file was very long, so only the first part was kept."
          : "Saved! You can now use this material anywhere in LearnIQ."
      );
      setFile(null);
      setTitle("");
      setCelebrate(true);
      await loadMaterials();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(material) {
    const ok = window.confirm(`Delete "${material.title}"? This cannot be undone.`);
    if (!ok) return;
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/materials/${material.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Could not delete");
      setMaterials((prev) => prev.filter((m) => m.id !== material.id));
    } catch (err) {
      setError(err.message);
    }
  }

  let mood = "idle";
  let speech = "Drop a PDF, slides, notes or a photo here and I will remember it for you!";
  if (uploading) {
    mood = "busy";
    speech = steps[stepIndex];
  } else if (dragging) {
    mood = "excited";
    speech = "Ooh! Drop it right here!";
  } else if (error) {
    mood = "sad";
    speech = "Hmm, that did not work. Let us try again!";
  } else if (celebrate) {
    mood = "happy";
    speech = "Yay! It is on your shelf now!";
  } else if (file) {
    speech =
      fileKind === "Photo"
        ? "Nice photo! Give it a name, then press Save. I will read the text in it."
        : "Nice! Give it a name, then press Save.";
  }

  const totalSections = materials.reduce((sum, m) => sum + m.sectionCount, 0);
  const shelfPercent = Math.min(100, Math.round((materials.length / SHELF_LIMIT) * 100));

  return (
    <div className="mat-page">
      <section className="mat-hero">
        <div className="mat-hero-text">
          <span className="mat-hero-tag">
            <Library size={14} /> Study shelf
          </span>
          <h2>Your Study Shelf</h2>
          <p>
            Upload a PDF, slides, a Word file, a text file or even a photo of your notes once and
            keep it here. LearnIQ remembers it, so you never have to upload it again.
          </p>
        </div>
        <div className="mat-hero-bot">
          <div className={`mat-bubble ${mood}`} key={speech}>
            {speech}
          </div>
          <div className={`mat-robot ${mood}`}>
            <Robot size={96} />
          </div>
        </div>
      </section>

      <form className="card mat-upload" onSubmit={handleUpload}>
        {celebrate && (
          <div className="mat-confetti" aria-hidden="true">
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

        <label
          className={`mat-drop ${dragging ? "over" : ""} ${file ? "has-file" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="mat-drop-icon">
            {file ? <FileText size={30} /> : <Upload size={30} />}
          </span>
          <span className="mat-drop-text">
            {file ? (
              <>
                <strong>{file.name}</strong>
                <small>Click to choose a different file</small>
              </>
            ) : (
              <>
                <strong>Drag your file here</strong>
                <small>PDF, PPTX, DOCX, TXT or a photo of your notes (up to {MAX_FILE_MB} MB)</small>
              </>
            )}
          </span>
          <input type="file" accept={ACCEPT} onChange={handleFileChange} disabled={uploading} />
        </label>

        {file && (
          <label className="mat-field">
            Give it a name
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Software Testing Unit 3"
            />
          </label>
        )}

        {error && <div className="mat-error">{error}</div>}
        {notice && <div className="mat-notice">{notice}</div>}

        <button type="submit" className="mat-btn" disabled={!file || uploading}>
          {uploading ? (
            <>
              <Loader2 size={18} className="mat-spin" /> Reading your file...
            </>
          ) : (
            <>
              <Upload size={18} /> Save to my shelf
            </>
          )}
        </button>

        {uploading && (
          <div className="mat-progress" aria-hidden="true">
            <span />
          </div>
        )}
      </form>

      <section>
        <div className="mat-shelf-head">
          <h3>My shelf</h3>
          <div className="mat-meter" title={`${materials.length} of ${SHELF_LIMIT} spots used`}>
            <div className="mat-meter-bar">
              <div className="mat-meter-fill" style={{ width: `${shelfPercent}%` }} />
            </div>
            <span>
              {materials.length}/{SHELF_LIMIT} spots
            </span>
          </div>
        </div>

        {materials.length > 0 && (
          <p className="mat-total">📑 {totalSections} sections saved across your materials</p>
        )}

        {loadingList && (
          <p className="mat-loading">
            <Loader2 size={16} className="mat-spin" /> Loading your shelf...
          </p>
        )}

        {!loadingList && materials.length === 0 && (
          <div className="card mat-empty">
            <div className="mat-empty-emoji">📚</div>
            <h4>Your shelf is empty</h4>
            <p>Drop your first file above and watch it appear here as a shiny new book!</p>
          </div>
        )}

        {materials.length > 0 && (
          <div className="mat-grid">
            {materials.map((m, i) => {
              const idx = toneIndex(m.id);
              const minutes = Math.max(1, Math.round(m.totalChars / 1200));
              return (
                <article
                  key={m.id}
                  className={`mat-card tone-${TONES[idx]}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}
                >
                  <div className="mat-card-top">
                    <span className="mat-book">{EMOJIS[idx]}</span>
                    <button
                      type="button"
                      className="mat-del"
                      onClick={() => handleDelete(m)}
                      aria-label={`Delete ${m.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h4 className="mat-card-title" title={m.title}>
                    {m.title}
                  </h4>
                  <div className="mat-chips">
                    <span className="mat-chip">{kindOf(m.fileName)}</span>
                    <span className="mat-chip">
                      <Layers size={13} /> {m.sectionCount} sections
                    </span>
                    <span className="mat-chip">
                      <Clock size={13} /> ~{minutes} min read
                    </span>
                  </div>
                  <div className="mat-card-date">
                    <CalendarDays size={13} /> Added {new Date(m.createdAt).toLocaleDateString()}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}