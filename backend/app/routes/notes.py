from typing import List

from app.schemas.note import Note
from fastapi import APIRouter

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=List[Note])
def get_notes():
    return [
        Note(id=1, title="First note", content="Hello from backend", status="draft")
    ]

