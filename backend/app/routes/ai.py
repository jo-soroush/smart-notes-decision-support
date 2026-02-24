from app.db import get_db
from app.models.ai_result import AiResult
from app.models.note import NoteModel
from app.schemas.ai import AiJobCreate, AiJobResponse
from app.services.ai_service import (
    build_input_text,
    compute_content_hash,
    create_result,
    generate_with_gemini,
    get_cached_result,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/jobs", response_model=AiJobResponse)
def run_ai_job(job: AiJobCreate, db: Session = Depends(get_db)):
    note = db.query(NoteModel).filter(NoteModel.id == job.note_id).first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    content_hash = compute_content_hash(note.content)

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

    input_text = build_input_text(note)

    try:
        result_text, model_name = generate_with_gemini(job.action_type, input_text)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid action type")
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    saved = create_result(
        db=db,
        note_id=job.note_id,
        action_type=job.action_type,
        content_hash=content_hash,
        result_text=result_text,
        model_name=model_name,
    )

    return AiJobResponse(
        note_id=job.note_id,
        action_type=job.action_type,
        result_text=saved.result_text,
        cached=False,
        model_name=saved.model_name,
        created_at=saved.created_at,
    )


@router.get("/results/latest", response_model=AiJobResponse)
def get_latest_ai_result(
    note_id: int = Query(...),
    action_type: str = Query(...),
    db: Session = Depends(get_db),
):
    result = (
        db.query(AiResult)
        .filter(AiResult.note_id == note_id, AiResult.action_type == action_type)
        .order_by(AiResult.created_at.desc())
        .first()
    )

    if result is None:
        raise HTTPException(status_code=404, detail="No AI result found")

    return AiJobResponse(
        note_id=note_id,
        action_type=action_type,
        result_text=result.result_text,
        cached=True,
        model_name=result.model_name,
        created_at=result.created_at,
    )