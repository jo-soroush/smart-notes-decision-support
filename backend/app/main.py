import os
from pathlib import Path

from app.core.logging import logger
from app.integrations.mis.routes import router as mis_router
from app.routes.activity_logs import router as activity_logs_router
from app.routes.ai import router as ai_router
from app.routes.auth import router as auth_router
from app.routes.folders import router as folders_router
from app.routes.notes import router as notes_router
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# backend/.env  (this file is backend/app/main.py)
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"

# Load env file explicitly
load_dotenv(dotenv_path=ENV_PATH, override=True)

# Hard-fail early if the key is not loaded
if not os.getenv("GEMINI_API_KEY"):
    raise RuntimeError(f"GEMINI_API_KEY not loaded. Expected .env at: {ENV_PATH}")


app = FastAPI(title="Smart Notes API", version="0.1.0")
logger.info("Smart Notes API starting...")

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

# Routers
app.include_router(notes_router)
app.include_router(ai_router)
app.include_router(folders_router)
app.include_router(auth_router)
app.include_router(mis_router)
app.include_router(activity_logs_router)


@app.get("/health", response_model=dict)
def health_check():
    return {"status": "ok"}