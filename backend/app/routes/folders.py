from app.db import get_db
from app.models.folder import FolderModel
from app.models.note import NoteModel
from app.schemas.folder import Folder, FolderCreate, FolderWithCount
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=list[Folder])
def get_folders(db: Session = Depends(get_db)):
    return db.query(FolderModel).order_by(FolderModel.id.asc()).all()


# ✅ NEW: folders with note_count (for cleaner UI)
@router.get("/with_counts", response_model=list[FolderWithCount])
def get_folders_with_counts(db: Session = Depends(get_db)):
    rows = (
        db.query(
            FolderModel.id.label("id"),
            FolderModel.name.label("name"),
            func.count(NoteModel.id).label("note_count"),
        )
        .outerjoin(NoteModel, NoteModel.folder_id == FolderModel.id)
        .group_by(FolderModel.id, FolderModel.name)
        .order_by(FolderModel.id.asc())
        .all()
    )

    return [{"id": r.id, "name": r.name, "note_count": int(r.note_count)} for r in rows]


@router.post("", response_model=Folder)
def create_folder(folder: FolderCreate, db: Session = Depends(get_db)):
    db_folder = FolderModel(name=folder.name)
    db.add(db_folder)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Folder name already exists")
    db.refresh(db_folder)
    return db_folder


@router.put("/{folder_id}", response_model=Folder)
def update_folder(folder_id: int, folder: FolderCreate, db: Session = Depends(get_db)):
    db_folder = db.query(FolderModel).filter(FolderModel.id == folder_id).first()
    if db_folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")

    db_folder.name = folder.name

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Folder name already exists")

    db.refresh(db_folder)
    return db_folder


@router.delete("/{folder_id}")
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    db_folder = db.query(FolderModel).filter(FolderModel.id == folder_id).first()
    if db_folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")

    db.query(NoteModel).filter(NoteModel.folder_id == folder_id).update(
        {"folder_id": None},
        synchronize_session=False,
    )

    db.delete(db_folder)
    db.commit()

    return {"deleted": folder_id}