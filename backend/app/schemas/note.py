from pydantic import BaseModel


class NoteCreate(BaseModel):
    title: str
    content: str
    status: str


class Note(BaseModel):
    id: int
    title: str
    content: str
    status: str

    model_config = {"from_attributes": True}
