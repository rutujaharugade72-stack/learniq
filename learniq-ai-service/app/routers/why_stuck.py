import sys
import os
from collections import defaultdict

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from why_stuck_analysis import (
    load_attempts,
    get_student_topic_attempts,
    analyze_by_subtopic,
    generate_weakness_statement,
    build_recovery_plan,
    build_insight,
    compute_baseline_seconds,
    WEAK_THRESHOLD,
    MIN_ATTEMPTS_TO_TRUST,
)

router = APIRouter()

DATA_PATH = "data/quiz_attempts_sample.csv"


class WhyStuckRequest(BaseModel):
    student_id: str
    topic: str


class SubtopicBreakdown(BaseModel):
    subtopic: str
    attempts: int
    accuracy: float
    avg_hints_used: float
    avg_time_seconds: float = 0
    insight: Optional[str] = None
    insight_label: Optional[str] = None
    insight_text: Optional[str] = None
    then_accuracy: Optional[float] = None
    now_accuracy: Optional[float] = None
    trend: Optional[str] = None


class RecoveryStep(BaseModel):
    step: int
    action: str
    description: str


class WhyStuckResponse(BaseModel):
    student_id: str
    topic: str
    subtopic_breakdown: List[SubtopicBreakdown]
    message: str
    weak_subtopic: Optional[str]
    recovery_plan: Optional[List[RecoveryStep]]


# ---------- Old endpoint: sample CSV (kept for now) ----------
@router.post("/analyze", response_model=WhyStuckResponse)
def analyze(data: WhyStuckRequest):
    attempts = load_attempts(DATA_PATH)
    student_attempts = get_student_topic_attempts(attempts, data.student_id, data.topic)
    subtopic_analysis = analyze_by_subtopic(student_attempts)
    weakness = generate_weakness_statement(data.topic, subtopic_analysis)

    recovery_plan = None
    if weakness.get("weak_subtopic"):
        plan = build_recovery_plan(data.topic, weakness["weak_subtopic"])
        recovery_plan = plan["steps"]

    return WhyStuckResponse(
        student_id=data.student_id,
        topic=data.topic,
        subtopic_breakdown=subtopic_analysis,
        message=weakness["message"],
        weak_subtopic=weakness.get("weak_subtopic"),
        recovery_plan=recovery_plan,
    )


# ---------- New endpoint: real attempts of one student ----------
class AttemptIn(BaseModel):
    topic: str
    subtopic: str = ""
    is_correct: bool
    hints_used: int = 0
    time_taken_seconds: float = 0


class AttemptsRequest(BaseModel):
    # IMPORTANT: attempts must be in time order, OLDEST FIRST
    attempts: List[AttemptIn]


class TopicResult(BaseModel):
    topic: str
    attempts: int
    accuracy: float
    message: str
    weak_subtopic: Optional[str]
    subtopic_breakdown: List[SubtopicBreakdown]


class WeakItem(BaseModel):
    topic: str
    subtopic: str
    accuracy: float
    attempts: int
    avg_time_seconds: float = 0
    insight: Optional[str] = None
    insight_label: Optional[str] = None
    insight_text: Optional[str] = None
    then_accuracy: Optional[float] = None
    now_accuracy: Optional[float] = None
    trend: Optional[str] = None


class RealResponse(BaseModel):
    total_attempts: int
    topics: List[TopicResult]
    weak_subtopics: List[WeakItem]
    recovery_topic: Optional[str]
    recovery_subtopic: Optional[str]
    recovery_plan: Optional[List[RecoveryStep]]


@router.post("/analyze-attempts", response_model=RealResponse)
def analyze_attempts(data: AttemptsRequest):
    # Convert to the same row format the existing rule engine expects
    rows = [
        {
            "topic": a.topic,
            "subtopic": a.subtopic or a.topic,
            "is_correct": "1" if a.is_correct else "0",
            "hints_used": str(a.hints_used),
            "time_taken_seconds": str(a.time_taken_seconds),
        }
        for a in data.attempts
    ]

    # The student's own average time per question, used to judge "slow" or "fast"
    baseline = compute_baseline_seconds(rows)

    by_topic = defaultdict(list)
    for r in rows:
        by_topic[r["topic"]].append(r)

    topics_out = []
    weak_all = []

    for topic, trows in by_topic.items():
        subtopics = analyze_by_subtopic(trows)

        # Rule-based guess: concept gap or careless mistakes (only when the signal is clear)
        for s in subtopics:
            s.update(build_insight(s, baseline))

        weakness = generate_weakness_statement(topic, subtopics)
        correct = sum(1 for r in trows if r["is_correct"] == "1")

        topics_out.append(
            TopicResult(
                topic=topic,
                attempts=len(trows),
                accuracy=round(correct / len(trows), 3),
                message=weakness["message"],
                weak_subtopic=weakness.get("weak_subtopic"),
                subtopic_breakdown=subtopics,
            )
        )

        for s in subtopics:
            if s["attempts"] >= MIN_ATTEMPTS_TO_TRUST and s["accuracy"] < WEAK_THRESHOLD:
                weak_all.append(
                    WeakItem(
                        topic=topic,
                        subtopic=s["subtopic"],
                        accuracy=s["accuracy"],
                        attempts=s["attempts"],
                        avg_time_seconds=s.get("avg_time_seconds", 0),
                        insight=s.get("insight"),
                        insight_label=s.get("insight_label"),
                        insight_text=s.get("insight_text"),
                        then_accuracy=s.get("then_accuracy"),
                        now_accuracy=s.get("now_accuracy"),
                        trend=s.get("trend"),
                    )
                )

    # Weakest first; with equal accuracy, the one with more attempts is more trustworthy
    weak_all.sort(key=lambda w: (w.accuracy, -w.attempts))
    topics_out.sort(key=lambda t: t.accuracy)

    recovery_plan = None
    recovery_topic = None
    recovery_subtopic = None
    if weak_all:
        recovery_topic = weak_all[0].topic
        recovery_subtopic = weak_all[0].subtopic
        recovery_plan = build_recovery_plan(recovery_topic, recovery_subtopic)["steps"]

    return RealResponse(
        total_attempts=len(rows),
        topics=topics_out,
        weak_subtopics=weak_all,
        recovery_topic=recovery_topic,
        recovery_subtopic=recovery_subtopic,
        recovery_plan=recovery_plan,
    )