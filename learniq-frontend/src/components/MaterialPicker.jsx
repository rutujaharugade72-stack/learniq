import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// The AI reads about this much text at a time (same cap as the quiz generator)
const MAX_CHARS = 12000;

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// --- text builder start --- (joins the chosen sections, up to MAX_CHARS)
function buildText(sections, selected, maxChars) {
  const chosen = sections.filter((_, i) => selected.includes(i));
  let text = "";
  let truncated = false;
  for (const s of chosen) {
    const block = `${s.heading}\n${s.content}`;
    const joined = text ? `${text}\n\n${block}` : block;
    if (joined.length > maxChars) {
      const room = maxChars - text.length - (text ? 2 : 0);
      if (room > 200) text = text ? `${text}\n\n${block.slice(0, room)}` : block.slice(0, room);
      truncated = true;
      break;
    }
    text = joined;
  }
  return { chosen, text, truncated };
}
// --- text builder end ---

// Lets a student make a quiz from a material they saved once on "Materials".
// It tells the parent page what was picked through onChange({ fileName, topicName, topicText, truncated }),
// or onChange(null) when nothing usable is picked.
export default function MaterialPicker({ onChange }) {
  const { token } = useAuth();

  const [materials, setMaterials] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [materialId, setMaterialId] = useState("");
  const [material, setMaterial] = useState(null); // { title, fileName, sections }
  const [selected, setSelected] = useState([]); // indexes of ticked sections
  const [loadingMaterial, setLoadingMaterial] = useState(false);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [charCount, setCharCount] = useState(0);

  // Always call the newest onChange without re-running the effects below
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Load the list of saved materials once
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/materials", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await readJson(res);
        if (!res.ok) throw new Error(data.error || "Could not load your materials");
        if (!cancelled) setMaterials(Array.isArray(data.materials) ? data.materials : []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // When a material is picked, load its sections (all ticked at the start)
  useEffect(() => {
    setMaterial(null);
    setSelected([]);
    if (!materialId) return;
    let cancelled = false;
    async function load() {
      setLoadingMaterial(true);
      setError("");
      try {
        const res = await fetch(`/api/materials/${materialId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await readJson(res);
        if (!res.ok) throw new Error(data.error || "Could not open this material");
        if (!cancelled) {
          const sections = Array.isArray(data.sections) ? data.sections : [];
          setMaterial({ title: data.title, fileName: data.fileName, sections });
          setSelected(sections.map((_, i) => i));
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoadingMaterial(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [materialId, token]);

  // Tell the quiz page what is picked
  useEffect(() => {
    if (!material || selected.length === 0) {
      setTruncated(false);
      setCharCount(0);
      onChangeRef.current(null);
      return;
    }
    const { chosen, text, truncated: cut } = buildText(material.sections, selected, MAX_CHARS);
    const all = selected.length === material.sections.length;
    const topicName = all
      ? `${material.title} (All Topics)`
      : chosen.map((s) => s.heading).join(", ");
    setTruncated(cut);
    setCharCount(text.length);
    onChangeRef.current({
      fileName: material.title,
      topicName: topicName.slice(0, 300),
      topicText: text,
      truncated: cut,
    });
  }, [material, selected]);

  // Clear the pick when this picker goes away
  useEffect(() => () => onChangeRef.current(null), []);

  function toggleSection(i) {
    setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  function toggleAll() {
    if (!material) return;
    setSelected((prev) =>
      prev.length === material.sections.length ? [] : material.sections.map((_, i) => i)
    );
  }

  return (
    <div className="lq-form">
      {loadingList && (
        <p className="lq-note">
          <Loader2 size={14} className="lq-spin" /> Loading your shelf...
        </p>
      )}

      {!loadingList && materials.length === 0 && !error && (
        <p className="lq-note">
          Your shelf is empty. <Link to="/materials">Upload a file once on Materials</Link> and you can
          use it for every quiz.
        </p>
      )}

      {error && <div className="lq-error">{error}</div>}

      {materials.length > 0 && (
        <label className="lq-field">
          Choose a material from your shelf
          <select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
            <option value="">Pick one...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {loadingMaterial && (
        <p className="lq-note">
          <Loader2 size={14} className="lq-spin" /> Opening your material...
        </p>
      )}

      {material && material.sections.length > 0 && (
        <>
          <div className="lq-select-row">
            <p>Pick the topics to include:</p>
            <button type="button" className="lq-link-btn" onClick={toggleAll}>
              {selected.length === material.sections.length ? "Unselect all" : "Select all"}
            </button>
          </div>
          <div className="lq-checks">
            {material.sections.map((s, i) => (
              <label className="lq-check" key={i}>
                <input
                  type="checkbox"
                  checked={selected.includes(i)}
                  onChange={() => toggleSection(i)}
                />
                {s.heading}
              </label>
            ))}
          </div>
          <p className="lq-note">
            {selected.length} of {material.sections.length} topics picked
            {charCount > 0 ? ` (about ${charCount.toLocaleString()} characters)` : ""}.
            {truncated
              ? " The AI reads about 12,000 characters at a time, so the first part is used. Pick fewer topics to cover the rest."
              : ""}
          </p>
        </>
      )}
    </div>
  );
}