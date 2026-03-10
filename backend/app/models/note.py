import uuid
from typing import TYPE_CHECKING, List, Optional

from app.models.base import Base
from app.models.folder import FolderModel
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.ai_result import AiResult
    from app.models.user import UserModel


class NoteModel(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)

    type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source_system: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    external_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    note_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)

    folder_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("folders.id", ondelete="SET NULL"),
        nullable=True,
    )

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    folder: Mapped[Optional["FolderModel"]] = relationship(back_populates="notes")

    user: Mapped["UserModel"] = relationship(
        "UserModel",
        back_populates="notes",
    )

    ai_results: Mapped[List["AiResult"]] = relationship(
        back_populates="note",
        cascade="all, delete-orphan",
    )