from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import SessionLocal
from app.integrations.mis.models import ExternalRun

router = APIRouter(prefix="/api/integrations/mis", tags=["MIS"])


class MISIngestRequest(BaseModel):
    source_system: str
    run_manifest: dict
    daily_snapshot: str


@router.post("/ingest")
def mis_ingest(body: MISIngestRequest):
    run_id = body.run_manifest.get("run_id")
    if not run_id:
        raise HTTPException(status_code=400, detail="run_id is required")

    db = SessionLocal()
    try:
        existing = db.query(ExternalRun).filter_by(
            source_system=body.source_system, run_id=run_id
        ).first()
    finally:
        db.close()

    if existing:
        return {"status": "skipped", "reason": "duplicate run"}
    return {"status": "validated", "run_id": run_id}


@router.get("/health")
def mis_health():
    return {"status": "mis router active"}
