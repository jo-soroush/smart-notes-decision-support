from app.db import get_db
from app.routes.ai import router as ai_router
from fastapi import FastAPI
from fastapi.testclient import TestClient


class DummyNote:
    def __init__(self):
        self.id = 10
        self.user_id = 1
        self.content = "hello world"
        self.external_run_id = None


class DummyQuery:
    def __init__(self, note):
        self.note = note

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.note


class DummyDB:
    def __init__(self, note):
        self.note = note

    def query(self, model):
        return DummyQuery(self.note)

    def get_bind(self):
        return None


def make_test_app(note):
    app = FastAPI()
    app.include_router(ai_router)

    db = DummyDB(note)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    return app


def test_queue_ai_job_returns_queued_job(monkeypatch):
    app = make_test_app(DummyNote())
    client = TestClient(app)

    monkeypatch.setattr("app.routes.ai._make_session_factory", lambda db: "fake-session-factory")
    monkeypatch.setattr("app.routes.ai.ai_job_queue.create_job", lambda note_id, action_type: "job-123")

    response = client.post(
        "/ai/jobs/queue",
        json={
            "note_id": 10,
            "action_type": "summary",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "job-123"
    assert data["status"] == "queued"
    assert data["note_id"] == 10
    assert data["action_type"] == "summary"


def test_queue_ai_job_returns_404_when_note_missing():
    app = make_test_app(None)
    client = TestClient(app)

    response = client.post(
        "/ai/jobs/queue",
        json={
            "note_id": 999,
            "action_type": "summary",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Note not found"


def test_get_ai_job_returns_job_status(monkeypatch):
    app = make_test_app(None)
    client = TestClient(app)

    monkeypatch.setattr(
        "app.routes.ai.ai_job_queue.get",
        lambda job_id: {
            "job_id": job_id,
            "note_id": 10,
            "action_type": "summary",
            "status": "done",
            "queued_at": "2026-03-09T10:00:00+00:00",
            "started_at": "2026-03-09T10:00:01+00:00",
            "finished_at": "2026-03-09T10:00:02+00:00",
            "cached": False,
            "result_text": "fresh summary",
            "model_name": "gemini-live",
            "error": None,
        },
    )

    response = client.get("/ai/jobs/job-123")

    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "job-123"
    assert data["status"] == "done"
    assert data["note_id"] == 10
    assert data["action_type"] == "summary"


def test_get_ai_job_returns_404_when_missing(monkeypatch):
    app = make_test_app(None)
    client = TestClient(app)

    monkeypatch.setattr("app.routes.ai.ai_job_queue.get", lambda job_id: None)

    response = client.get("/ai/jobs/missing-job")

    assert response.status_code == 404
    assert response.json()["detail"] == "Job not found"