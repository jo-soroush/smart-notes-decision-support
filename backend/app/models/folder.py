from typing import List

from app.models.base import Base
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class FolderModel(Base):
    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    # Relationship to notes
    notes: Mapped[List["NoteModel"]] = relationship(
        back_populates="folder",
        cascade="all, delete"
    )