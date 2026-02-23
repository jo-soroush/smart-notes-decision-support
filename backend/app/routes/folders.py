from typing import List

from app.db import get_db
from app.models.folder import FolderModel
from app.schemas.folder import Folder, FolderCreate
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=List[Folder])
def get_folders(db: Session = Depends(get_db)):
    folders = db.query(FolderModel).order_by(FolderModel.id.desc()).all()
    return folders


@router.post("", response_model=Folder)
def create_folder(folder: FolderCreate, db: Session = Depends(get_db)):
    existing = db.query(FolderModel).filter(FolderModel.name == folder.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Folder name already exists")

    db_folder = FolderModel(name=folder.name)
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder