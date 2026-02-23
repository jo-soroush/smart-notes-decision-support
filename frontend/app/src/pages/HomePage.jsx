import { useEffect, useRef, useState } from "react";
import NotesList from "../components/NotesList";

function HomePage() {
  const [notes, setNotes] = useState([]);

  // Folders
  const [folders, setFolders] = useState([]);
  const [folderFilterId, setFolderFilterId] = useState(""); // "" means all
  const [createFolderId, setCreateFolderId] = useState(""); // "" means no folder

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Meta from backend
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Live search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Keep reference to abort ongoing request
  const abortRef = useRef(null);

  // temporary form state (for POST)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function loadFolders() {
    try {
      const res = await fetch("http://127.0.0.1:8000/folders");
      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to load folders:", res.status, text);
        return;
      }
      const data = await res.json();
      setFolders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load folders:", err);
    }
  }

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => clearTimeout(t);
  }, [search]);

  // Reset to first page when search or folder filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, folderFilterId]);

  async function loadNotes() {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (folderFilterId) params.set("folder_id", folderFilterId);

      const res = await fetch(`http://127.0.0.1:8000/notes?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to load notes:", res.status, text);
        return;
      }

      const data = await res.json();
      setNotes(data.items ?? []);
      setPages(data.pages ?? 0);
      setTotal(data.total ?? 0);
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Failed to load notes:", err);
    }
  }

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedSearch, folderFilterId]);

  async function handleCreate(e) {
    e.preventDefault();

    const payload = {
      title: title.trim(),
      content: content.trim(),
      status: "draft",
    };

    if (createFolderId) {
      payload.folder_id = Number(createFolderId);
    } else {
      payload.folder_id = null;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("POST failed:", res.status, text);
        return;
      }

      const created = await res.json();

      setTitle("");
      setContent("");
      setCreateFolderId("");

      const createdFolderId = created?.folder_id ?? null;
      const filterFolderIdNum = folderFilterId ? Number(folderFilterId) : null;

      const passesFolderFilter =
        !folderFilterId || createdFolderId === filterFolderIdNum;

      if (page === 1 && !debouncedSearch && passesFolderFilter) {
        setNotes((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
      } else {
        loadNotes();
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
    setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
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

        <div style={{ marginTop: "0.5rem" }}>
          <select
            value={createFolderId}
            onChange={(e) => setCreateFolderId(e.target.value)}
            style={{ padding: "0.5rem", width: "100%" }}
          >
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div style={{ marginBottom: "1rem" }}>
        <select
          value={folderFilterId}
          onChange={(e) => setFolderFilterId(e.target.value)}
          style={{ padding: "0.5rem", width: "100%", marginBottom: "0.5rem" }}
        >
          <option value="">All folders</option>
          {folders.map((f) => (
            <option key={f.id} value={String(f.id)}>
              {f.name}
            </option>
          ))}
        </select>

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
          {folderFilterId ? (
            <>
              {" "}
              in folder{" "}
              <strong>
                {folders.find((f) => String(f.id) === folderFilterId)?.name ?? folderFilterId}
              </strong>
            </>
          ) : null}
        </div>
      </div>

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
          Page <strong>{page}</strong>{" "}
          {pages ? (
            <>
              of <strong>{pages}</strong>
            </>
          ) : null}
          <span style={{ marginLeft: "0.75rem", opacity: 0.8 }}>
            Total: {total}
          </span>
        </div>

        <button onClick={goNext} disabled={!canNext}>
          Next
        </button>
      </div>

      <NotesList
  notes={notes}
  folders={folders}
  onDelete={handleDeleteInUI}
  onUpdate={handleUpdateInUI}
/>
    </div>
  );
}

export default HomePage;