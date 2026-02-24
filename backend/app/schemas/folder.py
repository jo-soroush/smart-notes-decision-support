from pydantic import BaseModel


class FolderBase(BaseModel):
    name: str


class FolderCreate(FolderBase):
    pass


class Folder(FolderBase):
    id: int

    class Config:
        from_attributes = True


# ✅ NEW
class FolderWithCount(Folder):
    note_count: int