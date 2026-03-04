from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class NoteCreate(BaseModel):
    title: str
    content: str
    status: str = "draft"
    folder_id: Optional[int] = None

    type: Optional[str] = None
    source_system: Optional[str] = None
    external_run_id: Optional[UUID] = None
    note_metadata: Optional[dict] = None


class Note(BaseModel):
    id: int
    title: str
    content: str
    status: str
    folder_id: Optional[int] = None

    type: Optional[str] = None
    source_system: Optional[str] = None
    external_run_id: Optional[UUID] = None
    note_metadata: Optional[dict] = None

    model_config = {"from_attributes": True}


class NotesPage(BaseModel):
    items: list[Note]
    total: int
    page: int
    limit: int
    pages: int