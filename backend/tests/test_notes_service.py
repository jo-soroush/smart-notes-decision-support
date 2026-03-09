import pytest
from app.services.notes_service import delete_note_service, get_note_by_id


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