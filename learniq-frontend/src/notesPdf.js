// Makes a clean PDF from a notes or summary result and downloads it.
// Uses jsPDF (npm install jspdf). Built-in PDF fonts only know English letters,
// so emoji and non-Latin characters are removed before drawing.
import { jsPDF } from "jspdf";

const MARGIN = 48;
const FOOTER = 44;

const PURPLE = [109, 40, 217];
const TEXT = [31, 41, 55];
const MUTED = [107, 114, 128];
const LINE = [229, 231, 235];
const WHITE = [255, 255, 255];
const TONES = [
  [245, 158, 11],
  [59, 130, 246],
  [236, 72, 153],
  [34, 197, 94],
  [139, 92, 246],
  [20, 184, 166],
];

function soft(color) {
  return color.map((v) => Math.round(v + (255 - v) * 0.9));
}

function asList(value) {
  return Array.isArray(value) ? value.filter((v) => v !== null && v !== undefined) : [];
}

// Letters and symbols the built-in PDF font cannot draw, written out in plain English
const GREEK = {
  "\u03B1": "alpha", "\u03B2": "beta", "\u03B3": "gamma", "\u03B4": "delta", "\u03B5": "epsilon",
  "\u03B6": "zeta", "\u03B7": "eta", "\u03B8": "theta", "\u03B9": "iota", "\u03BA": "kappa",
  "\u03BB": "lambda", "\u03BC": "\u00B5", "\u03BD": "nu", "\u03BE": "xi", "\u03C0": "pi",
  "\u03C1": "rho", "\u03C3": "sigma", "\u03C2": "sigma", "\u03C4": "tau", "\u03C5": "upsilon",
  "\u03C6": "phi", "\u03D5": "phi", "\u03C7": "chi", "\u03C8": "psi", "\u03C9": "omega",
  "\u0393": "Gamma", "\u0394": "Delta", "\u2206": "Delta", "\u0398": "Theta", "\u039B": "Lambda",
  "\u039E": "Xi", "\u03A0": "Pi", "\u03A3": "Sigma", "\u03A6": "Phi", "\u03A8": "Psi",
  "\u03A9": "Omega", "\u2126": "ohm",
};

const SYMBOLS = {
  // hyphens and dashes (the AI often uses non-breaking hyphens)
  "\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2013": "-", "\u2014": "-", "\u2015": "-", "\u2212": "-",
  // quotes
  "\u2018": "'", "\u2019": "'", "\u201A": "'", "\u2032": "'",
  "\u201C": '"', "\u201D": '"', "\u201E": '"', "\u2033": '"',
  // spaces that should not show
  "\u2002": " ", "\u2003": " ", "\u2009": " ", "\u200A": " ", "\u202F": " ",
  "\u200B": "", "\u200C": "", "\u200D": "", "\u2060": "", "\uFEFF": "",
  // bullets and dots
  "\u2022": "-", "\u25CF": "-", "\u25AA": "-", "\u25E6": "-", "\u2026": "...",
  // arrows
  "\u2192": "->", "\u2190": "<-", "\u2194": "<->", "\u21D2": "=>", "\u21D4": "<=>",
  "\u2191": "(up)", "\u2193": "(down)",
  // maths
  "\u2264": "<=", "\u2265": ">=", "\u2260": "!=", "\u2248": "~", "\u221E": "infinity",
  "\u221A": "sqrt", "\u2211": "sum", "\u220F": "product", "\u222B": "integral", "\u2202": "d",
  "\u221D": " proportional to ", "\u2234": "therefore", "\u2235": "because", "\u2220": "angle ",
  "\u22A5": " perpendicular to ", "\u2225": " parallel to ", "\u2715": "x", "\u2716": "x",
  "\u2217": "*", "\u2044": "/", "\u2215": "/",
  // temperature and units
  "\u2103": "\u00B0C", "\u2109": "\u00B0F", "\u212B": "Angstrom",
  // subscripts (H2O, f1) and a few sign marks
  "\u2080": "0", "\u2081": "1", "\u2082": "2", "\u2083": "3", "\u2084": "4",
  "\u2085": "5", "\u2086": "6", "\u2087": "7", "\u2088": "8", "\u2089": "9",
  "\u208A": "+", "\u208B": "-",
};

