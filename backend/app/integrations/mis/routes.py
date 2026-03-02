from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.db import SessionLocal
from app.core.deps import get_current_user
from app.models.note import NoteModel
from app.integrations.mis.models import ExternalRun
from app.models.user import UserModel

router = APIRouter(prefix="/api/integrations/mis", tags=["MIS"])


class MISIngestRequest(BaseModel):
    source_system: str
    run_manifest: dict
    daily_snapshot: str


@router.post("/ingest")
def mis_ingest(
    current_user: UserModel = Depends(get_current_user),
    body: MISIngestRequest = ...,
):
    run_id = body.run_manifest.get("run_id")
    if not run_id:
        raise HTTPException(status_code=400, detail="run_id is required")

    m = body.run_manifest

    raw_dt = m.get("dt")
    if not raw_dt:
        raise HTTPException(status_code=422, detail="dt is required and must be YYYY-MM-DD")
    try:
        parsed_dt = date.fromisoformat(raw_dt)
    except ValueError:
        raise HTTPException(status_code=422, detail="dt is required and must be YYYY-MM-DD")

    symbol = m.get("symbol")
    if not symbol:
        raise HTTPException(status_code=422, detail="symbol is required")

    timeframe = m.get("timeframe")
    if not timeframe:
        raise HTTPException(status_code=422, detail="timeframe is required")

    pipeline_status = m.get("pipeline_status") or "UNKNOWN"

    db = SessionLocal()
    try:
        existing = db.query(ExternalRun).filter_by(
            source_system=body.source_system, run_id=run_id
        ).first()

        if existing:
            return {"status": "skipped", "reason": "duplicate run"}

        record = ExternalRun(
            source_system=body.source_system,
            run_id=run_id,
            dt=parsed_dt,
            symbol=symbol,
            timeframe=timeframe,
            pipeline_status=pipeline_status,
            market_flag=m.get("market_flag"),
            risk_mode=m.get("risk_mode"),
            manifest_path=m.get("manifest_path"),
            raw_payload=body.run_manifest,
        )
        db.add(record)
        note = NoteModel(
            title=f"MIS Run {run_id}",
            content=body.daily_snapshot,
            status="draft",
            type="external_mis",
            source_system=body.source_system,
            external_run_id=record.id,
            note_metadata=body.run_manifest,
            user_id=current_user.id,
        )
        db.add(note)
        db.commit()
        db.refresh(record)
        return {"status": "ingested", "external_run_id": str(record.id), "run_id": run_id}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@router.get("/health")
def mis_health():
    return {"status": "mis router active"}
