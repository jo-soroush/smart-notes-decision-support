import app.models.ai_result  # noqa: F401
import app.models.note  # noqa: F401
from app.db import get_db
from app.routes.auth import router as auth_router
from fastapi import FastAPI
from fastapi.testclient import TestClient


class DummyUser:
    def __init__(self):
        self.id = 1
        self.email = "test@example.com"
        self.hashed_password = "hashed-password"


class DummyQuery:
    def __init__(self, user):
        self.user = user

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.user


class DummyDB:
    def __init__(self, user):
        self.user = user
        self.added_objects = []
        self.committed = False
        self.refreshed = False

    def query(self, model):
        return DummyQuery(self.user)

    def add(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = 2
        self.added_objects.append(obj)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        self.refreshed = True


def make_test_app(user):
    app = FastAPI()
    app.include_router(auth_router)

    db = DummyDB(user)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    return app


def test_login_returns_access_token(monkeypatch):
    app = make_test_app(DummyUser())
    client = TestClient(app)

    monkeypatch.setattr("app.routes.auth.verify_password", lambda plain, hashed: True)
    monkeypatch.setattr("app.routes.auth.create_access_token", lambda payload: "test-token")

    response = client.post(
        "/auth/login",
        data={
            "username": "test@example.com",
            "password": "secret123",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] == "test-token"
    assert data["token_type"] == "bearer"


def test_login_returns_401_for_invalid_credentials(monkeypatch):
    app = make_test_app(DummyUser())
    client = TestClient(app)

    monkeypatch.setattr("app.routes.auth.verify_password", lambda plain, hashed: False)

    response = client.post(
        "/auth/login",
        data={
            "username": "test@example.com",
            "password": "wrong-password",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_register_creates_user(monkeypatch):
    app = make_test_app(None)
    client = TestClient(app)

    monkeypatch.setattr("app.routes.auth.get_password_hash", lambda password: "hashed-secret")

    response = client.post(
        "/auth/register",
        params={
            "email": "new@example.com",
            "password": "secret123",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 2
    assert data["email"] == "new@example.com"


def test_register_returns_400_when_email_exists():
    app = make_test_app(DummyUser())
    client = TestClient(app)

    response = client.post(
        "/auth/register",
        params={
            "email": "test@example.com",
            "password": "secret123",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"