// Superscripts like m with a small -1 (the built-in font only knows 1, 2 and 3)
const SUPER = {
  "\u2070": "0", "\u00B9": "1", "\u00B2": "2", "\u00B3": "3", "\u2074": "4", "\u2075": "5",
  "\u2076": "6", "\u2077": "7", "\u2078": "8", "\u2079": "9", "\u207A": "+", "\u207B": "-",
};

// Keeps only characters the built-in PDF font can draw
function clean(text) {
  let t = String(text ?? "");
  t = t.replace(/[\t\r\u00A0]/g, " ").replace(/\u00AD/g, "");
  // powers like m-1 written with small raised numbers become m^-1
  t = t.replace(/[\u2070\u00B9\u00B2\u00B3\u2074-\u207B]+/g, (run) =>
    /[^\u00B2\u00B3\u00B9]/.test(run) ? "^" + [...run].map((c) => SUPER[c] || "").join("") : run
  );
  // everything the font cannot draw: write it in English, or drop it (emoji and so on)
  t = t.replace(/[^\x00-\xFF]/g, (ch, offset, str) => {
    if (GREEK[ch]) {
      const before = /[A-Za-z0-9)]/.test(str[offset - 1] || "") ? " " : "";
      const after = /[A-Za-z0-9(]/.test(str[offset + 1] || "") ? " " : "";
      return before + GREEK[ch] + after;
    }
    return SYMBOLS[ch] || "";
  });
  return t
    .replace(/[^\n\x20-\x7E\xA1-\xFF]/g, "")
    .replace(/ +/g, " ")
    .trim();
}

function style(doc, size, bold, color) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
}

function wrap(doc, text, width) {
  const lines = [];
  clean(text)
    .split("\n")
    .forEach((part) => {
      const p = part.trim();
      if (p) lines.push(...doc.splitTextToSize(p, width));
    });
  return lines.length ? lines : [""];
}

function newState(doc) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  return {
    doc,
    W,
    H,
    left: MARGIN,
    width: W - MARGIN * 2,
    top: MARGIN,
    bottom: H - FOOTER,
    y: MARGIN,
  };
}

// Starts a new page when the next block does not fit. Returns true if it did.
function need(s, h) {
  if (s.y + h > s.bottom) {
    s.doc.addPage();
    s.y = s.top;
    return true;
  }
  return false;
}

function paragraph(s, text, { size = 10.5, bold = false, color = TEXT, indent = 0, gap = 6 } = {}) {
  style(s.doc, size, bold, color);
  const lines = wrap(s.doc, text, s.width - indent);
  const lh = size * 1.4;
  lines.forEach((line) => {
    need(s, lh);
    style(s.doc, size, bold, color);
    s.doc.text(line, s.left + indent, s.y + size);
    s.y += lh;
  });
  s.y += gap;
}

function callout(s, text, tone) {
  const size = 11;
  const pad = 12;
  const lh = size * 1.45;
  style(s.doc, size, false, TEXT);
  const lines = wrap(s.doc, text, s.width - pad * 2 - 6);
  const h = lines.length * lh + pad * 2;
  if (h > s.bottom - s.top) {
    paragraph(s, text, { size });
    return;
  }
  need(s, h);
  s.doc.setFillColor(...soft(tone));
  s.doc.roundedRect(s.left, s.y, s.width, h, 6, 6, "F");
  s.doc.setFillColor(...tone);
  s.doc.rect(s.left, s.y + 4, 4, h - 8, "F");
  style(s.doc, size, false, TEXT);
  lines.forEach((line, i) => {
    s.doc.text(line, s.left + pad + 6, s.y + pad + size + i * lh - 1);
  });
  s.y += h + 14;
}

function sectionHeading(s, text, tone) {
  const size = 13;
  const lh = size * 1.35;
  style(s.doc, size, true, TEXT);
  const lines = wrap(s.doc, text, s.width - 14);
  need(s, lines.length * lh + 36); // keep the heading together with its first lines
  s.doc.setFillColor(...tone);
  s.doc.roundedRect(s.left, s.y + 1, 4, lines.length * lh - 2, 2, 2, "F");
  style(s.doc, size, true, TEXT);
  lines.forEach((line, i) => {
    s.doc.text(line, s.left + 12, s.y + size + i * lh - 1);
  });
  s.y += lines.length * lh + 6;
}

