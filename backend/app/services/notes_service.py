import math

from app.models.folder import FolderModel
from app.models.note import NoteModel
from app.schemas.note import NoteCreate, NotesPage
from app.services.activity_log_service import log_activity
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def list_notes(
    db: Session,
    user_id: int,
    search: str | None,
    status: str | None,
    folder_id: int | None,
    exclude_type: str | None,
    page: int,
    limit: int,
) -> NotesPage:
    query = db.query(NoteModel).filter(NoteModel.user_id == user_id)

    if exclude_type:
        query = query.filter(or_(NoteModel.type.is_(None), NoteModel.type != exclude_type))

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


def get_note_by_id(
    db: Session,
    user_id: int,
    note_id: int,
) -> NoteModel | None:
    note = (
        db.query(NoteModel)
        .filter(NoteModel.id == note_id, NoteModel.user_id == user_id)
        .first()
    )
    return note


def create_note_service(
    db: Session,
    user_id: int,
    note: NoteCreate,
) -> NoteModel:

    if note.folder_id is not None:
        exists = db.query(FolderModel.id).filter(FolderModel.id == note.folder_id).first()
        if exists is None:
            raise ValueError("Invalid folder_id (folder not found)")

    db_note = NoteModel(
        title=note.title,
        content=note.content,
        status=note.status,
        folder_id=note.folder_id,
        user_id=user_id,
        type=note.type,
        source_system=note.source_system,
        external_run_id=note.external_run_id,
        note_metadata=note.note_metadata,
    )

    db.add(db_note)
    db.flush()

    log_activity(
        db=db,
        user_id=user_id,
        event_type="note_created",
        entity_type="note",
        entity_id=db_note.id,
        event_metadata={
            "title": db_note.title,
            "status": db_note.status,
            "folder_id": db_note.folder_id,
        },
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Invalid folder_id (foreign key constraint)")

    db.refresh(db_note)

    return db_note


def update_note_service(
    db: Session,
    user_id: int,
    note_id: int,
    updated_note: NoteCreate,
) -> NoteModel:

    db_note = (
        db.query(NoteModel)
        .filter(NoteModel.id == note_id, NoteModel.user_id == user_id)
        .first()
    )

    if db_note is None:
        raise ValueError("Note not found")

    if updated_note.folder_id is not None:
        exists = db.query(FolderModel.id).filter(FolderModel.id == updated_note.folder_id).first()
        if exists is None:
            raise ValueError("Invalid folder_id (folder not found)")

    db_note.title = updated_note.title
    db_note.content = updated_note.content
    db_note.status = updated_note.status
    db_note.folder_id = updated_note.folder_id
    db_note.type = updated_note.type
    db_note.source_system = updated_note.source_system
    db_note.external_run_id = updated_note.external_run_id
    db_note.note_metadata = updated_note.note_metadata

    log_activity(
        db=db,
        user_id=user_id,
        event_type="note_updated",
        entity_type="note",
        entity_id=db_note.id,
        event_metadata={
            "title": db_note.title,
            "status": db_note.status,
            "folder_id": db_note.folder_id,
        },
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Invalid folder_id (foreign key constraint)")

    db.refresh(db_note)

    return db_note


def delete_note_service(
    db: Session,
    user_id: int,
    note_id: int,
) -> None:

    db_note = (
        db.query(NoteModel)
        .filter(NoteModel.id == note_id, NoteModel.user_id == user_id)
        .first()
    )

    if db_note is None:
        raise ValueError("Note not found")

    deleted_note_id = db_note.id
    deleted_title = db_note.title
    deleted_status = db_note.status
    deleted_folder_id = db_note.folder_id

    db.delete(db_note)

    log_activity(
        db=db,
        user_id=user_id,
        event_type="note_deleted",
        entity_type="note",
        entity_id=deleted_note_id,
        event_metadata={
            "title": deleted_title,
            "status": deleted_status,
            "folder_id": deleted_folder_id,
        },
    )

    db.commit()