function NoteItem({ note }) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '0.5rem', marginBottom: '0.5rem' }}>
      <h3>{note.title}</h3>
      <p>{note.content}</p>
      <small>Status: {note.status}</small>
    </div>
  )
}

export default NoteItem

