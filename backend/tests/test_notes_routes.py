from app.core.deps import get_current_user
from app.db import get_db
from app.routes.notes import router as notes_router
from fastapi import FastAPI
from fastapi.testclient import TestClient


class DummyUser:
    def __init__(self):
        self.id = 1


class DummyNote:
    def __init__(self):
        self.id = 123
        self.title = "Route title"
        self.content = "Route content"
        self.status = "draft"
        self.folder_id = None
        self.type = None
        self.source_system = None
        self.external_run_id = None
        self.note_metadata = None
        self.user_id = 1


class DummyCreatedNote:
    def __init__(self):
        self.id = 200
        self.title = "New title"
        self.content = "New content"
        self.status = "draft"
        self.folder_id = None
        self.type = None
        self.source_system = None
        self.external_run_id = None
        self.note_metadata = None
        self.user_id = 1


class DummyUpdatedNote:
    def __init__(self):
        self.id = 123
        self.title = "Updated title"
        self.content = "Updated content"
        self.status = "final"
        self.folder_id = None
        self.type = None
        self.source_system = None
        self.external_run_id = None
        self.note_metadata = None
        self.user_id = 1


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


def make_test_app(note):
    app = FastAPI()
    app.include_router(notes_router)

    db = DummyDB(note)

    def override_get_db():
        yield db

    def override_get_current_user():
        return DummyUser()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    return app


def test_get_note_route_returns_note():
    app = make_test_app(DummyNote())
    client = TestClient(app)

    response = client.get("/notes/123")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 123
    assert data["title"] == "Route title"
    assert data["content"] == "Route content"
    assert data["status"] == "draft"


def test_get_note_route_returns_404_when_missing():
    app = make_test_app(None)
    client = TestClient(app)

    response = client.get("/notes/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Note not found"


def test_create_note_route_returns_created_note(monkeypatch):
    app = make_test_app(None)
    client = TestClient(app)

    def fake_create_note_service(db, user_id, note):
        return DummyCreatedNote()

    monkeypatch.setattr("app.routes.notes.create_note_service", fake_create_note_service)

    response = client.post(
        "/notes",
        json={
            "title": "New title",
            "content": "New content",
            "status": "draft",
            "folder_id": None,
            "type": None,
            "source_system": None,
            "external_run_id": None,
            "note_metadata": None,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 200
    assert data["title"] == "New title"
    assert data["content"] == "New content"
    assert data["status"] == "draft"


def test_update_note_route_returns_updated_note(monkeypatch):
    app = make_test_app(None)
    client = TestClient(app)

    def fake_update_note_service(db, user_id, note_id, updated_note):
        return DummyUpdatedNote()

    monkeypatch.setattr("app.routes.notes.update_note_service", fake_update_note_service)

    response = client.put(
        "/notes/123",
        json={
            "title": "Updated title",
            "content": "Updated content",
            "status": "final",
            "folder_id": None,
            "type": None,
            "source_system": None,
            "external_run_id": None,
            "note_metadata": None,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 123
    assert data["title"] == "Updated title"
    assert data["content"] == "Updated content"
    assert data["status"] == "final"


def test_update_note_route_returns_404_when_missing(monkeypatch):
    app = make_test_app(None)
    client = TestClient(app)

    def fake_update_note_service(db, user_id, note_id, updated_note):
        raise ValueError("Note not found")

    monkeypatch.setattr("app.routes.notes.update_note_service", fake_update_note_service)

    response = client.put(
        "/notes/999",
        json={
            "title": "Updated title",
            "content": "Updated content",
            "status": "final",
            "folder_id": None,
            "type": None,
            "source_system": None,
            "external_run_id": None,
            "note_metadata": None,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Note not found"


def test_delete_note_route_returns_deleted_id(monkeypatch):
    app = make_test_app(None)
    client = TestClient(app)

    def fake_delete_note_service(db, user_id, note_id):
        return None

    monkeypatch.setattr("app.routes.notes.delete_note_service", fake_delete_note_service)

    response = client.delete("/notes/123")

    assert response.status_code == 200
    assert response.json() == {"deleted": 123}


def test_delete_note_route_returns_404_when_missing(monkeypatch):
    app = make_test_app(None)
    client = TestClient(app)

    def fake_delete_note_service(db, user_id, note_id):
        raise ValueError("Note not found")

    monkeypatch.setattr("app.routes.notes.delete_note_service", fake_delete_note_service)

    response = client.delete("/notes/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Note not found"