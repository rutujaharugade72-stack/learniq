import sys
import os
import json
import re
import base64
import traceback
import asyncio
from pathlib import Path

# Add project root to sys.path so sibling modules resolve
SERVICE_ROOT = Path(__file__).resolve().parents[2]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from dotenv import load_dotenv

# Ensure .env is loaded regardless of execution directory
for env_file in [
    SERVICE_ROOT / ".env",
    SERVICE_ROOT.parent / "learniq-backend" / ".env",
    SERVICE_ROOT.parent / ".env",
]:
    if env_file.exists():
        load_dotenv(dotenv_path=env_file, override=False)

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

try:
    from generate_mcqs import _get_answer_text
except ImportError:
    _get_answer_text = None

router = APIRouter()

CHAT_GROQ_SUFFIX = """
IMPORTANT OUTPUT FORMAT: Return ONE JSON object like {"reply": "your answer here"}.
Nothing else, no text before or after it."""

# Verified working model from direct API check
PRIMARY_MODEL = "gemini-3.5-flash"
BACKUP_MODEL = "gemini-3.7-flash"


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not defined in any .env file.")
    return genai.Client(api_key=api_key)


class ChatMessage(BaseModel):
    role: str = "user"
    text: str = Field(default="", max_length=1000)


class ChatRequest(BaseModel):
    question: str = Field(default="", max_length=5000)
    image: Optional[str] = None
    page: str = Field(default="", max_length=100)
    summary: str = Field(default="", max_length=600)
    details: Dict[str, Any] = {}
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    mode: str = "normal"


def _clean_reply(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()

    try:
        data = json.loads(cleaned)
        if isinstance(data, dict) and "reply" in data:
            return str(data["reply"]).strip()
    except Exception:
        pass

    match = re.search(r'\{\s*"reply"\s*:\s*"(.*?)"\s*\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0)).get("reply", "").strip()
        except Exception:
            pass

    return cleaned


def _run_gemini_vision(prompt: str, raw_bytes: bytes, mime_type: str) -> str:
    client = get_gemini_client()
    contents = [
        prompt,
        types.Part.from_bytes(data=raw_bytes, mime_type=mime_type),
    ]

    for model_name in [PRIMARY_MODEL, BACKUP_MODEL]:
        try:
            print(f"[AI-SERVICE] Vision calling: {model_name}...")
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
            )
            if response and response.text:
                print(f"[AI-SERVICE] Vision generated successfully with {model_name}!")
                return _clean_reply(response.text)
        except Exception as e:
            print(f"[AI-SERVICE] {model_name} error: {e}")
            continue

    raise RuntimeError("Both primary and backup vision models failed.")


@router.post("/chat", response_model=ChatResponse)
async def chat(data: ChatRequest):
    img_len = len(data.image) if data.image else 0
    question_text = data.question.strip() or "Please examine and describe what is shown in this image in detail."

    # Multimodal Vision
    if data.image and img_len > 100:
        print(f"\n[AI-SERVICE] Vision query: '{question_text[:50]}' (img: {img_len} chars)")

        prompt = (
            f"You are AI Teacher inside LearnIQ, an encouraging and expert tutor.\n\n"
            f"The user attached an image with this question: \"{question_text}\"\n\n"
            f"Thoroughly analyze and identify what is shown (characters, movie scenes, diagrams, textbook exercises, equations). "
            f"Explain everything step-by-step in an engaging, supportive tone.\n\n"
            f"Return ONLY valid JSON: {{\"reply\": \"your answer here\"}}"
        )

        try:
            raw_img = data.image
            if "," in raw_img:
                header, b64_str = raw_img.split(",", 1)
            else:
                header, b64_str = "data:image/jpeg;base64", raw_img

            mime_match = re.search(r"data:([^;]+);base64", header)
            mime_type = mime_match.group(1) if mime_match else "image/jpeg"
            raw_bytes = base64.b64decode(b64_str)

            reply = await asyncio.wait_for(
                asyncio.to_thread(_run_gemini_vision, prompt, raw_bytes, mime_type),
                timeout=30.0,
            )
            return ChatResponse(reply=reply, mode="normal")

        except asyncio.TimeoutError:
            print("[AI-SERVICE] Vision request timed out after 30s.")
            raise HTTPException(status_code=504, detail="Vision AI timed out. Please retry.")
        except Exception as e:
            print(f"[AI-SERVICE] Vision failed: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=502, detail=f"Vision model error: {str(e)}")

    # Text-Only Chat
    history_lines = []
    for m in data.history[-4:]:
        history_lines.append(f"{'Student' if m.role == 'user' else 'Teacher'}: {m.text[:400]}")
    history_str = "\n".join(history_lines) if history_lines else "(no prior messages)"

    prompt = f"""You are AI Teacher inside LearnIQ.
CONVERSATION HISTORY:
{history_str}

STUDENT'S QUESTION:
{question_text}

Provide a clear, supportive, and pedagogical explanation.
Return ONLY a JSON object: {{"reply": "your explanation here"}}"""

    try:
        if _get_answer_text:
            raw_text = await asyncio.wait_for(
                asyncio.to_thread(_get_answer_text, prompt, groq_suffix=CHAT_GROQ_SUFFIX),
                timeout=25.0,
            )
            reply = _clean_reply(raw_text)
        else:
            client = get_gemini_client()
            resp = client.models.generate_content(model=PRIMARY_MODEL, contents=prompt)
            reply = _clean_reply(resp.text)

        return ChatResponse(reply=reply, mode="normal")
    except Exception as e:
        print(f"[AI-SERVICE] Text error: {e}")
        raise HTTPException(status_code=502, detail=str(e))