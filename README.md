# LearnIQ — AI-Powered Personalized Study Platform

LearnIQ is a full-stack, multi-service learning platform that converts uploaded study materials (PDF, DOCX, PPTX) into structured revision notes, interactive MCQ quizzes, and diagnostic learning telemetry.

**Live Application:** [learniq-frontend.vercel.app](https://learniq-frontend.vercel.app)

---

## Architecture Overview

LearnIQ follows a decoupled three-tier architecture:

1. **Frontend (`learniq-frontend`)** — Single-page React application hosted on **Vercel** with API reverse proxy rewrites.
2. **Core API Gateway (`learniq-backend`)** — RESTful Node.js & Express server hosted on **Render**, managing authentication (JWT + bcrypt), user progress, study materials, and MongoDB persistence.
3. **AI/ML Microservice (`learniq-ai-service`)** — Python **FastAPI** engine hosted on **Render**, powering document parsing, RAG retrieval, MCQ generation, smart revision notes, and performance/career recommendations via Google Gemini (`google-genai`) and Scikit-Learn.

---

## Key Features

* **PDF & Document Intelligence:** Upload PDF, Word, or PowerPoint files to extract, index, and organize study sections into a personal shelf.
* **Smart Notes & Summaries:** Automatically generate structured revision notes and concise study summaries from uploaded materials.
* **Interactive MCQ Quiz Arena:** Customizable Practice and Exam modes with configurable question counts, difficulty levels, hints, and instant explanations.
* **AI Study Agents:** Context-aware tutoring (`AI Teacher`), conceptual troubleshooting (`Why Am I Stuck?`), and personalized study scheduling (`Study Planner`).
* **Diagnostic Telemetry:** Tracks quiz performance, learning streaks, and topic mastery.

---

## Tech Stack

| Layer | Technologies | Deployment |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, JavaScript, CSS | Vercel |
| **Backend API** | Node.js, Express, JWT, Bcrypt, Multer | Render |
| **AI/ML Service** | Python, FastAPI, Uvicorn, Google GenAI, Scikit-Learn, PyMuPDF | Render |
| **Database** | MongoDB Atlas | Cloud (AWS Mumbai) |

---

## Repository Structure

```text
learniq/
├── learniq-frontend/     # React client application & Vercel rewrite config
├── learniq-backend/      # Express REST API, auth middleware, & MongoDB models
├── learniq-ai-service/   # FastAPI AI/ML microservice & document pipelines
└── package.json          # Root workspace configuration
```

---

## Local Development Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/rutujaharugade72-stack/learniq.git](https://github.com/rutujaharugade72-stack/learniq.git)
cd learniq
```

### 2. Start the AI Microservice (`learniq-ai-service`)
```bash
cd learniq-ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*Required environment variable:* `GEMINI_API_KEY`

### 3. Start the Express Backend (`learniq-backend`)
```bash
cd learniq-backend
npm install
npm start
```
*Required environment variables:* `MONGO_URI`, `JWT_SECRET`, `AI_SERVICE_URL=http://localhost:8000`

### 4. Start the React Frontend (`learniq-frontend`)
```bash
cd learniq-frontend
npm install
npm run dev
```

---

## Service Endpoints

* **Frontend App:** `https://learniq-frontend.vercel.app`
* **Backend API:** `https://learniq-backend-krb0.onrender.com`
* **AI Service Swagger Docs:** `https://learniq-1pcg.onrender.com/docs`
