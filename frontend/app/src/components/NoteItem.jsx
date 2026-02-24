import { useEffect, useMemo, useState } from "react";

function NoteItem({ note, folders = [], onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [status, setStatus] = useState(note.status);

  // store as string for select
  const [folderId, setFolderId] = useState(note.folder_id ? String(note.folder_id) : "");

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setStatus(note.status);
    setFolderId(note.folder_id ? String(note.folder_id) : "");
  }, [note]);

  const folderName = useMemo(() => {
    if (!note.folder_id) return "None";
    const f = folders.find((x) => x.id === note.folder_id);
    return f ? f.name : `#${note.folder_id}`;
  }, [note.folder_id, folders]);

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

      if (onDelete) onDelete(note.id);
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }

  async function handleSave() {
    const payload = {
      title: title.trim(),
      content: content.trim(),
      status,
      folder_id: folderId ? Number(folderId) : null,
    };

    try {
      const res = await fetch(`http://127.0.0.1:8000/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("PUT failed:", res.status, text);
        return;
      }

      const updated = await res.json();
      setIsEditing(false);

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

          <p style={{ margin: 0, opacity: 0.9 }}>Folder: {folderName}</p>
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

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ padding: "0.5rem" }}
            >
              <option value="draft">draft</option>
              <option value="final">final</option>
              <option value="archived">archived</option>
            </select>

            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              style={{ padding: "0.5rem", flex: 1 }}
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

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