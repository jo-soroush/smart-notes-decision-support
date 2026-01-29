import NoteItem from './NoteItem'

function NotesList() {
  const notes = [
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
  ]

  return (
    <section>
      <h2>Notes</h2>

      {notes.map((note) => (
        <NoteItem key={note.id} note={note} />
      ))}
    </section>
  )
}

export default NotesList
