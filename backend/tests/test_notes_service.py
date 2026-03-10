import app.models.ai_result  # noqa: F401
import app.models.user  # noqa: F401
import pytest
from app.schemas.note import NoteCreate
from app.services.notes_service import (
    create_note_service,
    delete_note_service,
    get_note_by_id,
    update_note_service,
)


class DummyResult:
    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return None


class DummyDB:
    def query(self, *args, **kwargs):
        return DummyResult()


def test_get_note_by_id_none():
    db = DummyDB()
    result = get_note_by_id(db=db, user_id=1, note_id=999)
    assert result is None


class DummyNote:
    def __init__(self, note_id):
        self.id = note_id


class DummyResultWithNote:
    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return DummyNote(123)


class DummyDBWithNote:
    def query(self, *args, **kwargs):
        return DummyResultWithNote()


def test_get_note_by_id_found():
    db = DummyDBWithNote()
    result = get_note_by_id(db=db, user_id=1, note_id=123)
    assert result is not None
    assert result.id == 123


class DummyResultForDeleteNone:
    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return None


class DummyDBForDeleteNone:
    def query(self, *args, **kwargs):
        return DummyResultForDeleteNone()


def test_delete_note_service_not_found():
    db = DummyDBForDeleteNone()

    with pytest.raises(ValueError, match="Note not found"):
        delete_note_service(db=db, user_id=1, note_id=999)


class DummyFolderQueryResult:
    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return None


class DummyCreateDB:
    def __init__(self):
        self.added_objects = []
        self.flushed = False
        self.committed = False
        self.refreshed = False

    def query(self, model, *args, **kwargs):
        return DummyFolderQueryResult()

    def add(self, obj):
        self.added_objects.append(obj)

    def flush(self):
        self.flushed = True
        for obj in self.added_objects:
            if hasattr(obj, "id") and getattr(obj, "id", None) is None:
                obj.id = 1

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        self.refreshed = True


def test_create_note_service_creates_note_and_activity_log():
    db = DummyCreateDB()

    note = NoteCreate(
        title="Test title",
        content="Test content",
        status="draft",
        folder_id=None,
        type=None,
        source_system=None,
        external_run_id=None,
        note_metadata=None,
    )

    result = create_note_service(db=db, user_id=1, note=note)

    assert result is not None
    assert result.title == "Test title"
    assert db.flushed is True
    assert db.committed is True
    assert db.refreshed is True
    assert len(db.added_objects) == 2


class DummyExistingNote:
    def __init__(self):
        self.id = 55
        self.title = "Old title"
        self.content = "Old content"
        self.status = "draft"
        self.folder_id = None
        self.type = None
        self.source_system = None
        self.external_run_id = None
        self.note_metadata = None


class DummyResultForUpdateNote:
    def __init__(self, note):
        self.note = note

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.note


class DummyUpdateDB:
    def __init__(self):
        self.note = DummyExistingNote()
        self.added_objects = []
        self.committed = False
        self.refreshed = False

    def query(self, model, *args, **kwargs):
        if model.__name__ == "FolderModel":
            return DummyFolderQueryResult()
        return DummyResultForUpdateNote(self.note)

    def add(self, obj):
        self.added_objects.append(obj)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        self.refreshed = True


def test_update_note_service_updates_note_and_activity_log():
    db = DummyUpdateDB()

    updated_note = NoteCreate(
        title="New title",
        content="New content",
        status="final",
        folder_id=None,
        type=None,
        source_system=None,
        external_run_id=None,
        note_metadata=None,
    )

    result = update_note_service(
        db=db,
        user_id=1,
        note_id=55,
        updated_note=updated_note,
    )

    assert result is not None
    assert result.id == 55
    assert result.title == "New title"
    assert result.content == "New content"
    assert result.status == "final"
    assert db.committed is True
    assert db.refreshed is True
    assert len(db.added_objects) == 1


class DummyDeleteNote:
    def __init__(self):
        self.id = 77
        self.title = "Delete me"
        self.content = "To be deleted"
        self.status = "draft"
        self.folder_id = None
        self.type = None
        self.source_system = None
        self.external_run_id = None
        self.note_metadata = None


class DummyResultForDeleteNote:
    def __init__(self, note):
        self.note = note

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.note


class DummyDeleteDB:
    def __init__(self):
        self.note = DummyDeleteNote()
        self.added_objects = []
        self.deleted_objects = []
        self.committed = False

    def query(self, model, *args, **kwargs):
        return DummyResultForDeleteNote(self.note)

    def add(self, obj):
        self.added_objects.append(obj)

    def delete(self, obj):
        self.deleted_objects.append(obj)

    def commit(self):
        self.committed = True


def test_delete_note_service_deletes_note_and_activity_log():
    db = DummyDeleteDB()

    delete_note_service(db=db, user_id=1, note_id=77)

    assert len(db.deleted_objects) == 1
    assert db.deleted_objects[0].id == 77
    assert len(db.added_objects) == 1
    assert db.committed is True