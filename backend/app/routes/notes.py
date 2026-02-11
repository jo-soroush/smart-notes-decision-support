
from typing import List

from app.db import get_db
from app.models.note import NoteModel
from app.schemas.note import Note
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/notes", tags=["notes"])

# In-memory storage (temporary, no database)
notes_db: List[Note] = [
    Note(id=1, title="First note", content="Hello from backend", status="draft")
]


@router.get("", response_model=list[Note])
def get_notes(db: Session = Depends(get_db)):
    notes = db.query(NoteModel).all()
    return notes



@router.post("", response_model=Note)
def create_note(note: Note, db: Session = Depends(get_db)):
    db_note = NoteModel(
        title=note.title,
        content=note.content,
        status=note.status
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note



@router.put("/{note_id}", response_model=Note)
def update_note(note_id: int, updated_note: Note, db: Session = Depends(get_db)):
    db_note = db.query(NoteModel).filter(NoteModel.id == note_id).first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    db_note.title = updated_note.title
    db_note.content = updated_note.content
    db_note.status = updated_note.status

    db.commit()
    db.refresh(db_note)
    return db_note


    raise HTTPException(status_code=404, detail="Note not found")


@router.delete("/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    db_note = db.query(NoteModel).filter(NoteModel.id == note_id).first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(db_note)
    db.commit()
    return {"deleted": note_id}


    raise HTTPException(status_code=404, detail="Note not found")
