import math

from app.core.deps import get_current_user
from app.db import get_db
from app.models.folder import FolderModel
from app.models.note import NoteModel
from app.models.user import UserModel
from app.schemas.note import Note, NoteCreate, NotesPage
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/notes",
    tags=["notes"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=NotesPage)
def get_notes(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    folder_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
):
    query = db.query(NoteModel).filter(NoteModel.user_id == current_user.id)

    if status:
        query = query.filter(NoteModel.status == status)

    if folder_id is not None:
        query = query.filter(NoteModel.folder_id == folder_id)

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

    items = query.order_by(NoteModel.id.desc()).offset(offset).limit(limit).all()

    pages = math.ceil(total / limit) if total > 0 else 0

    return NotesPage(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{note_id}", response_model=Note)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    db_note = (
        db.query(NoteModel)
        .filter(NoteModel.id == note_id, NoteModel.user_id == current_user.id)
        .first()
    )
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return db_note


@router.post("", response_model=Note)
def create_note(
    note: NoteCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    if note.folder_id is not None:
        exists = db.query(FolderModel.id).filter(FolderModel.id == note.folder_id).first()
        if exists is None:
            raise HTTPException(status_code=422, detail="Invalid folder_id (folder not found)")

    db_note = NoteModel(
        title=note.title,
        content=note.content,
        status=note.status,
        folder_id=note.folder_id,
        user_id=current_user.id,
    )

    db.add(db_note)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="Invalid folder_id (foreign key constraint)")

    db.refresh(db_note)
    return db_note


@router.put("/{note_id}", response_model=Note)
def update_note(
    note_id: int,
    updated_note: NoteCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    db_note = (
        db.query(NoteModel)
        .filter(NoteModel.id == note_id, NoteModel.user_id == current_user.id)
        .first()
    )
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    if updated_note.folder_id is not None:
        exists = db.query(FolderModel.id).filter(FolderModel.id == updated_note.folder_id).first()
        if exists is None:
            raise HTTPException(status_code=422, detail="Invalid folder_id (folder not found)")

    db_note.title = updated_note.title
    db_note.content = updated_note.content
    db_note.status = updated_note.status
    db_note.folder_id = updated_note.folder_id

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="Invalid folder_id (foreign key constraint)")

    db.refresh(db_note)
    return db_note


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    db_note = (
        db.query(NoteModel)
        .filter(NoteModel.id == note_id, NoteModel.user_id == current_user.id)
        .first()
    )
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(db_note)
    db.commit()
    return {"deleted": note_id}