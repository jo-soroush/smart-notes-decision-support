import app.models.ai_result  # noqa: F401
import app.models.user  # noqa: F401
from app.db import get_db
from app.routes.folders import router as folders_router
from fastapi import FastAPI
from fastapi.testclient import TestClient


class DummyFolder:
    def __init__(self, folder_id, name):
        self.id = folder_id
        self.name = name


class DummyQueryList:
    def __init__(self, items):
        self.items = items

    def order_by(self, *args, **kwargs):
        return self

    def all(self):
        return self.items


class DummyFolderQuerySingle:
    def __init__(self, folder):
        self.folder = folder

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.folder


class DummyNoteUpdateQuery:
    def __init__(self):
        self.updated = False
        self.update_payload = None

    def filter(self, *args, **kwargs):
        return self

    def update(self, payload, synchronize_session=False):
        self.updated = True
        self.update_payload = payload
        return 1


class DummyDB:
    def __init__(self, folders):
        self.folders = folders
        self.added_objects = []
        self.deleted_objects = []
        self.committed = False
        self.refreshed = False
        self.note_update_query = DummyNoteUpdateQuery()

    def query(self, model):
        model_name = getattr(model, "__name__", str(model))

        if model_name == "FolderModel":
            if isinstance(self.folders, list):
                return DummyQueryList(self.folders)
            return DummyFolderQuerySingle(self.folders)

        if model_name == "NoteModel":
            return self.note_update_query

        return DummyQueryList([])

    def add(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = 500
        self.added_objects.append(obj)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        self.refreshed = True

    def rollback(self):
        pass

    def delete(self, obj):
        self.deleted_objects.append(obj)


def make_test_app(folders):
    app = FastAPI()
    app.include_router(folders_router)

    db = DummyDB(folders)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    return app


def test_get_folders_returns_all_folders():
    app = make_test_app(
        [
            DummyFolder(1, "Work"),
            DummyFolder(2, "Personal"),
        ]
    )
    client = TestClient(app)

    response = client.get("/folders")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["id"] == 1
    assert data[0]["name"] == "Work"
    assert data[1]["id"] == 2
    assert data[1]["name"] == "Personal"


def test_get_folders_returns_empty_list():
    app = make_test_app([])
    client = TestClient(app)

    response = client.get("/folders")

    assert response.status_code == 200
    assert response.json() == []


def test_create_folder_returns_created_folder():
    app = make_test_app([])
    client = TestClient(app)

    response = client.post(
        "/folders",
        json={"name": "Projects"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 500
    assert data["name"] == "Projects"


def test_update_folder_returns_updated_folder():
    app = make_test_app(DummyFolder(10, "Old Name"))
    client = TestClient(app)

    response = client.put(
        "/folders/10",
        json={"name": "New Name"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 10
    assert data["name"] == "New Name"


def test_update_folder_returns_404_when_missing():
    app = make_test_app(None)
    client = TestClient(app)

    response = client.put(
        "/folders/999",
        json={"name": "Missing"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Folder not found"


def test_delete_folder_returns_deleted_id():
    folder = DummyFolder(20, "Delete Me")
    app = make_test_app(folder)
    client = TestClient(app)

    response = client.delete("/folders/20")

    assert response.status_code == 200
    assert response.json() == {"deleted": 20}


def test_delete_folder_returns_404_when_missing():
    app = make_test_app(None)
    client = TestClient(app)

    response = client.delete("/folders/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Folder not found"