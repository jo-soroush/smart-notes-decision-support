from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from .base import Base


class AiResult(Base):
    __tablename__ = "ai_results"

    id = Column(Integer, primary_key=True, index=True)

    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)

    # "summary" | "key_points"
    action_type = Column(String(50), nullable=False, index=True)

    # used for cache invalidation when note content changes
    content_hash = Column(String(64), nullable=False, index=True)

    result_text = Column(Text, nullable=False)

    model_name = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    note = relationship("Note", back_populates="ai_results")
