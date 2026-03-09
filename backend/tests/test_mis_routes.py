from types import SimpleNamespace
from uuid import uuid4

import app.models.ai_result  # noqa: F401
import app.models.user  # noqa: F401
from app.integrations.mis.routes import MISIngestRequest, list_runs, mis_ingest


class DummyExistingRun:
    pass


class DummyFilterByResult:
    def first(self):
        return DummyExistingRun()


class DummyDB:
    def query(self, model):
        return self

    def filter_by(self, **kwargs):
        return DummyFilterByResult()

    def close(self):
        pass


def test_mis_ingest_skips_duplicate_run(monkeypatch):
    db = DummyDB()
    current_user = SimpleNamespace(id=1)

    body = MISIngestRequest(
        source_system="mis_pipeline",
        run_manifest={
            "run_id": "run-123",
            "dt": "2026-03-09",
            "symbol": "BTCUSDT",
            "timeframe": "1d",
            "manifest_path": "/tmp/run-123.json",
        },
        daily_snapshot="snapshot text",
    )

    monkeypatch.setattr("app.integrations.mis.routes.SessionLocal", lambda: db)

    result = mis_ingest(current_user=current_user, body=body)

    assert result == {"status": "skipped", "reason": "duplicate run"}


class DummyNoExistingRunResult:
    def first(self):
        return None


class DummyIngestDB:
    def __init__(self):
        self.added_objects = []
        self.flushed = False
        self.committed = False
        self.refreshed = False
        self.closed = False

    def query(self, model):
        return self

    def filter_by(self, **kwargs):
        return DummyNoExistingRunResult()

    def add(self, obj):
        self.added_objects.append(obj)

    def flush(self):
        self.flushed = True
        for index, obj in enumerate(self.added_objects, start=1):
            if hasattr(obj, "id") and getattr(obj, "id", None) is None:
                obj.id = index

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        self.refreshed = True

    def rollback(self):
        pass

    def close(self):
        self.closed = True


def test_mis_ingest_creates_run_note_and_activity_log(monkeypatch):
    db = DummyIngestDB()
    current_user = SimpleNamespace(id=1)

    body = MISIngestRequest(
        source_system="mis_pipeline",
        run_manifest={
            "run_id": "run-456",
            "dt": "2026-03-09",
            "symbol": "ETHUSDT",
            "timeframe": "4h",
            "manifest_path": "/tmp/run-456.json",
            "pipeline_status": "DONE",
        },
        daily_snapshot="daily snapshot text",
    )

    monkeypatch.setattr("app.integrations.mis.routes.SessionLocal", lambda: db)

    logged = []

    def fake_log_activity(**kwargs):
        logged.append(kwargs)

    monkeypatch.setattr("app.integrations.mis.routes.log_activity", fake_log_activity)

    result = mis_ingest(current_user=current_user, body=body)

    assert result["status"] == "ingested"
    assert result["run_id"] == "run-456"
    assert db.flushed is True
    assert db.committed is True
    assert db.refreshed is True
    assert db.closed is True
    assert len(db.added_objects) == 2
    assert len(logged) == 1
    assert logged[0]["event_type"] == "mis_ingested"
    assert logged[0]["entity_type"] == "note"
    assert logged[0]["event_metadata"]["run_id"] == "run-456"
    assert logged[0]["event_metadata"]["symbol"] == "ETHUSDT"
    assert logged[0]["event_metadata"]["timeframe"] == "4h"


class DummyRun:
    def __init__(self):
        self.id = uuid4()
        self.user_id = 1
        self.source_system = "mis_pipeline"
        self.run_id = "run-789"
        self.dt = "2026-03-09"
        self.symbol = "BTCUSDT"
        self.timeframe = "1d"
        self.pipeline_status = "DONE"
        self.market_flag = None
        self.risk_mode = None
        self.manifest_path = "/tmp/run-789.json"
        self.raw_payload = {"run_id": "run-789"}
        self.created_at = None


class DummyRunsQuery:
    def __init__(self, items):
        self.items = items

    def filter(self, *args, **kwargs):
        return self

    def count(self):
        return len(self.items)

    def order_by(self, *args, **kwargs):
        return self

    def offset(self, value):
        return self

    def limit(self, value):
        return self

    def all(self):
        return self.items


class DummyNoteMapQuery:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, *args, **kwargs):
        return self

    def all(self):
        return self.rows


class DummyListRunsDB:
    def __init__(self, items, note_rows):
        self.items = items
        self.note_rows = note_rows
        self.closed = False
        self.query_calls = 0

    def query(self, *models):
        self.query_calls += 1
        if self.query_calls == 1:
            return DummyRunsQuery(self.items)
        return DummyNoteMapQuery(self.note_rows)

    def close(self):
        self.closed = True


def test_list_runs_returns_items_with_linked_note_id(monkeypatch):
    run = DummyRun()
    db = DummyListRunsDB(
        items=[run],
        note_rows=[(99, run.id)],
    )
    current_user = SimpleNamespace(id=1)

    monkeypatch.setattr("app.integrations.mis.routes.SessionLocal", lambda: db)

    result = list_runs(
        current_user=current_user,
        limit=50,
        offset=0,
        sort="created_at",
        order="desc",
        symbol=None,
        timeframe=None,
        source_system=None,
        pipeline_status=None,
        dt_from=None,
        dt_to=None,
    )

    assert result["total"] == 1
    assert result["limit"] == 50
    assert result["offset"] == 0
    assert len(result["items"]) == 1
    assert result["items"][0]["run_id"] == "run-789"
    assert result["items"][0]["linked_note_id"] == 99
    assert db.closed is True