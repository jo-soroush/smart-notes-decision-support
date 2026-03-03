import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

function NoteItem({ note, folders = [], onDelete, onUpdate, onRefresh }) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [status, setStatus] = useState(note?.status ?? "draft");
  const [folderId, setFolderId] = useState(note?.folder_id ? String(note.folder_id) : "");

  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setStatus(note?.status ?? "draft");
    setFolderId(note?.folder_id ? String(note.folder_id) : "");
  }, [note?.id]);

  if (!note) {
    return <div style={{ padding: 24, opacity: 0.75 }}>Select a note…</div>;
  }

  async function handleSave() {
    const payload = {
      title: title.trim(),
      content: content.trim(),
      status,
      folder_id: folderId ? Number(folderId) : null,
    };

    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`/notes/${note.id}`, {
        method: "PUT",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("PUT failed:", res.status, await res.text());
        return;
      }

      const updated = await res.json();

      // ✅ update HomePage immediately
      if (onUpdate) onUpdate(updated);

      // optional (kept for compatibility if used elsewhere)
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  }

  async function handleDelete() {
    const ok = window.confirm("Delete this note?");
    if (!ok) return;

    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`/notes/${note.id}`, {
        method: "DELETE",
        token,
      });

      if (!res.ok) {
        console.error("DELETE failed:", res.status, await res.text());
        return;
      }

      if (onDelete) onDelete(note.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }

  return (
    <div style={{ padding: 24, minHeight: 0 }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        style={{
          width: "100%",
          fontSize: 36,
          fontWeight: 800,
          background: "transparent",
          border: "none",
          outline: "none",
          marginBottom: 12,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "8px 10px" }}>
          <option value="draft">draft</option>
          <option value="final">final</option>
          <option value="archived">archived</option>
        </select>

        <select
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          style={{ padding: "8px 10px", flex: 1, minWidth: 160 }}
        >
          <option value="">No folder</option>
          {folders.map((f) => (
            <option key={f.id} value={String(f.id)}>
              {f.name}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={handleSave} style={{ padding: "8px 10px" }}>
            Save
          </button>
          <button onClick={handleDelete} style={{ padding: "8px 10px" }}>
            Delete
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write something…"
        style={{
          width: "100%",
          minHeight: "65vh",
          resize: "none",
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 16,
          lineHeight: 1.7,
        }}
      />
    </div>
  );
}

export default NoteItem;