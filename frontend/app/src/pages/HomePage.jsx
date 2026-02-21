import { useEffect, useState } from "react";
import NotesList from "../components/NotesList";

function HomePage() {
  const [notes, setNotes] = useState([]);

  // temporary form state (for POST)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function loadNotes() {
    try {
      const res = await fetch("http://127.0.0.1:8000/notes");
      const data = await res.json();
      setNotes(data.items); // ✅ pagination response
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();

    try {
      const res = await fetch("http://127.0.0.1:8000/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          status: "draft",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("POST failed:", res.status, text);
        return;
      }

      const created = await res.json();

      setTitle("");
      setContent("");

      // update UI without reload
      setNotes((prev) => [created, ...prev]);
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  }

  function handleDeleteInUI(deletedId) {
    setNotes((prev) => prev.filter((n) => n.id !== deletedId));
  }

  function handleUpdateInUI(updatedNote) {
    setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
  }

  return (
    <div>
      <form onSubmit={handleCreate} style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            style={{ flex: 1, padding: "0.5rem" }}
            required
          />
          <button type="submit" style={{ padding: "0.5rem 1rem" }}>
            Create (POST)
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content"
          style={{ width: "100%", padding: "0.5rem", minHeight: "90px" }}
          required
        />
      </form>

      <NotesList
        notes={notes}
        onDelete={handleDeleteInUI}
        onUpdate={handleUpdateInUI}
      />
    </div>
  );
}

export default HomePage;