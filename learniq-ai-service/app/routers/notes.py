import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from google.genai import errors

from generate_notes import generate_notes_for_topic
from generate_study import generate_study
from generate_mcqs import GeminiBusyError, BadOutputError

router = APIRouter()


# ---------- Old endpoint (kept so nothing that used it breaks) ----------
class NotesRequest(BaseModel):
    topic_name: str
    topic_text: str


class NotesResponse(BaseModel):
    topic_name: str
    notes: str


@router.post("/generate", response_model=NotesResponse)
def generate(data: NotesRequest):
    notes = generate_notes_for_topic(data.topic_name, data.topic_text)
    return NotesResponse(topic_name=data.topic_name, notes=notes)


# ---------- New: structured notes and summaries ----------
class StudyRequest(BaseModel):
    mode: str = Field(default="notes", max_length=10)  # "notes" or "summary"
    title: str = Field(default="", max_length=120)
    text: str = Field(min_length=1, max_length=400000)
    level: Optional[str] = Field(default=None, max_length=20)


class NoteSection(BaseModel):
    heading: str
    points: List[str]


class KeyTerm(BaseModel):
    term: str
    meaning: str


class NoteTable(BaseModel):
    title: str
    columns: List[str]
    rows: List[List[str]]


class ChartItem(BaseModel):
    label: str
    value: float


class NoteChart(BaseModel):
    title: str
    unit: str = ""
    items: List[ChartItem]


class StudyResponse(BaseModel):
    mode: str
    title: str
    overview: str = ""
    sections: List[NoteSection] = []
    key_terms: List[KeyTerm] = []
    quick_revision: List[str] = []
    tables: List[NoteTable] = []
    charts: List[NoteChart] = []
    summary: str = ""
    key_takeaways: List[str] = []
    truncated: bool = False


@router.post("/study", response_model=StudyResponse)
def study(data: StudyRequest):
    try:
        result = generate_study(data.mode, data.title, data.text, data.level)
    except GeminiBusyError as e:
        print(f"[notes] AI busy: {str(e)[:200]}")
        raise HTTPException(status_code=503, detail="AI is busy right now")
    except BadOutputError as e:
        print(f"[notes] Bad AI output: {e}")
        raise HTTPException(status_code=502, detail=str(e))
    except errors.APIError as e:
        print(f"[notes] Gemini error: {e}")
        raise HTTPException(status_code=502, detail=f"Gemini error: {e}")
    return StudyResponse(**result)