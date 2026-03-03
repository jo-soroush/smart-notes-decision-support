from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from app.core.deps import get_current_user
from app.db import SessionLocal
from app.integrations.mis.models import ExternalRun
from app.models.note import NoteModel
from app.models.user import UserModel
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/integrations/mis", tags=["MIS"])


class MISIngestRequest(BaseModel):
    source_system: str
    run_manifest: dict
    daily_snapshot: str


class ExternalRunOut(BaseModel):
    id: UUID
    user_id: int
    linked_note_id: Optional[int] = None

    source_system: str
    run_id: str
    dt: date
    symbol: str
    timeframe: str
    pipeline_status: str
    market_flag: Optional[str] = None
    risk_mode: Optional[str] = None
    manifest_path: str
    raw_payload: dict
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExternalRunListResponse(BaseModel):
    items: List[ExternalRunOut]
    total: int
    limit: int
    offset: int


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

    manifest_path = m.get("manifest_path")
    if not manifest_path:
        raise HTTPException(status_code=422, detail="manifest_path is required")

    pipeline_status = m.get("pipeline_status") or "UNKNOWN"

    db = SessionLocal()
    try:
        existing = (
            db.query(ExternalRun)
            .filter_by(source_system=body.source_system, run_id=run_id)
            .first()
        )
        if existing:
            return {"status": "skipped", "reason": "duplicate run"}

        record = ExternalRun(
            user_id=current_user.id,
            source_system=body.source_system,
            run_id=run_id,
            dt=parsed_dt,
            symbol=symbol,
            timeframe=timeframe,
            pipeline_status=pipeline_status,
            market_flag=m.get("market_flag"),
            risk_mode=m.get("risk_mode"),
            manifest_path=manifest_path,
            raw_payload=body.run_manifest,
        )
        db.add(record)
        db.flush()  # ✅ IMPORTANT: ensure record.id exists before using it in Note

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


@router.get("/runs", response_model=ExternalRunListResponse)
def list_runs(
    current_user: UserModel = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    symbol: Optional[str] = Query(None),
    timeframe: Optional[str] = Query(None),
    source_system: Optional[str] = Query(None),
    pipeline_status: Optional[str] = Query(None),
    dt_from: Optional[date] = Query(None),
    dt_to: Optional[date] = Query(None),
):
    allowed_sort = {
        "created_at": ExternalRun.created_at,
        "dt": ExternalRun.dt,
        "run_id": ExternalRun.run_id,
        "symbol": ExternalRun.symbol,
        "timeframe": ExternalRun.timeframe,
        "pipeline_status": ExternalRun.pipeline_status,
        "source_system": ExternalRun.source_system,
    }
    sort_col = allowed_sort.get(sort)
    if sort_col is None:
        raise HTTPException(status_code=400, detail=f"invalid sort: {sort}")

    order_lower = (order or "desc").lower()
    if order_lower not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail=f"invalid order: {order}")

    db: Session = SessionLocal()
    try:
        filters = [ExternalRun.user_id == current_user.id]

        if symbol:
            filters.append(ExternalRun.symbol == symbol)
        if timeframe:
            filters.append(ExternalRun.timeframe == timeframe)
        if source_system:
            filters.append(ExternalRun.source_system == source_system)
        if pipeline_status:
            filters.append(ExternalRun.pipeline_status == pipeline_status)
        if dt_from:
            filters.append(ExternalRun.dt >= dt_from)
        if dt_to:
            filters.append(ExternalRun.dt <= dt_to)

        base_q = db.query(ExternalRun).filter(and_(*filters))
        total = base_q.count()

        if order_lower == "desc":
            base_q = base_q.order_by(desc(sort_col))
        else:
            base_q = base_q.order_by(sort_col)

        items = base_q.offset(offset).limit(limit).all()

        run_ids = [r.id for r in items]
        note_map = {}
        if run_ids:
            rows = (
                db.query(NoteModel.id, NoteModel.external_run_id)
                .filter(
                    NoteModel.user_id == current_user.id,
                    NoteModel.external_run_id.in_(run_ids),
                )
                .all()
            )
            note_map = {external_run_id: note_id for (note_id, external_run_id) in rows}

        out_items = []
        for r in items:
            data = ExternalRunOut.model_validate(r).model_dump()
            data["linked_note_id"] = note_map.get(r.id)
            out_items.append(data)

        return {
            "items": out_items,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    finally:
        db.close()


@router.get("/health")
def mis_health():
    return {"status": "mis router active"}