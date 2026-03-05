
from app.core.deps import get_current_user
from app.db import get_db
from app.models.user import UserModel
from app.schemas.note import Note, NoteCreate, NotesPage
from app.services.notes_service import (
    create_note_service,
    delete_note_service,
    get_note_by_id,
    list_notes,
    update_note_service,
)
from fastapi import APIRouter, Depends, HTTPException, Query
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
    exclude_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
):
    return list_notes(
        db=db,
        user_id=current_user.id,
        search=search,
        status=status,
        folder_id=folder_id,
        exclude_type=exclude_type,
        page=page,
        limit=limit,
    )


@router.get("/{note_id}", response_model=Note)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    db_note = get_note_by_id(
        db=db,
        user_id=current_user.id,
        note_id=note_id,
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
    try:
        return create_note_service(
            db=db,
            user_id=current_user.id,
            note=note,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.put("/{note_id}", response_model=Note)
def update_note(
    note_id: int,
    updated_note: NoteCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    try:
        return update_note_service(
            db=db,
            user_id=current_user.id,
            note_id=note_id,
            updated_note=updated_note,
        )
    except ValueError as e:
        if str(e) == "Note not found":
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=422, detail=str(e))


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    try:
        delete_note_service(
            db=db,
            user_id=current_user.id,
            note_id=note_id,
        )
        return {"deleted": note_id}
    except ValueError:
        raise HTTPException(status_code=404, detail="Note not found")