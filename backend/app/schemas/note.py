from pydantic import BaseModel


class NoteCreate(BaseModel):
    title: str
    content: str
    status: str
    folder_id: int | None = None


class Note(BaseModel):
    id: int
    title: str
    content: str
    status: str
    folder_id: int | None = None

    model_config = {"from_attributes": True}


class NotesPage(BaseModel):
    items: list[Note]
    total: int
    page: int
    limit: int
    pages: int