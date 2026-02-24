import { useEffect, useRef, useState } from "react";
import NotesList from "../components/NotesList";

function HomePage() {
  const [notes, setNotes] = useState([]);

  // Folders
  const [folders, setFolders] = useState([]);
  const [folderFilterId, setFolderFilterId] = useState(""); // "" means all
  const [createFolderId, setCreateFolderId] = useState(""); // "" means no folder

  // Folder manager UI state
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

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
      folder_id: createFolderId ? Number(createFolderId) : null,
    };

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

      const passesFolderFilter = !folderFilterId || createdFolderId === filterFolderIdNum;

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

  async function handleCreateFolder(e) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

     if (res.status === 409) {
  alert("A folder with this name already exists.");
  return;
}

if (!res.ok) {
  const text = await res.text();
  console.error("Create folder failed:", res.status, text);
  alert("Failed to create folder.");
  return;
}

      const created = await res.json();
      setNewFolderName("");
      setFolders((prev) => [...prev, created]);
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  }

  function startRename(folder) {
    setRenamingFolderId(folder.id);
    setRenameValue(folder.name);
  }

  function cancelRename() {
    setRenamingFolderId(null);
    setRenameValue("");
  }

  async function submitRename(folderId) {
    const name = renameValue.trim();
    if (!name) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/folders/${folderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Rename folder failed:", res.status, text);
        return;
      }

      const updated = await res.json();
      setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));

      if (folderFilterId && Number(folderFilterId) === updated.id) {
        // nothing else needed, UI label will update via folders state
      }

      cancelRename();
    } catch (err) {
      console.error("Failed to rename folder:", err);
    }
  }

  async function handleDeleteFolder(folderId) {
    const folderName = folders.find((f) => f.id === folderId)?.name ?? String(folderId);

    const ok = window.confirm(`Delete folder "${folderName}"? Notes will keep existing but their folder becomes empty.`);
    if (!ok) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/folders/${folderId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Delete folder failed:", res.status, text);
        return;
      }

      setFolders((prev) => prev.filter((f) => f.id !== folderId));

      if (folderFilterId && Number(folderFilterId) === folderId) {
        setFolderFilterId("");
      }

      if (createFolderId && Number(createFolderId) === folderId) {
        setCreateFolderId("");
      }

      // Notes currently on screen might have folder_id removed -> safest refresh
      loadNotes();
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
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

      {/* Folder Manager */}
      <div style={{ border: "1px solid #444", padding: "0.75rem", marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Folders</h3>

        <form onSubmit={handleCreateFolder} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name..."
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <button type="submit">Add</button>
        </form>

        {folders.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.8 }}>No folders yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {folders.map((f) => (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  border: "1px solid #333",
                  padding: "0.5rem",
                }}
              >
                {renamingFolderId === f.id ? (
                  <>
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      style={{ flex: 1, padding: "0.4rem" }}
                      placeholder="Folder name"
                    />
                    <button type="button" onClick={() => submitRename(f.id)}>
                      Save
                    </button>
                    <button type="button" onClick={cancelRename}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <strong>{f.name}</strong> <span style={{ opacity: 0.7 }}>#{f.id}</span>
                    </div>
                    <button type="button" onClick={() => startRename(f)}>
                      Rename
                    </button>
                    <button type="button" onClick={() => handleDeleteFolder(f.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
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
                {folders.find((x) => String(x.id) === folderFilterId)?.name ?? folderFilterId}
              </strong>
            </>
          ) : null}
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
          Page <strong>{page}</strong>{" "}
          {pages ? (
            <>
              of <strong>{pages}</strong>
            </>
          ) : null}
          <span style={{ marginLeft: "0.75rem", opacity: 0.8 }}>Total: {total}</span>
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