function bullets(s, items, tone) {
  const size = 10.5;
  const lh = size * 1.4;
  const indent = 16;
  items.forEach((item) => {
    style(s.doc, size, false, TEXT);
    const lines = wrap(s.doc, item, s.width - indent);
    lines.forEach((line, i) => {
      need(s, lh);
      if (i === 0) {
        s.doc.setFillColor(...tone);
        s.doc.circle(s.left + 6, s.y + size * 0.62, 2.2, "F");
      }
      style(s.doc, size, false, TEXT);
      s.doc.text(line, s.left + indent, s.y + size);
      s.y += lh;
    });
    s.y += 3;
  });
  s.y += 8;
}

function numbered(s, items) {
  const size = 10.5;
  const lh = size * 1.4;
  const indent = 24;
  items.forEach((item, n) => {
    style(s.doc, size, false, TEXT);
    const lines = wrap(s.doc, item, s.width - indent);
    lines.forEach((line, i) => {
      need(s, lh);
      if (i === 0) {
        s.doc.setFillColor(...PURPLE);
        s.doc.circle(s.left + 8, s.y + size * 0.62, 8, "F");
        style(s.doc, 9, true, WHITE);
        s.doc.text(String(n + 1), s.left + 8, s.y + size * 0.62 + 3, { align: "center" });
      }
      style(s.doc, size, false, TEXT);
      s.doc.text(line, s.left + indent, s.y + size);
      s.y += lh;
    });
    s.y += 5;
  });
  s.y += 8;
}

function checklist(s, items, tone) {
  const size = 10.5;
  const lh = size * 1.4;
  const indent = 20;
  items.forEach((item) => {
    style(s.doc, size, false, TEXT);
    const lines = wrap(s.doc, item, s.width - indent);
    lines.forEach((line, i) => {
      need(s, lh);
      if (i === 0) {
        s.doc.setDrawColor(...tone);
        s.doc.setLineWidth(1);
        s.doc.rect(s.left, s.y + 1.5, 10, 10, "S");
      }
      style(s.doc, size, false, TEXT);
      s.doc.text(line, s.left + indent, s.y + size);
      s.y += lh;
    });
    s.y += 4;
  });
  s.y += 8;
}

function terms(s, items) {
  items.forEach((t) => {
    if (!t || typeof t !== "object") return;
    const term = clean(t.term);
    if (!term) return;
    need(s, 36);
    paragraph(s, term, { size: 11, bold: true, color: PURPLE, gap: 1 });
    paragraph(s, t.meaning, { size: 10.5, indent: 10, gap: 8 });
  });
}

function table(s, t, tone) {
  const columns = asList(t.columns).map(clean);
  const rows = asList(t.rows).map((r) => asList(r).map(clean));
  if (!rows.length) return;
  const ncols = Math.max(columns.length, ...rows.map((r) => r.length), 1);
  const size = 9.5;
  const pad = 5;
  const lh = size * 1.35;
  const colW = s.width / ncols;
  const doc = s.doc;

  sectionHeading(s, t.title || "Table", tone);

  function measure(cells, bold) {
    style(doc, size, bold, TEXT);
    const wrapped = [];
    for (let i = 0; i < ncols; i++) wrapped.push(wrap(doc, cells[i] || "", colW - pad * 2));
    const lines = Math.max(...wrapped.map((w) => w.length));
    return { wrapped, h: lines * lh + pad * 2 };
  }

  function drawRow(cells, header, shade) {
    const { wrapped, h } = measure(cells, header);
    if (need(s, h) && !header && columns.length) drawRow(columns, true, false);
    if (header) doc.setFillColor(...PURPLE);
    else if (shade) doc.setFillColor(...soft(tone));
    else doc.setFillColor(...WHITE);
    doc.rect(s.left, s.y, s.width, h, "F");
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.rect(s.left, s.y, s.width, h, "S");
    for (let i = 1; i < ncols; i++) doc.line(s.left + colW * i, s.y, s.left + colW * i, s.y + h);
    style(doc, size, header, header ? WHITE : TEXT);
    wrapped.forEach((cellLines, i) => {
      cellLines.forEach((line, j) => {
        doc.text(line, s.left + colW * i + pad, s.y + pad + size + j * lh - 1);
      });
    });
    s.y += h;
  }

  if (columns.length) drawRow(columns, true, false);
  rows.forEach((row, i) => drawRow(row, false, i % 2 === 1));
  s.y += 14;
}

