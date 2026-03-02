from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
    return {"status": "validated", "run_id": run_id}


@router.get("/health")
def mis_health():
    return {"status": "mis router active"}