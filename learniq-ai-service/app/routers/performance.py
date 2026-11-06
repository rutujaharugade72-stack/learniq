import os
import joblib
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

# Load the model once, when this module is first imported
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "model_performance_classifier.pkl")
model = joblib.load(MODEL_PATH)

FEATURE_ORDER = ["num_attempts", "avg_time_taken", "avg_hints_used", "accuracy_trend", "hard_accuracy"]


class PerformanceInput(BaseModel):
    topic: str = Field(..., description="The topic being evaluated, e.g. 'Recursion'")
    num_attempts: int = Field(..., ge=1, description="Number of questions attempted on this topic")
    avg_time_taken: float = Field(..., ge=0, description="Average seconds spent per question")
    avg_hints_used: float = Field(..., ge=0, description="Average hints used per question")
    accuracy_trend: float = Field(..., description="Second-half accuracy minus first-half accuracy")
    hard_accuracy: float = Field(..., description="Accuracy on Hard-difficulty questions, or -1 if none attempted")


class PerformanceOutput(BaseModel):
    topic: str
    label: str
    confidence: float


@router.post("/analyze", response_model=PerformanceOutput)
def analyze_performance(data: PerformanceInput):
    features = [[
        data.num_attempts,
        data.avg_time_taken,
        data.avg_hints_used,
        data.accuracy_trend,
        data.hard_accuracy,
    ]]

    prediction = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0]
    confidence = round(max(probabilities), 3)

    return PerformanceOutput(
        topic=data.topic,
        label=prediction,
        confidence=confidence,
    )