function chart(s, c, tone) {
  const items = asList(c.items).filter((it) => it && typeof it === "object" && it.label !== undefined);
  if (!items.length) return;
  const doc = s.doc;
  sectionHeading(s, c.title || "Chart", tone);

  const unit = c.unit ? ` ${clean(c.unit)}` : "";
  const values = items.map((it) => parseFloat(String(it.value).replace(/[^0-9.\-]/g, "")));
  const numeric = values.every((v) => Number.isFinite(v));
  const max = numeric ? Math.max(...values, 0) : 0;

  if (!numeric || max <= 0) {
    bullets(s, items.map((it) => `${it.label}: ${it.value}${unit}`), tone);
    return;
  }

  const labelW = 150;
  const valueW = 70;
  const barX = s.left + labelW + 8;
  const barMax = s.width - labelW - valueW - 16;
  const rowH = 22;

  items.forEach((it, i) => {
    need(s, rowH);
    style(doc, 10, false, TEXT);
    const label = wrap(doc, it.label, labelW)[0];
    doc.text(label, s.left, s.y + 14);
    doc.setFillColor(...soft(tone));
    doc.roundedRect(barX, s.y + 4, barMax, 12, 3, 3, "F");
    const w = Math.max(2, (Math.max(values[i], 0) / max) * barMax);
    doc.setFillColor(...tone);
    doc.roundedRect(barX, s.y + 4, w, 12, 3, 3, "F");
    style(doc, 10, true, TEXT);
    doc.text(wrap(doc, `${it.value}${unit}`, valueW)[0], barX + barMax + 8, s.y + 14);
    s.y += rowH;
  });
  s.y += 10;
}

function banner(s, data) {
  const doc = s.doc;
  const titleSize = 22;
  const lineGap = titleSize * 1.25;
  style(doc, titleSize, true, WHITE);
  const titleLines = wrap(doc, data.title || "Notes", s.width - 8).slice(0, 3);
  const firstBaseline = 32 + 12 + titleSize;
  const lastBaseline = firstBaseline + (titleLines.length - 1) * lineGap;
  const metaBaseline = lastBaseline + 24;
  const h = metaBaseline + 18;

  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, s.W, h, "F");

  style(doc, 9, true, [221, 214, 254]);
  doc.text("LEARNIQ STUDY LAB", s.left, 32);

  style(doc, titleSize, true, WHITE);
  titleLines.forEach((line, i) => doc.text(line, s.left, firstBaseline + i * lineGap));

  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const meta = [data.mode === "summary" ? "Summary" : "Notes", data.level, data.materialTitle, date]
    .map(clean)
    .filter(Boolean)
    .join("   |   ");
  style(doc, 10, false, [237, 233, 254]);
  doc.text(meta, s.left, metaBaseline);

  s.y = h + 24;
}

function addFooters(doc, W, H) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, H - 34, W - MARGIN, H - 34);
    style(doc, 9, false, MUTED);
    doc.text("Made with LearnIQ", MARGIN, H - 20);
    doc.text(`Page ${i} of ${pages}`, W - MARGIN, H - 20, { align: "right" });
  }
}

export function downloadNotesPdf(data) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const s = newState(doc);
  const r = (data && data.result) || {};

  banner(s, data);

  if (data.mode === "summary") {
    if (r.summary) callout(s, r.summary, PURPLE);
    const takeaways = asList(r.key_takeaways);
    if (takeaways.length) {
      sectionHeading(s, "Key takeaways", TONES[3]);
      numbered(s, takeaways);
    }
  } else {
    if (r.overview) callout(s, r.overview, PURPLE);

    asList(r.sections).forEach((sec, i) => {
      if (!sec || typeof sec !== "object") return;
      const tone = TONES[i % TONES.length];
      sectionHeading(s, sec.heading || "", tone);
      bullets(s, asList(sec.points), tone);
    });

    asList(r.tables).forEach((t, i) => {
      if (t && typeof t === "object") table(s, t, TONES[(i + 1) % TONES.length]);
    });
    asList(r.charts).forEach((c, i) => {
      if (c && typeof c === "object") chart(s, c, TONES[(i + 2) % TONES.length]);
    });

    const keyTerms = asList(r.key_terms);
    if (keyTerms.length) {
      sectionHeading(s, "Key terms", TONES[4]);
      terms(s, keyTerms);
    }

    const revision = asList(r.quick_revision);
    if (revision.length) {
      sectionHeading(s, "Quick revision", TONES[3]);
      checklist(s, revision, TONES[3]);
    }
  }

  addFooters(doc, s.W, s.H);

  const safe = String((data && data.title) || "notes")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
  doc.save(`${safe || "notes"}.pdf`);
}