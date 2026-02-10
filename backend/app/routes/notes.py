from typing import List

from app.schemas.note import Note
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/notes", tags=["notes"])

# In-memory storage (temporary, no database)
notes_db: List[Note] = [
    Note(id=1, title="First note", content="Hello from backend", status="draft")
]


@router.get("", response_model=List[Note])
def get_notes():
    return notes_db


@router.post("", response_model=Note)
def create_note(note: Note):
    notes_db.append(note)
    return note


@router.put("/{note_id}", response_model=Note)
def update_note(note_id: int, updated_note: Note):
    for index, note in enumerate(notes_db):
        if note.id == note_id:
            updated_note.id = note_id
            notes_db[index] = updated_note
            return updated_note

    raise HTTPException(status_code=404, detail="Note not found")
