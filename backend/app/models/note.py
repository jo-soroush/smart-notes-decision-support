from typing import TYPE_CHECKING, List, Optional

from app.models.base import Base
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.ai_result import AiResult
    from app.models.folder import FolderModel


class NoteModel(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)

    # Foreign key to folders (nullable)
    folder_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("folders.id"),
        nullable=True
    )

    # Relationship to Folder
    folder: Mapped[Optional["FolderModel"]] = relationship(
        back_populates="notes"
    )

    # Relationship to AI results
    ai_results: Mapped[List["AiResult"]] = relationship(
        back_populates="note",
        cascade="all, delete-orphan"
    )
    