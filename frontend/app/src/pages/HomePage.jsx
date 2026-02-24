import { useEffect, useRef, useState } from "react";
import NotesList from "../components/NotesList";
import NoteItem from "../components/NoteItem";
import AiPanel from "../components/AiPanel";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function HomePage() {
  const [notes, setNotes] = useState([]);

  // Folders
  const [folders, setFolders] = useState([]);
  const [folderFilterId, setFolderFilterId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  // Folder menu + rename UI
  const [openFolderMenuId, setOpenFolderMenuId] = useState(null);
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

  // Selected note
  const [selectedId, setSelectedId] = useState(null);

  // Abort ongoing request
  const abortRef = useRef(null);

  // ---- Resizable AI Panel ----
  const rootRef = useRef(null);
  const isResizingRef = useRef(false);

  // width in px for AI panel
  const [aiWidth, setAiWidth] = useState(() => {
    const saved = Number(localStorage.getItem("aiPanelWidth") || 360);
    return clamp(saved || 360, 280, 620);
  });

  useEffect(() => {
    localStorage.setItem("aiPanelWidth", String(aiWidth));
  }, [aiWidth]);

  function startResize(e) {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  useEffect(() => {
    function onMove(e) {
      if (!isResizingRef.current) return;
      const root = rootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const x = e.clientX;

      // Sidebar fixed width:
      const sidebarW = 320;

      // AI panel width = distance from right edge
      const newWidth = rect.right - x;

      // Clamp to nice limits
      setAiWidth(clamp(newWidth, 280, 620));
    }

    function onUp() {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ----------------------------

  async function loadFolders() {
    try {
      const res = await fetch("http://127.0.0.1:8000/folders");
      if (!res.ok) {
        console.error("Failed to load folders:", res.status, await res.text());
        return;
      }
      const data = await res.json();
      setFolders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load folders:", err);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

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
        console.error("Failed to load notes:", res.status, await res.text());
        return;
      }

      const data = await res.json();
      const items = data.items ?? [];
      setNotes(items);
      setPages(data.pages ?? 0);
      setTotal(data.total ?? 0);

      if (items.length > 0) {
        setSelectedId((prev) => {
          if (!prev) return items[0].id;
          const stillExists = items.some((n) => n.id === prev);
          return stillExists ? prev : items[0].id;
        });
      } else {
        setSelectedId(null);
      }
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

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  async function handleNewNote() {
    const payload = {
      title: "Untitled",
      content: "",
      status: "draft",
      folder_id: folderFilterId ? Number(folderFilterId) : null,
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("POST failed:", res.status, await res.text());
        return;
      }

      const created = await res.json();

      if (page === 1 && !debouncedSearch) {
        setNotes((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
        setSelectedId(created.id);
      } else {
        setSearch("");
        setDebouncedSearch("");
        setPage(1);
        setSelectedId(created.id);
      }
    } catch (e) {
      console.error("Failed to create note:", e);
    }
  }

  function handleDeleteInUI(deletedId) {
    setNotes((prev) => prev.filter((n) => n.id !== deletedId));
    setTotal((t) => Math.max(0, t - 1));
    setSelectedId((prev) => (prev === deletedId ? null : prev));
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
        console.error("Create folder failed:", res.status, await res.text());
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
    setOpenFolderMenuId(null);
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
        console.error("Rename folder failed:", res.status, await res.text());
        return;
      }

      const updated = await res.json();
      setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      cancelRename();
    } catch (err) {
      console.error("Failed to rename folder:", err);
    }
  }

  async function handleDeleteFolder(folderId) {
    const folderName = folders.find((f) => f.id === folderId)?.name ?? String(folderId);
    const ok = window.confirm(`Delete folder "${folderName}"?\nNotes will keep existing but their folder becomes empty.`);
    if (!ok) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/folders/${folderId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Delete folder failed:", res.status, await res.text());
        return;
      }

      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (folderFilterId && Number(folderFilterId) === folderId) setFolderFilterId("");
      setOpenFolderMenuId(null);

      loadNotes();
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  }

  // close folder menu on outside click
  useEffect(() => {
    function onDocMouseDown() {
      if (openFolderMenuId !== null) setOpenFolderMenuId(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [openFolderMenuId]);

  return (
    <div ref={rootRef} style={{ height: "100%", display: "flex", minHeight: 0 }}>
      {/* SIDEBAR */}
      <div
        style={{
          width: 320,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: 12,
          overflow: "auto",
          background: "rgba(0,0,0,0.35)",
        }}
      >
        <button
          onClick={handleNewNote}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 10,
            borderRadius: 10,
          }}
        >
          + New page
        </button>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          style={{ width: "100%", padding: "10px 12px", marginBottom: 10, borderRadius: 10 }}
        />

        <select
          value={folderFilterId}
          onChange={(e) => setFolderFilterId(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", marginBottom: 10, borderRadius: 10 }}
        >
          <option value="">All folders</option>
          {folders.map((f) => (
            <option key={f.id} value={String(f.id)}>
              {f.name}
            </option>
          ))}
        </select>

        <form onSubmit={handleCreateFolder} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder…"
            style={{ flex: 1, padding: "10px 12px", borderRadius: 10 }}
          />
          <button type="submit" style={{ padding: "10px 12px", borderRadius: 10 }}>
            Add
          </button>
        </form>

        {/* Folder list */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8, opacity: 0.9, fontSize: 13 }}>Folders</div>

          {folders.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.7 }}>No folders yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {folders.map((f) => {
                const isFiltered = folderFilterId && Number(folderFilterId) === f.id;
                const menuOpen = openFolderMenuId === f.id;
                const isRenaming = renamingFolderId === f.id;

                return (
                  <div
                    key={f.id}
                    style={{
                      position: "relative",
                      border: isFiltered ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(255,255,255,0.08)",
                      background: isFiltered ? "rgba(255,255,255,0.05)" : "transparent",
                      borderRadius: 10,
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {isRenaming ? (
                      <>
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          style={{ flex: 1, padding: "8px 10px", borderRadius: 10 }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitRename(f.id);
                            if (e.key === "Escape") cancelRename();
                          }}
                        />
                        <button onClick={() => submitRename(f.id)} style={{ padding: "8px 10px", borderRadius: 10 }}>
                          Save
                        </button>
                        <button onClick={cancelRename} style={{ padding: "8px 10px", borderRadius: 10 }}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <div
                          onClick={() => setFolderFilterId(String(f.id))}
                          style={{ flex: 1, cursor: "pointer" }}
                          title="Click to filter notes by this folder"
                        >
                          <div style={{ fontWeight: 650, fontSize: 13, lineHeight: 1.1 }}>{f.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.6 }}>#{f.id}</div>
                        </div>

                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFolderMenuId((prev) => (prev === f.id ? null : f.id));
                          }}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                          }}
                          aria-label="Folder menu"
                          title="Menu"
                        >
                          ...
                        </button>

                        {menuOpen ? (
                          <div
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                              position: "absolute",
                              right: 10,
                              top: "calc(100% + 6px)",
                              zIndex: 20,
                              width: 170,
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "#1f1f1f",
                              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                              padding: 6,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => startRename(f)}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 10px",
                                borderRadius: 10,
                              }}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFolder(f.id)}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 10px",
                                borderRadius: 10,
                                marginTop: 4,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 10, opacity: 0.7, fontSize: 13 }}>
          Total: <strong>{total}</strong>
          {debouncedSearch ? (
            <>
              {" "}
              • Searching: <strong>{debouncedSearch}</strong>
            </>
          ) : null}
        </div>

        <NotesList notes={notes} folders={folders} selectedId={selectedId} onSelect={setSelectedId} />

        {/* Pagination */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <button onClick={goPrev} disabled={!canPrev}>
            Prev
          </button>

          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Page <strong>{page}</strong>
            {pages ? (
              <>
                {" "}
                / <strong>{pages}</strong>
              </>
            ) : null}
          </div>

          <button onClick={goNext} disabled={!canNext}>
            Next
          </button>
        </div>
      </div>

      {/* MAIN EDITOR (different background) */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <NoteItem note={selectedNote} folders={folders} onDelete={handleDeleteInUI} onUpdate={handleUpdateInUI} />
        </div>
      </div>

      {/* DRAG HANDLE */}
      <div
        onMouseDown={startResize}
        title="Drag to resize"
        style={{
          width: 6,
          cursor: "col-resize",
          background: "rgba(255,255,255,0.06)",
        }}
      />

      {/* AI PANEL (different background) */}
      <div
        style={{
          width: aiWidth,
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          padding: 12,
          overflow: "auto",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <AiPanel noteId={selectedId} />
      </div>
    </div>
  );
}

export default HomePage;