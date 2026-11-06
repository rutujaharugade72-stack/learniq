import sys
import os

# Allow importing recommend_careers.py and careers_data.py from the
# project root (they live one level up from app/routers/)
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List

from recommend_careers import recommend_careers

router = APIRouter()


class CareerRequest(BaseModel):
    skills: List[str] = Field(..., description="List of the student's skills, e.g. ['python', 'statistics']")
    top_n: int = Field(3, ge=1, le=6, description="How many top career matches to return")


class CareerMatch(BaseModel):
    career: str
    match_percentage: float


class CareerResponse(BaseModel):
    skills_provided: List[str]
    recommendations: List[CareerMatch]


@router.post("/recommend", response_model=CareerResponse)
def recommend(data: CareerRequest):
    results = recommend_careers(data.skills, top_n=data.top_n)

    recommendations = [
        CareerMatch(career=name, match_percentage=round(score * 100, 1))
        for name, score in results
    ]

    return CareerResponse(
        skills_provided=data.skills,
        recommendations=recommendations,
    )