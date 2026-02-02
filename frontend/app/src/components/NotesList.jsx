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

  // Create
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('draft')

  // Edit
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editStatus, setEditStatus] = useState('draft')

  // Search
  const [query, setQuery] = useState('')

  function handleAddNote(e) {
    e.preventDefault()

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle || !trimmedContent) return

    const newNote = {
      id: Date.now(),
      title: trimmedTitle,
      content: trimmedContent,
      status,
    }

    setNotes((prev) => [newNote, ...prev])
    setTitle('')
    setContent('')
    setStatus('draft')
  }

  function handleDelete(id) {
    setNotes((prev) => prev.filter((note) => note.id !== id))
    if (editingId === id) cancelEdit()
  }

  function startEdit(note) {
    setEditingId(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditStatus(note.status)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
    setEditStatus('draft')
  }

  function saveEdit(e) {
    e.preventDefault()

    const trimmedTitle = editTitle.trim()
    const trimmedContent = editContent.trim()

    if (!trimmedTitle || !trimmedContent) return

    setNotes((prev) =>
      prev.map((note) =>
        note.id === editingId
          ? {
              ...note,
              title: trimmedTitle,
              content: trimmedContent,
              status: editStatus,
            }
          : note
      )
    )

    cancelEdit()
  }

  const filteredNotes = notes.filter((note) => {
    const q = query.trim().toLowerCase()
    if (!q) return true

    return (
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q)
    )
  })

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

        <div style={{ marginBottom: '0.5rem' }}>
          <label>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '0.5rem' }}
            >
              <option value="draft">draft</option>
              <option value="final">final</option>
              <option value="archived">archived</option>
            </select>
          </label>
        </div>

        <button type="submit">Add note</button>
      </form>

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <label>
          Search
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in title or content..."
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </label>
      </div>

      {/* List */}
      {filteredNotes.length === 0 ? (
        <p>No notes found.</p>
      ) : (
        filteredNotes.map((note) => (
          <div key={note.id} style={{ marginBottom: '0.75rem' }}>
            {editingId === note.id ? (
              <form
                onSubmit={saveEdit}
                style={{ border: '1px solid #ccc', padding: '0.5rem' }}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}
                />

                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}
                />

                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}
                >
                  <option value="draft">draft</option>
                  <option value="final">final</option>
                  <option value="archived">archived</option>
                </select>

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
