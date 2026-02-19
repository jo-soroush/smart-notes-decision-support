import hashlib

from app.models.ai_result import AiResult
from app.models.note import NoteModel
from app.services.gemini_client import MODEL_NAME, call_gemini
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


def generate_with_gemini(action_type: str, input_text: str) -> tuple[str, str]:
    """
    Generate AI output using Gemini. Returns (result_text, model_name).
    """
    if action_type == "summary":
        prompt = (
            "Summarize the following note in a concise way. "
            "Return a short summary in 3-6 sentences.\n\n"
            f"{input_text}"
        )
    elif action_type == "key_points":
        prompt = (
            "Extract 5-8 key points from the following note. "
            "Return bullet points.\n\n"
            f"{input_text}"
        )
    else:
        raise ValueError("Invalid action type")

    result = call_gemini(prompt)
    return result.strip(), MODEL_NAME


