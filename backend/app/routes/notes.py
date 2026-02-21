import math
from typing import List

from app.db import get_db
from app.models.note import NoteModel
from app.schemas.note import Note, NoteCreate, NotesPage
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

router = APIRouter(prefix="/notes", tags=["notes"])

# In-memory storage (temporary, no database)  # (unused, kept as legacy)
notes_db: List[Note] = [
    Note(id=1, title="First note", content="Hello from backend", status="draft")
]


@router.get("", response_model=NotesPage)
def get_notes(
    db: Session = Depends(get_db),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
):
    query = db.query(NoteModel)

    if status:
        query = query.filter(NoteModel.status == status)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                NoteModel.title.ilike(like),
                NoteModel.content.ilike(like),
            )
        )

    total = query.count()

    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()

    pages = math.ceil(total / limit) if total > 0 else 0

    return NotesPage(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.post("", response_model=Note)
def create_note(note: NoteCreate, db: Session = Depends(get_db)):
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
def update_note(note_id: int, updated_note: NoteCreate, db: Session = Depends(get_db)):
    db_note = db.query(NoteModel).filter(NoteModel.id == note_id).first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    db_note.title = updated_note.title
    db_note.content = updated_note.content
    db_note.status = updated_note.status

    db.commit()
    db.refresh(db_note)
    return db_note


@router.delete("/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    db_note = db.query(NoteModel).filter(NoteModel.id == note_id).first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(db_note)
    db.commit()
    return {"deleted": note_id}