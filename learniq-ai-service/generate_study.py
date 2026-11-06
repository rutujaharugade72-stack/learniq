"""
LEARNIQ - Study Notes and Summaries

One function, generate_study(), makes either structured NOTES or a SUMMARY
from text (a saved Material, a PDF section, pasted text, or a syllabus/chapter topic).
Uses the same AI helper as the rest of the app (Gemini, then Groq),
and honors MOCK_AI so testing costs no AI quota.
"""

import re
import json
import math
import time

from generate_mcqs import _get_answer_text, GeminiBusyError, BadOutputError, MOCK_AI

MAX_SOURCE_CHARS = 12000

STUDY_GROQ_SUFFIX = """

IMPORTANT OUTPUT FORMAT: Return ONE JSON object exactly as described above.
Nothing else, no text before or after it."""

NOTES_DETAIL = {
    "Brief": "3 to 4 sections with 2 to 3 bullet points each.",
    "Standard": "4 to 6 sections with 3 to 5 bullet points each.",
    "Detailed": "5 to 8 sections with 4 to 6 bullet points each. Add examples and key concepts.",
}

SUMMARY_LENGTH = {
    "Short": "3 to 4 short sentences.",
    "Medium": "1 or 2 short paragraphs (about 100 to 150 words).",
    "Detailed": "3 or 4 short paragraphs (about 250 to 350 words).",
}

DEFAULT_LEVEL = {"notes": "Standard", "summary": "Medium"}

TABLE_LIMIT = {"Brief": 1, "Standard": 2, "Detailed": 3}
CHART_LIMIT = {"Brief": 1, "Standard": 1, "Detailed": 2}


def _s(value, limit):
    return str(value or "").strip()[:limit]


def _cell(value, limit):
    if value is None:
        return ""
    return str(value).strip()[:limit]


def _as_list(value):
    return value if isinstance(value, list) else []


def _str_list(value, max_items, max_chars):
    items = []
    for v in _as_list(value)[:max_items]:
        text = _s(v, max_chars)
        if text:
            items.append(text)
    return items


def _parse_object(text):
    t = (text or "").strip()
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z]*\n?", "", t)
        t = re.sub(r"\n?```$", "", t).strip()
    try:
        data = json.loads(t)
    except json.JSONDecodeError:
        raise BadOutputError("AI did not return valid JSON")
    if isinstance(data, list) and data and isinstance(data[0], dict):
        data = data[0]
    if not isinstance(data, dict):
        raise BadOutputError("AI returned an unexpected format")
    return data


def _is_syllabus_query(source):
    # Detect if user entered a syllabus/topic search rather than raw uploaded document text
    markers = ["ACADEMIC STUDY GUIDE", "Subject:", "Topic:", "Chapter", "State Board", "CBSE", "Class ", "Standard "]
    return len(source) < 600 or any(m in source for m in markers)


def _notes_prompt(title, source, level):
    size = NOTES_DETAIL[level]
    max_tables = TABLE_LIMIT[level]
    max_charts = CHART_LIMIT[level]

    if _is_syllabus_query(source):
        instruction = f"""You are a master academic educator creating high-yield, comprehensive, textbook-quality study notes on the given topic/curriculum.
Draw upon standard academic curriculum, official textbook standards, and complete domain knowledge to create rich, thorough notes.

Title / Topic: {title}
Educational Context / Guidance:
\"\"\"
{source}
\"\"\"
Detail level: {level} ({size})"""
    else:
        instruction = f"""You are making clear study notes for a student, based on the text below.
Title: {title}
Detail level: {level} ({size})

Source text:
\"\"\"
{source}
\"\"\""""

    return f"""{instruction}

Return ONLY one JSON object in exactly this shape:
{{"title": "{title}", "overview": "A clear, complete 2 to 3 sentence conceptual introduction and definition of the topic.", "sections": [{{"heading": "...", "points": ["...", "..."]}}], "key_terms": [{{"term": "...", "meaning": "..."}}], "quick_revision": ["...", "..."], "tables": [{{"title": "Comparison / Difference Table", "columns": ["Feature / Point", "Category A", "Category B"], "rows": [["...", "...", "..."]]}}], "charts": [{{"title": "...", "unit": "%", "items": [{{"label": "...", "value": 45}}]}}]}}

Strict Rules:
- Ensure {size}
- Every section heading must be distinct, descriptive, and educational (e.g., "Core Definitions & Principles", "Types and Classifications", "Architecture and Workflow", "Real-World Examples", "Advantages and Trade-Offs").
- Each bullet point must be informative, self-contained, and easy to understand.
- "key_terms": Provide 4 to 8 critical technical/scientific terms with clear 1-2 sentence definitions.
- "quick_revision": 4 to 6 one-liner exam revision points, formulas, or rules.
- "tables": Include at least 1 detailed comparison or difference table whenever the topic involves types, methods, or comparative concepts (maximum {max_tables}).
- "charts": Return an empty list [] unless real numerical statistics or metrics are involved.
"""


def _summary_prompt(title, source, level):
    size = SUMMARY_LENGTH[level]
    return f"""You are summarizing study material for a student.

Title: {title}
Summary length: {level} ({size})

Input / Topic:
\"\"\"
{source}
\"\"\"

Return ONLY one JSON object in exactly this shape:
{{"title": "...", "summary": "...", "key_takeaways": ["...", "..."]}}

Rules:
- Use simple, clear English that a student can easily absorb.
- "summary": {size}
- "key_takeaways": 4 to 6 high-yield bullet points with the most important ideas.
"""


