from __future__ import annotations

from datetime import datetime, timezone

from app.db import get_db
from app.integrations.mis.models import ExternalRun
from app.jobs.ai_jobs import ai_job_queue
from app.models.ai_result import AiResult
from app.models.note import NoteModel
from app.schemas.ai import AiJobCreate, AiJobResponse
from app.services.activity_log_service import log_activity
from app.services.ai_service import (
    build_input_text,
    compute_content_hash,
    create_result,
    generate_with_gemini,
    get_cached_result,
)
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session, sessionmaker

router = APIRouter(prefix="/ai", tags=["ai"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _make_session_factory(db: Session):
    bind = db.get_bind()
    return sessionmaker(autocommit=False, autoflush=False, bind=bind)


def _process_ai_job(job_id: str, job: AiJobCreate, db_session_factory) -> None:
    """
    Background task: runs AI, saves result, updates in-memory job state.
    """
    ai_job_queue.set_running(job_id)

    try:
        with db_session_factory() as db:
            note = db.query(NoteModel).filter(NoteModel.id == job.note_id).first()
            if note is None:
                ai_job_queue.set_failed(job_id, "Note not found")
                return

            content_hash = compute_content_hash(note.content)

            cached = get_cached_result(db, job.note_id, job.action_type, content_hash)
            if cached:
                log_activity(
                    db=db,
                    user_id=note.user_id,
                    event_type="ai_executed",
                    entity_type="note",
                    entity_id=note.id,
                    event_metadata={
                        "action_type": job.action_type,
                        "cached": True,
                        "model_name": cached.model_name,
                    },
                )
                db.commit()

                ai_job_queue.set_done(
                    job_id,
                    cached=True,
                    result_text=cached.result_text,
                    model_name=cached.model_name,
                )
                return

            external_run = None
            if note.external_run_id is not None:
                external_run = (
                    db.query(ExternalRun)
                    .filter(
                        ExternalRun.id == note.external_run_id,
                        ExternalRun.user_id == note.user_id,
                    )
                    .first()
                )

            input_text = build_input_text(note, external_run=external_run)

            try:
                result_text, model_name = generate_with_gemini(job.action_type, input_text)
            except ValueError:
                ai_job_queue.set_failed(job_id, "Invalid action type")
                return
            except Exception as e:
                ai_job_queue.set_failed(job_id, str(e))
                return

            saved = create_result(
                db=db,
                note_id=job.note_id,
                action_type=job.action_type,
                content_hash=content_hash,
                result_text=result_text,
                model_name=model_name,
            )

            log_activity(
                db=db,
                user_id=note.user_id,
                event_type="ai_executed",
                entity_type="note",
                entity_id=note.id,
                event_metadata={
                    "action_type": job.action_type,
                    "cached": False,
                    "model_name": saved.model_name,
                },
            )
            db.commit()

            ai_job_queue.set_done(
                job_id,
                cached=False,
                result_text=saved.result_text,
                model_name=saved.model_name,
            )

    except Exception as e:
        ai_job_queue.set_failed(job_id, str(e))


@router.post("/jobs", response_model=AiJobResponse)
def run_ai_job(job: AiJobCreate, db: Session = Depends(get_db)):
    """
    SYNC mode (existing behavior): runs AI immediately and returns result_text.
    """
    note = db.query(NoteModel).filter(NoteModel.id == job.note_id).first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    content_hash = compute_content_hash(note.content)

    cached = get_cached_result(db, job.note_id, job.action_type, content_hash)
    if cached:
        log_activity(
            db=db,
            user_id=note.user_id,
            event_type="ai_executed",
            entity_type="note",
            entity_id=note.id,
            event_metadata={
                "action_type": job.action_type,
                "cached": True,
                "model_name": cached.model_name,
            },
        )
        db.commit()

        return AiJobResponse(
            note_id=job.note_id,
            action_type=job.action_type,
            result_text=cached.result_text,
            cached=True,
            model_name=cached.model_name,
            created_at=cached.created_at,
        )

    external_run = None
    if note.external_run_id is not None:
        external_run = (
            db.query(ExternalRun)
            .filter(
                ExternalRun.id == note.external_run_id,
                ExternalRun.user_id == note.user_id,
            )
            .first()
        )

    input_text = build_input_text(note, external_run=external_run)

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

    log_activity(
        db=db,
        user_id=note.user_id,
        event_type="ai_executed",
        entity_type="note",
        entity_id=note.id,
        event_metadata={
            "action_type": job.action_type,
            "cached": False,
            "model_name": saved.model_name,
        },
    )
    db.commit()

    return AiJobResponse(
        note_id=job.note_id,
        action_type=job.action_type,
        result_text=saved.result_text,
        cached=False,
        model_name=saved.model_name,
        created_at=saved.created_at,
    )


@router.post("/jobs/queue")
def queue_ai_job(
    job: AiJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    ASYNC mode: creates a job_id, schedules background task, returns immediately.
    """
    note = db.query(NoteModel).filter(NoteModel.id == job.note_id).first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    job_id = ai_job_queue.create_job(note_id=job.note_id, action_type=job.action_type)

    session_factory = _make_session_factory(db)
    background_tasks.add_task(_process_ai_job, job_id, job, session_factory)

    return {
        "job_id": job_id,
        "status": "queued",
        "note_id": job.note_id,
        "action_type": job.action_type,
    }


@router.get("/jobs/{job_id}")
def get_ai_job(job_id: str):
    job = ai_job_queue.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


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