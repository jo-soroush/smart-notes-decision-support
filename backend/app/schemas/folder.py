from pydantic import BaseModel


class FolderCreate(BaseModel):
    name: str


class Folder(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}