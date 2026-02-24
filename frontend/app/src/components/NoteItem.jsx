import { useEffect, useMemo, useState } from "react";

function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) + h + str.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

function NoteItem({ note, folders = [], onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [status, setStatus] = useState(note.status);

  const [folderId, setFolderId] = useState(note.folder_id ? String(note.folder_id) : "");

  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const summaryStorageKey = useMemo(() => {
    const signature = JSON.stringify({
      id: note.id,
      title: note.title,
      content: note.content,
      status: note.status,
      folder_id: note.folder_id ?? null,
    });
    return `ai_summary:${note.id}:${hashString(signature)}`;
  }, [note]);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setStatus(note.status);
    setFolderId(note.folder_id ? String(note.folder_id) : "");

    const saved = localStorage.getItem(summaryStorageKey);
    if (saved) {
      setSummary(saved);
    } else {
      setSummary(null);
    }

    setSummaryError(null);
    setLoadingSummary(false);
  }, [note, summaryStorageKey]);

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

  async function handleGenerateSummary() {
    if (loadingSummary || summary) return;

    setLoadingSummary(true);
    setSummaryError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/ai/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_id: note.id,
          action_type: "summary",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("AI summary failed:", res.status, text);

        if (res.status === 503) {
          setSummaryError("AI is temporarily unavailable (503). Try again later.");
        } else {
          setSummaryError(`AI summary failed (${res.status})`);
        }
        return;
      }

      const data = await res.json();

      const extracted =
        data?.result_text ??
        data?.result ??
        data?.output ??
        data?.summary ??
        null;

      const finalText =
        extracted == null ? JSON.stringify(data, null, 2) : String(extracted);

      setSummary(finalText);
      localStorage.setItem(summaryStorageKey, finalText);
    } catch (err) {
      console.error("Failed to generate summary:", err);
      setSummaryError("Failed to generate summary (network/server).");
    } finally {
      setLoadingSummary(false);
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

            <button
              onClick={handleGenerateSummary}
              disabled={loadingSummary || !!summary}
            >
              {loadingSummary ? "Generating..." : summary ? "Summary Ready" : "AI Summary"}
            </button>
          </div>

          {summaryError ? (
            <p style={{ color: "tomato", marginTop: "0.75rem", marginBottom: 0 }}>
              {summaryError}
            </p>
          ) : null}

          {summary ? (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem",
                background: "#222",
                border: "1px solid #333",
                borderRadius: "6px",
              }}
            >
              <strong>AI Summary</strong>
              <p style={{ marginTop: "0.5rem", marginBottom: 0, whiteSpace: "pre-wrap" }}>
                {summary}
              </p>
            </div>
          ) : null}
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