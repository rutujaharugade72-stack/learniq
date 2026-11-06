import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from adaptive_quiz import get_next_difficulty

router = APIRouter()


class NextDifficultyRequest(BaseModel):
    current_difficulty: str
    recent_results: List[bool]


class NextDifficultyResponse(BaseModel):
    next_difficulty: str


@router.post("/next-difficulty", response_model=NextDifficultyResponse)
def next_difficulty(data: NextDifficultyRequest):
    next_diff = get_next_difficulty(data.current_difficulty, data.recent_results)
    return NextDifficultyResponse(next_difficulty=next_diff)