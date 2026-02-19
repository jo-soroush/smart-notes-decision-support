import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# backend/.env  (this file is backend/app/main.py)
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"

# Load env file explicitly
load_dotenv(dotenv_path=ENV_PATH, override=True)

# Hard-fail early if the key is not loaded (prevents hidden 500 later)
if not os.getenv("GEMINI_API_KEY"):
    raise RuntimeError(f"GEMINI_API_KEY not loaded. Expected .env at: {ENV_PATH}")

from app.routes.ai import router as ai_router
from app.routes.notes import router as notes_router

app = FastAPI(title="Smart Notes API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes_router)
app.include_router(ai_router)


@app.get("/health", response_model=dict)
def health_check():
    return {"status": "ok"}
