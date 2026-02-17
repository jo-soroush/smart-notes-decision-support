import hashlib

from app.models.ai_result import AiResult
from app.models.note import NoteModel
from sqlalchemy.orm import Session


def compute_content_hash(content: str) -> str:
    """Compute a stable hash for note content (used for cache invalidation)."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def get_cached_result(db: Session, note_id: int, action_type: str, content_hash: str) -> AiResult | None:
    """Return cached AI result if exists for the given note/action/content_hash."""
    return (
        db.query(AiResult)
        .filter(
            AiResult.note_id == note_id,
            AiResult.action_type == action_type,
            AiResult.content_hash == content_hash,
        )
        .order_by(AiResult.created_at.desc())
        .first()
    )


def create_result(
    db: Session,
    note_id: int,
    action_type: str,
    content_hash: str,
    result_text: str,
    model_name: str | None = None,
) -> AiResult:
    """Persist AI result to database."""
    row = AiResult(
        note_id=note_id,
        action_type=action_type,
        content_hash=content_hash,
        result_text=result_text,
        model_name=model_name,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def build_input_text(note: NoteModel) -> str:
    """Build the text sent to the AI model based on note fields."""
    return f"Title: {note.title}\n\nContent:\n{note.content}"
