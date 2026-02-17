import { useState } from "react";

function NoteItem({ note, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [status, setStatus] = useState(note.status);

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

      // update UI without reload
      if (onDelete) onDelete(note.id);
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }

  async function handleSave() {
    try {
      const res = await fetch(`http://127.0.0.1:8000/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: note.id,
          title: title.trim(),
          content: content.trim(),
          status,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("PUT failed:", res.status, text);
        return;
      }

      const updated = await res.json();

      setIsEditing(false);

      // update UI without reload
      if (onUpdate) onUpdate(updated);
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  }

  return (
    <div style={{ border: "1px solid #444", padding: "1rem", marginBottom: "1rem" }}>
      {!isEditing ? (
        <>
          <h3 style={{ margin: 0 }}>{note.title}</h3>
          <p style={{ margin: "0.5rem 0" }}>{note.content}</p>
          <p style={{ margin: 0 }}>Status: {note.status}</p>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button onClick={() => setIsEditing(true)}>Edit</button>
            <button onClick={handleDelete}>Delete</button>
          </div>
        </>
      ) : (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
            placeholder="Title"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              minHeight: "90px",
              marginBottom: "0.5rem",
            }}
            placeholder="Content"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: "0.5rem" }}
          >
            <option value="draft">draft</option>
            <option value="final">final</option>
            <option value="archived">archived</option>
          </select>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button onClick={handleSave}>Save (PUT)</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

export default NoteItem;
