function NoteItem({ note, onDelete }) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '0.5rem', marginBottom: '0.5rem' }}>
      <h3>{note.title}</h3>
      <p>{note.content}</p>
      <small>Status: {note.status}</small>
      <div style={{ marginTop: '0.5rem' }}>
        <button type="button" onClick={() => onDelete(note.id)}>
          Delete
        </button>
      </div>
    </div>
  )
}

export default NoteItem
