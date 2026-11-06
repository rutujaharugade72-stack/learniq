import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from google.genai import errors

from generate_mcqs import generate_mcqs, GeminiBusyError, BadOutputError

router = APIRouter()


class MCQRequest(BaseModel):
    mode: str = "text"  # "text" (paragraph / PDF) or "syllabus"
    topic_name: str = ""
    topic_text: str = ""
    board: str = ""
    level: str = ""
    subject: str = ""
    chapter: str = ""
    extra: str = ""
    num_questions: int = Field(default=3, ge=1, le=25)
    difficulty: str = "Medium"
    question_type: str = "Mixed"
    explanation_style: str = "Short"


class MCQItem(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str = ""
    subtopic: str = ""
    hint: str = ""
    # Where in the student's material the answer is found (checked against the real text)
    source_heading: str = ""
    source_quote: str = ""


class MCQResponse(BaseModel):
    topic_name: str
    mcqs: List[MCQItem]


@router.post("/generate", response_model=MCQResponse)
def generate(data: MCQRequest):
    if data.mode == "syllabus":
        if not data.subject.strip():
            raise HTTPException(status_code=400, detail="subject is required")
        topic_name = (
            f"{data.subject} - {data.chapter}" if data.chapter.strip() else data.subject
        )
    else:
        if not data.topic_name.strip() or not data.topic_text.strip():
            raise HTTPException(status_code=400, detail="topic_name and topic_text are required")
        topic_name = data.topic_name

    try:
        mcqs = generate_mcqs(
            mode=data.mode,
            topic_name=data.topic_name,
            topic_text=data.topic_text,
            board=data.board,
            level=data.level,
            subject=data.subject,
            chapter=data.chapter,
            extra=data.extra,
            num_questions=data.num_questions,
            difficulty=data.difficulty,
            question_type=data.question_type,
            explanation_style=data.explanation_style,
        )
    except GeminiBusyError as e:
        print(f"[mcq] Gemini busy: {e}")
        raise HTTPException(status_code=503, detail="AI is busy right now")
    except BadOutputError as e:
        print(f"[mcq] Bad AI output: {e}")
        raise HTTPException(status_code=502, detail=str(e))
    except errors.APIError as e:
        print(f"[mcq] Gemini error: {e}")
        raise HTTPException(status_code=502, detail=f"Gemini error: {e}")

    return MCQResponse(topic_name=topic_name, mcqs=mcqs)