function NoteItem({ note }) {
  async function handleDelete() {
    try {
      const res = await fetch(`http://127.0.0.1:8000/notes/${note.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("DELETE failed:", res.status, text);
        return;
      }

      // quick refresh (simple way for now)
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }

  return (
    <div style={{ border: "1px solid #444", padding: "1rem", marginBottom: "1rem" }}>
      <h3 style={{ margin: 0 }}>{note.title}</h3>
      <p style={{ margin: "0.5rem 0" }}>{note.content}</p>
      <p style={{ margin: 0 }}>Status: {note.status}</p>

      <button onClick={handleDelete} style={{ marginTop: "0.75rem" }}>
        Delete
      </button>
    </div>
  );
}

export default NoteItem;
