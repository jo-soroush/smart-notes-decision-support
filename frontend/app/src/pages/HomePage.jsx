import { useEffect, useRef, useState } from "react";
import NotesList from "../components/NotesList";

function HomePage() {
  const [notes, setNotes] = useState([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Meta from backend
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Live search state
  const [search, setSearch] = useState("");

  // Debounced value (used for API calls)
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Keep reference to abort ongoing request
  const abortRef = useRef(null);

  // temporary form state (for POST)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => clearTimeout(t);
  }, [search]);

  // Reset to first page when search changes (debounced)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  async function loadNotes() {
    // Abort previous request if still running
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`http://127.0.0.1:8000/notes?${params.toString()}`, {
        signal: controller.signal,
      });

      const data = await res.json();

      setNotes(data.items);
      setPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      // Ignore abort errors (expected during fast typing)
      if (err?.name === "AbortError") return;
      console.error("Failed to load notes:", err);
    }
  }

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedSearch]);

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

      // If user is viewing the newest-first list (no search) and on page 1, show it immediately.
      if (page === 1 && !debouncedSearch) {
        setNotes((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  }

  function handleDeleteInUI(deletedId) {
    setNotes((prev) => prev.filter((n) => n.id !== deletedId));
    setTotal((t) => Math.max(0, t - 1));
  }

  function handleUpdateInUI(updatedNote) {
    setNotes((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
  }

  const canPrev = page > 1;
  const canNext = pages > 0 && page < pages;

  function goPrev() {
    if (canPrev) setPage((p) => p - 1);
  }

  function goNext() {
    if (canNext) setPage((p) => p + 1);
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

      {/* Live Search */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          style={{ width: "100%", padding: "0.5rem" }}
        />
        <div style={{ marginTop: "0.35rem", opacity: 0.7, fontSize: "0.9rem" }}>
          {debouncedSearch ? (
            <>
              Searching: <strong>{debouncedSearch}</strong>
            </>
          ) : (
            "Showing all notes"
          )}
        </div>
      </div>

      {/* Pagination UI */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <button onClick={goPrev} disabled={!canPrev}>
          Prev
        </button>

        <div>
          Page <strong>{page}</strong> {pages ? <>of <strong>{pages}</strong></> : null}
          <span style={{ marginLeft: "0.75rem", opacity: 0.8 }}>
            Total: {total}
          </span>
        </div>

        <button onClick={goNext} disabled={!canNext}>
          Next
        </button>
      </div>

      <NotesList notes={notes} onDelete={handleDeleteInUI} onUpdate={handleUpdateInUI} />
    </div>
  );
}

export default HomePage;