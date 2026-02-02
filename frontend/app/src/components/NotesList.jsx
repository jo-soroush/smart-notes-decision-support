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

  // Create form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // Edit state
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  function handleDelete(id) {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setEditTitle('')
      setEditContent('')
    }
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

  function startEdit(note) {
    setEditingId(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
  }

  function saveEdit(e) {
    e.preventDefault()

    const trimmedTitle = editTitle.trim()
    const trimmedContent = editContent.trim()

    if (!trimmedTitle || !trimmedContent) return

    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === editingId
          ? { ...note, title: trimmedTitle, content: trimmedContent }
          : note
      )
    )

    cancelEdit()
  }

  return (
    <section>
      <h2>Notes</h2>

      {/* Create */}
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

      {/* List */}
      {notes.length === 0 ? (
        <p>No notes yet.</p>
      ) : (
        notes.map((note) => (
          <div key={note.id} style={{ marginBottom: '0.75rem' }}>
            {editingId === note.id ? (
              <form onSubmit={saveEdit} style={{ border: '1px solid #ccc', padding: '0.5rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label>
                    Edit title
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={{ display: 'block', width: '100%', padding: '0.5rem' }}
                    />
                  </label>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <label>
                    Edit content
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      style={{ display: 'block', width: '100%', padding: '0.5rem' }}
                    />
                  </label>
                </div>

                <button type="submit">Save</button>
                <button type="button" onClick={cancelEdit} style={{ marginLeft: '0.5rem' }}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <NoteItem note={note} onDelete={handleDelete} />
                <button type="button" onClick={() => startEdit(note)}>
                  Edit
                </button>
              </>
            )}
          </div>
        ))
      )}
    </section>
  )
}

export default NotesList
