from app.routes.notes import router as notes_router
from app.schemas.note import Note
from fastapi import FastAPI

app = FastAPI(title="Smart Notes API", version="0.1.0")

app.include_router(notes_router)


@app.get("/health", response_model=dict)
def health_check():
    return {"status": "ok"}

