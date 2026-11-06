import sys
import os

# Lets this file import study_planner.py from the ai-service root folder
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from study_planner import build_plan

router = APIRouter()

MAX_ITEMS_IN = 50  # the engine plans at most 12, this just protects the server


class PlanRequest(BaseModel):
    # Weak topics shaped like the Why-Stuck weak_subtopics (topic, subtopic, ...)
    items: List[Dict[str, Any]] = []
    start_date: str  # "YYYY-MM-DD", sent by the browser (no timezone problems)
    target_date: str  # "YYYY-MM-DD"
    minutes_per_day: int = 60
    # {"0": 30, "6": 0} with Monday = 0 and 0 = rest day
    minutes_by_weekday: Optional[Dict[str, int]] = None


@router.post("/build")
def build(data: PlanRequest):
    if len(data.items) > MAX_ITEMS_IN:
        raise HTTPException(status_code=400, detail="Too many topics. Please pick fewer.")

    try:
        plan = build_plan(
            data.items,
            data.start_date,
            data.target_date,
            data.minutes_per_day,
            data.minutes_by_weekday,
        )
    except ValueError as err:
        # The engine writes friendly messages (bad date, past exam date, all rest days...)
        raise HTTPException(status_code=400, detail=str(err))

    return plan