def _clean_tables(value, max_tables):
    tables = []
    for t in _as_list(value)[:max_tables]:
        if not isinstance(t, dict):
            continue
        columns = _str_list(t.get("columns"), 4, 60)
        if len(columns) < 2:
            continue
        rows = []
        for r in _as_list(t.get("rows"))[:8]:
            cells = [_cell(c, 160) for c in _as_list(r)[: len(columns)]]
            if not any(cells):
                continue
            cells += [""] * (len(columns) - len(cells))
            rows.append(cells)
        title = _s(t.get("title"), 120)
        if title and len(rows) >= 2:
            tables.append({"title": title, "columns": columns, "rows": rows})
    return tables


def _number_in_source(number, source):
    if _is_syllabus_query(source):
        return True
    if float(number).is_integer():
        n = int(number)
        candidates = {str(n), f"{n:,}"}
    else:
        candidates = {format(number, "f").rstrip("0").rstrip(".")}
    for c in candidates:
        if re.search(r"(?<![\d.])" + re.escape(c) + r"(?![\d])", source):
            return True
    return False


def _clean_charts(value, max_charts, source):
    charts = []
    for c in _as_list(value)[:max_charts]:
        if not isinstance(c, dict):
            continue
        items = []
        for it in _as_list(c.get("items"))[:8]:
            if not isinstance(it, dict):
                continue
            label = _s(it.get("label"), 40)
            try:
                number = float(str(it.get("value")).replace(",", "").replace("%", "").strip())
            except (TypeError, ValueError):
                continue
            if label and math.isfinite(number) and number >= 0 and _number_in_source(number, source):
                items.append({"label": label, "value": number})
        title = _s(c.get("title"), 120)
        if title and len(items) >= 2:
            charts.append({"title": title, "unit": _s(c.get("unit"), 12), "items": items})
    return charts


def _clean_notes(data, title, level, source):
    sections = []
    for sec in _as_list(data.get("sections"))[:12]:
        if not isinstance(sec, dict):
            continue
        heading = _s(sec.get("heading"), 120)
        points = _str_list(sec.get("points"), 8, 350)
        if heading and points:
            sections.append({"heading": heading, "points": points})

    terms = []
    for t in _as_list(data.get("key_terms"))[:12]:
        if not isinstance(t, dict):
            continue
        term = _s(t.get("term"), 80)
        meaning = _s(t.get("meaning"), 300)
        if term and meaning:
            terms.append({"term": term, "meaning": meaning})

    overview = _s(data.get("overview"), 600)
    if not sections and not overview:
        raise BadOutputError("AI returned no usable notes")

    return {
        "mode": "notes",
        "title": _s(data.get("title"), 120) or title,
        "overview": overview,
        "sections": sections,
        "key_terms": terms,
        "quick_revision": _str_list(data.get("quick_revision"), 8, 250),
        "tables": _clean_tables(data.get("tables"), TABLE_LIMIT[level]),
        "charts": _clean_charts(data.get("charts"), CHART_LIMIT[level], source),
    }


def _clean_summary(data, title):
    summary = _s(data.get("summary"), 3000)
    if not summary:
        raise BadOutputError("AI returned no usable summary")
    return {
        "mode": "summary",
        "title": _s(data.get("title"), 120) or title,
        "summary": summary,
        "key_takeaways": _str_list(data.get("key_takeaways"), 8, 250),
    }


def _mock(mode, title):
    time.sleep(1)
    if mode == "summary":
        return {
            "mode": "summary",
            "title": f"[MOCK] {title}",
            "summary": "[MOCK] This is a fake summary. MOCK_AI is on, so no AI was used.",
            "key_takeaways": ["[MOCK] First takeaway", "[MOCK] Second takeaway", "[MOCK] Third takeaway"],
        }
    return {
        "mode": "notes",
        "title": f"[MOCK] {title}",
        "overview": "[MOCK] These are comprehensive study notes generated in mock mode.",
        "sections": [
            {"heading": "Fundamental Concepts", "points": ["[MOCK] Definition and core concepts", "[MOCK] Key principles explained"]},
            {"heading": "Mechanisms & Types", "points": ["[MOCK] First classification breakdown", "[MOCK] Practical implementation"]},
        ],
        "key_terms": [
            {"term": "Mock Term A", "meaning": "[MOCK] Definition of term A."},
            {"term": "Mock Term B", "meaning": "[MOCK] Definition of term B."},
        ],
        "quick_revision": ["[MOCK] Exam point 1", "[MOCK] Exam point 2"],
        "tables": [
            {
                "title": "[MOCK] Comparison Table",
                "columns": ["Feature", "Option A", "Option B"],
                "rows": [["Type", "Static", "Dynamic"], ["Phase", "Design", "Execution"]],
            }
        ],
        "charts": [],
    }


def generate_study(mode, title, text, level=None):
    mode = "summary" if mode == "summary" else "notes"
    title = _s(title, 120) or "Study material"

    levels = SUMMARY_LENGTH if mode == "summary" else NOTES_DETAIL
    if level not in levels:
        level = DEFAULT_LEVEL[mode]

    source = (text or "").strip()
    if not source:
        raise BadOutputError("There is no text to work with")
    truncated = len(source) > MAX_SOURCE_CHARS
    source = source[:MAX_SOURCE_CHARS]

    if MOCK_AI:
        print("[generate_study] MOCK_AI is on: fake result, no AI used")
        result = _mock(mode, title)
        result["truncated"] = truncated
        return result

    if mode == "summary":
        prompt = _summary_prompt(title, source, level)
    else:
        prompt = _notes_prompt(title, source, level)

    raw = _get_answer_text(prompt, groq_suffix=STUDY_GROQ_SUFFIX)
    data = _parse_object(raw)

    if mode == "summary":
        result = _clean_summary(data, title)
    else:
        result = _clean_notes(data, title, level, source)
    result["truncated"] = truncated
    return result