"""
LEARNIQ - File Intelligence Router

Accepts an uploaded study file, extracts its text, and splits it into
sections (heading -> content) so Notes, MCQ and the AI Teacher can use it.

Supported: PDF, PPTX, DOCX, TXT and photos (JPG, PNG, WEBP, HEIC).
The address stays /api/pdf/upload and the answer has the same shape as
before, so nothing that already uses it breaks.
"""

import sys
import os
import tempfile
import time

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from google.genai import errors, types

from extract_pdf_text import extract_text
from clean_pdf_text import clean_text
from split_sections import split_into_sections
from generate_mcqs import client, MODEL, MOCK_AI

router = APIRouter()

MIN_SECTION_LENGTH = 40  # shorter pieces are merged into a neighbour, not thrown away
RETRY_CODES = {429, 500, 503, 504}

IMAGE_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".heif": "image/heif",
}
DOC_TYPES = {".pdf", ".pptx", ".docx", ".txt"}
OLD_FORMATS = {
    ".ppt": "Old .ppt files cannot be read. Please save it as .pptx and upload again.",
    ".doc": "Old .doc files cannot be read. Please save it as .docx and upload again.",
}

VISION_PROMPT = """You are reading a photo of study material (a textbook page, printed notes,
handwritten notes or a whiteboard).

Write down ALL the readable text exactly as it appears. Rules:
- Put each heading on its own line.
- Keep bullet points and numbered lists, one item per line.
- For tables or diagrams, write the text you can read, row by row.
- Do NOT explain, summarize or add anything that is not in the photo.
- Do NOT use markdown symbols such as ** or #.
- If there is no readable text at all, reply with exactly: NO_TEXT"""


class SectionItem(BaseModel):
    heading: str
    content: str


class PDFAnalysisResponse(BaseModel):
    filename: str
    character_count: int
    sections: List[SectionItem]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _merge_short(pairs, default_heading="Section"):
    """pairs = [(heading, content), ...]. Tiny pieces are joined to a neighbour
    so no text is lost. Returns a list of {"heading", "content"}."""
    sections = []
    pending = ""
    for heading, content in pairs:
        heading = (heading or "").strip()[:200] or default_heading
        content = (content or "").strip()
        if not content:
            continue
        if len(content) < MIN_SECTION_LENGTH:
            piece = f"{heading}: {content}"
            if sections:
                sections[-1]["content"] += " " + piece
            else:
                pending += piece + " "
            continue
        if pending:
            content = pending + content
            pending = ""
        sections.append({"heading": heading, "content": content})

    if pending.strip():
        if sections:
            sections[-1]["content"] += " " + pending.strip()
        else:
            sections.append({"heading": default_heading, "content": pending.strip()})
    return sections


def _sections_from_text(text, default_heading):
    """Plain text -> sections, using the same cleaner and splitter as PDFs."""
    cleaned = clean_text(text)
    found = split_into_sections(cleaned)
    if found:
        return [{"heading": h, "content": c} for h, c in found.items()]
    if len(cleaned) >= 20:
        return [{"heading": default_heading, "content": cleaned}]
    return []


# ---------------------------------------------------------------------------
# Readers, one per file type
# ---------------------------------------------------------------------------

def _read_pdf(path):
    raw = extract_text(path)
    cleaned = clean_text(raw)
    found = split_into_sections(cleaned)
    return [{"heading": h, "content": c} for h, c in found.items()]


def _shape_texts(shape):
    """All text inside one PowerPoint shape (text boxes, tables, groups)."""
    from pptx.enum.shapes import MSO_SHAPE_TYPE

    texts = []
    try:
        is_group = shape.shape_type == MSO_SHAPE_TYPE.GROUP
    except Exception:
        is_group = False

    if is_group:
        for inner in shape.shapes:
            texts.extend(_shape_texts(inner))
        return texts

    if getattr(shape, "has_text_frame", False) and shape.has_text_frame:
        for paragraph in shape.text_frame.paragraphs:
            t = paragraph.text.strip()
            if t:
                texts.append(t)

    if getattr(shape, "has_table", False) and shape.has_table:
        for row in shape.table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                texts.append(" | ".join(cells))
    return texts


