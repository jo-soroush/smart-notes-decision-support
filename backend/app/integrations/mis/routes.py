from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/integrations/mis", tags=["MIS"])


class MISIngestRequest(BaseModel):
    source_system: str
    run_manifest: dict
    daily_snapshot: str


@router.post("/ingest")
def mis_ingest(body: MISIngestRequest):
    return {"status": "ok"}


@router.get("/health")
def mis_health():
    return {"status": "mis router active"}