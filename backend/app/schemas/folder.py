from pydantic import BaseModel, ConfigDict


class FolderBase(BaseModel):
    name: str


class FolderCreate(FolderBase):
    pass


class Folder(FolderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class FolderWithCount(Folder):
    note_count: int