import NoteItem from "./NoteItem";

function NotesList({ notes, folders, onDelete, onUpdate }) {
  return (
    <div>
      {(!notes || notes.length === 0) && <p>No notes yet.</p>}

      {notes &&
        notes.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            folders={folders}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}
    </div>
  );
}

export default NotesList;