from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="LEARNIQ AI/ML Service",
    description="AI/ML engine for the LEARNIQ personalized learning platform.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "learniq-ai-service",
        "status": "ok",
        "message": "LEARNIQ AI/ML service is running.",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


from app.routers import performance
app.include_router(performance.router, prefix="/api/performance", tags=["Performance Analysis"])

from app.routers import career
app.include_router(career.router, prefix="/api/career", tags=["Career Recommendation"])

from app.routers import pdf_intelligence
app.include_router(pdf_intelligence.router, prefix="/api/pdf", tags=["PDF Intelligence"])

from app.routers import notes
app.include_router(notes.router, prefix="/api/notes", tags=["Smart Notes"])

from app.routers import why_stuck
app.include_router(why_stuck.router, prefix="/api/why-stuck", tags=["Why Am I Stuck"])

from app.routers import mcq
app.include_router(mcq.router, prefix="/api/mcq", tags=["MCQ Generator"])

from app.routers import adaptive_quiz
app.include_router(adaptive_quiz.router, prefix="/api/quiz", tags=["Adaptive Quiz"])

from app.routers import assistant
app.include_router(assistant.router, prefix="/api/assistant", tags=["AI Teacher"])

from app.routers import planner
app.include_router(planner.router, prefix="/api/planner", tags=["Study Planner"])