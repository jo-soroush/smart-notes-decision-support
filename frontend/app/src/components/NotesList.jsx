import { useState } from 'react'
import NoteItem from './NoteItem'

function NotesList() {
  const [notes, setNotes] = useState([
    {
      id: 1,
      title: 'First note',
      content: 'This is the first note',
      status: 'draft',
    },
    {
      id: 2,
      title: 'Second note',
      content: 'Another example note',
      status: 'final',
    },
  ])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  function handleDelete(id) {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id))
  }

  function handleAddNote(e) {
    e.preventDefault()

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle || !trimmedContent) return

    const newNote = {
      id: Date.now(),
      title: trimmedTitle,
      content: trimmedContent,
      status: 'draft',
    }

    setNotes((prevNotes) => [newNote, ...prevNotes])
    setTitle('')
    setContent('')
  }

  return (
    <section>
      <h2>Notes</h2>

      <form onSubmit={handleAddNote} style={{ marginBottom: '1rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '0.5rem' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <label>
            Content
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              style={{ display: 'block', width: '100%', padding: '0.5rem' }}
            />
          </label>
        </div>

        <button type="submit">Add note</button>
      </form>

      {notes.length === 0 ? (
        <p>No notes yet.</p>
      ) : (
        notes.map((note) => (
          <NoteItem key={note.id} note={note} onDelete={handleDelete} />
        ))
      )}
    </section>
  )
}

export default NotesList
