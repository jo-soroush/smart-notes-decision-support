from datetime import datetime, timezone

from app.routes.ai import run_ai_job
from app.schemas.ai import AiJobCreate


class DummyNote:
    def __init__(self):
        self.id = 10
        self.user_id = 1
        self.content = "hello world"
        self.external_run_id = None


class DummyCachedResult:
    def __init__(self):
        self.result_text = "cached summary"
        self.model_name = "gemini-test"
        self.created_at = datetime.now(timezone.utc)


class DummySavedResult:
    def __init__(self):
        self.result_text = "fresh summary"
        self.model_name = "gemini-live"
        self.created_at = datetime.now(timezone.utc)


class DummyQuery:
    def __init__(self, result):
        self.result = result

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.result


class DummyDB:
    def __init__(self, note):
        self.note = note
        self.committed = False

    def query(self, model, *args, **kwargs):
        return DummyQuery(self.note)

    def commit(self):
        self.committed = True


def test_run_ai_job_returns_cached_result_and_logs_activity(monkeypatch):
    note = DummyNote()
    cached = DummyCachedResult()
    db = DummyDB(note)

    logged = []

    def fake_compute_content_hash(content):
        return "hash-123"

    def fake_get_cached_result(db_arg, note_id, action_type, content_hash):
        return cached

    def fake_log_activity(**kwargs):
        logged.append(kwargs)

    monkeypatch.setattr("app.routes.ai.compute_content_hash", fake_compute_content_hash)
    monkeypatch.setattr("app.routes.ai.get_cached_result", fake_get_cached_result)
    monkeypatch.setattr("app.routes.ai.log_activity", fake_log_activity)

    job = AiJobCreate(note_id=10, action_type="summary")

    result = run_ai_job(job=job, db=db)

    assert result.note_id == 10
    assert result.action_type == "summary"
    assert result.result_text == "cached summary"
    assert result.cached is True
    assert result.model_name == "gemini-test"
    assert db.committed is True
    assert len(logged) == 1
    assert logged[0]["event_type"] == "ai_executed"
    assert logged[0]["entity_type"] == "note"
    assert logged[0]["entity_id"] == 10
    assert logged[0]["event_metadata"]["action_type"] == "summary"
    assert logged[0]["event_metadata"]["cached"] is True


def test_run_ai_job_generates_result_and_logs_activity(monkeypatch):
    note = DummyNote()
    saved = DummySavedResult()
    db = DummyDB(note)

    logged = []

    def fake_compute_content_hash(content):
        return "hash-456"

    def fake_get_cached_result(db_arg, note_id, action_type, content_hash):
        return None

    def fake_build_input_text(note, external_run=None):
        return "built input"

    def fake_generate_with_gemini(action_type, input_text):
        return ("fresh summary", "gemini-live")

    def fake_create_result(db, note_id, action_type, content_hash, result_text, model_name):
        return saved

    def fake_log_activity(**kwargs):
        logged.append(kwargs)

    monkeypatch.setattr("app.routes.ai.compute_content_hash", fake_compute_content_hash)
    monkeypatch.setattr("app.routes.ai.get_cached_result", fake_get_cached_result)
    monkeypatch.setattr("app.routes.ai.build_input_text", fake_build_input_text)
    monkeypatch.setattr("app.routes.ai.generate_with_gemini", fake_generate_with_gemini)
    monkeypatch.setattr("app.routes.ai.create_result", fake_create_result)
    monkeypatch.setattr("app.routes.ai.log_activity", fake_log_activity)

    job = AiJobCreate(note_id=10, action_type="summary")

    result = run_ai_job(job=job, db=db)

    assert result.note_id == 10
    assert result.action_type == "summary"
    assert result.result_text == "fresh summary"
    assert result.cached is False
    assert result.model_name == "gemini-live"
    assert db.committed is True
    assert len(logged) == 1
    assert logged[0]["event_type"] == "ai_executed"
    assert logged[0]["entity_type"] == "note"
    assert logged[0]["entity_id"] == 10
    assert logged[0]["event_metadata"]["action_type"] == "summary"
    assert logged[0]["event_metadata"]["cached"] is False