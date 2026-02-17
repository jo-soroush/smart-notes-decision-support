import NoteItem from "./NoteItem";

function NotesList({ notes }) {
  return (
    <div>
      {(!notes || notes.length === 0) && <p>No notes yet.</p>}

      {notes && notes.map((note) => (
        <NoteItem key={note.id} note={note} />
      ))}
    </div>
  );
}

export default NotesList;
