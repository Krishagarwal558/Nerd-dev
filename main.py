import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from engine import (
    generate_course,
    stream_doubt,
    grade_solution,
    check_ollama_health,
    DEFAULT_MODEL
)

app = FastAPI(title="Peak AI Tutor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schemas
class CourseRequest(BaseModel):
    topic: str
    level: str = "intermediate"
    minutes: int = 20
    model: str = DEFAULT_MODEL

class DoubtRequest(BaseModel):
    topic: str
    slide_title: str
    slide_insight: str
    doubt: str
    mode: str = "analogy"
    model: str = DEFAULT_MODEL

class GradeRequest(BaseModel):
    topic: str
    challenge: str
    solution: str
    model: str = DEFAULT_MODEL

# Ensure static folder exists
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

@app.get("/api/status")
def get_status(model: str = DEFAULT_MODEL):
    return check_ollama_health(model)

@app.post("/api/course/generate")
def api_generate_course(req: CourseRequest):
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic is required")
    data = generate_course(req.topic, req.level, req.minutes, req.model)
    return data

@app.post("/api/doubt/stream")
def api_stream_doubt(req: DoubtRequest):
    generator = stream_doubt(
        topic=req.topic,
        slide_title=req.slide_title,
        slide_insight=req.slide_insight,
        doubt=req.doubt,
        mode=req.mode,
        model=req.model
    )
    return StreamingResponse(generator, media_type="text/plain")

@app.post("/api/synthesis/grade")
def api_grade_solution(req: GradeRequest):
    return grade_solution(req.topic, req.challenge, req.solution, req.model)

@app.get("/")
def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("<h1>Peak AI Tutor: Static index.html not found</h1>")

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Peak AI Tutor (Python + FastAPI)")
    print("Open in browser: http://localhost:8000")
    print("=" * 60 + "\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
