import NoteRow from "./NoteRow";

function NotesList({ notes, folders, selectedId, onSelect }) {
  return (
    <div>
      {(!notes || notes.length === 0) && (
        <p style={{ margin: "10px 0", opacity: 0.7, fontSize: 13 }}>No notes yet.</p>
      )}

      {notes?.map((note) => (
        <NoteRow
          key={note.id}
          note={note}
          folders={folders}
          selected={note.id === selectedId}
          onClick={() => onSelect?.(note.id)}
        />
      ))}
    </div>
  );
}

export default NotesList;