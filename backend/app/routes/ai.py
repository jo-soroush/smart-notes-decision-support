from app.db import get_db
from app.models.note import NoteModel
from app.schemas.ai import AiJobCreate, AiJobResponse
from app.services.ai_service import (
    build_input_text,
    compute_content_hash,
    create_result,
    get_cached_result,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/jobs", response_model=AiJobResponse)
def run_ai_job(job: AiJobCreate, db: Session = Depends(get_db)):

    note = db.query(NoteModel).filter(NoteModel.id == job.note_id).first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    content_hash = compute_content_hash(note.content)

    # 1️⃣ Check cache
    cached = get_cached_result(db, job.note_id, job.action_type, content_hash)
    if cached:
        return AiJobResponse(
            note_id=job.note_id,
            action_type=job.action_type,
            result_text=cached.result_text,
            cached=True,
            model_name=cached.model_name,
            created_at=cached.created_at,
        )

    # 2️⃣ Placeholder AI logic (temporary until Gemini integration)
    input_text = build_input_text(note)

    if job.action_type == "summary":
        result_text = f"Summary (mock): {input_text[:150]}..."
    elif job.action_type == "key_points":
        result_text = f"Key points (mock): {input_text[:150]}..."
    else:
        raise HTTPException(status_code=400, detail="Invalid action type")

    # 3️⃣ Save new result
    saved = create_result(
        db=db,
        note_id=job.note_id,
        action_type=job.action_type,
        content_hash=content_hash,
        result_text=result_text,
        model_name="mock-model",
    )

    return AiJobResponse(
        note_id=job.note_id,
        action_type=job.action_type,
        result_text=saved.result_text,
        cached=False,
        model_name=saved.model_name,
        created_at=saved.created_at,
    )