def _read_pptx(path):
    from pptx import Presentation

    prs = Presentation(path)
    pairs = []
    for number, slide in enumerate(prs.slides, start=1):
        title_shape = slide.shapes.title
        title = ""
        if title_shape is not None and title_shape.has_text_frame:
            title = title_shape.text.strip()

        lines = []
        for shape in slide.shapes:
            if title_shape is not None and shape.shape_id == title_shape.shape_id:
                continue
            lines.extend(_shape_texts(shape))

        pairs.append((title or f"Slide {number}", " ".join(lines)))
    return _merge_short(pairs, "Slides")


def _read_docx(path):
    from docx import Document

    doc = Document(path)
    pairs = []
    heading = "Introduction"
    lines = []
    flat = []
    found_heading = False

    for p in doc.paragraphs:
        text = p.text.strip()
        if not text:
            continue
        flat.append(text)
        style = (p.style.name if p.style is not None else "") or ""
        if style.startswith("Heading") or style == "Title":
            found_heading = True
            if lines:
                pairs.append((heading, " ".join(lines)))
                lines = []
            heading = text
        else:
            lines.append(text)

    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                row_text = " | ".join(cells)
                lines.append(row_text)
                flat.append(row_text)

    if lines:
        pairs.append((heading, " ".join(lines)))

    if found_heading:
        return _merge_short(pairs, "Document")
    return _sections_from_text("\n".join(flat), "Document")


def _read_txt(data):
    text = data.decode("utf-8", errors="ignore")
    return _sections_from_text(text, "Text")


def _read_image(data, mime):
    """Gemini reads the text in a photo. One call, no Groq backup (Groq cannot see images)."""
    if MOCK_AI:
        print("[files] MOCK_AI is on: returning fake photo text, no AI used")
        time.sleep(1)
        return (
            "[MOCK] Photo notes\n"
            "This is fake text read from a photo. MOCK_AI is on, so no AI was used. "
            "It is long enough to make notes from."
        )

    text = ""
    for attempt in (1, 2):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=[types.Part.from_bytes(data=data, mime_type=mime), VISION_PROMPT],
                config=types.GenerateContentConfig(temperature=0.1),
            )
            text = (response.text or "").strip()
            break
        except errors.APIError as e:
            code = getattr(e, "code", None)
            print(f"[files] Gemini photo read failed (attempt {attempt}, code {code}): {str(e)[:200]}")
            if code in RETRY_CODES:
                if attempt == 1:
                    time.sleep(6)
                    continue
                raise HTTPException(
                    status_code=503,
                    detail="The AI is busy right now. Please try again in a few seconds.",
                )
            raise HTTPException(
                status_code=502, detail="Could not read this photo. Please try another one."
            )

    if not text or text.strip() == "NO_TEXT":
        raise HTTPException(
            status_code=422,
            detail="I could not find readable text in this photo. Try a clearer, well-lit photo.",
        )
    return text


def _extract(data, ext):
    """Picks the right reader for the file type. Returns a list of sections."""
    if ext == ".txt":
        return _read_txt(data)

    if ext in IMAGE_TYPES:
        return _sections_from_text(_read_image(data, IMAGE_TYPES[ext]), "Photo notes")

    # PDF, PPTX and DOCX are read from a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    try:
        if ext == ".pdf":
            return _read_pdf(tmp_path)
        if ext == ".pptx":
            return _read_pptx(tmp_path)
        return _read_docx(tmp_path)
    finally:
        os.remove(tmp_path)


# ---------------------------------------------------------------------------
# The endpoint (same address as before)
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=PDFAnalysisResponse)
async def upload_file(file: UploadFile = File(...)):
    name = file.filename or "file"
    ext = os.path.splitext(name)[1].lower()

    if ext in OLD_FORMATS:
        raise HTTPException(status_code=400, detail=OLD_FORMATS[ext])
    if ext not in DOC_TYPES and ext not in IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="This file type is not supported. Use a PDF, PPTX, DOCX, TXT or a photo (JPG, PNG, WEBP).",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The file is empty.")

    try:
        sections = await run_in_threadpool(_extract, data, ext)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[files] could not read {name}: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=422,
            detail="Could not read this file. It may be damaged or password protected.",
        )

    return PDFAnalysisResponse(
        filename=name,
        character_count=sum(len(s["content"]) for s in sections),
        sections=[SectionItem(**s) for s in sections],
    )