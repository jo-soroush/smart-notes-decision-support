import { useEffect, useRef, useState } from "react";
import NotesList from "../components/NotesList";
import NoteItem from "../components/NoteItem";
import AiPanel from "../components/AiPanel";
import { apiFetch } from "../lib/api";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function HomePage() {
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderFilterId, setFolderFilterId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const abortRef = useRef(null);
  const rootRef = useRef(null);
  const isResizingRef = useRef(false);

  const [aiWidth, setAiWidth] = useState(() => {
    const saved = Number(localStorage.getItem("aiPanelWidth") || 360);
    return clamp(saved || 360, 280, 620);
  });

  useEffect(() => {
    localStorage.setItem("aiPanelWidth", String(aiWidth));
  }, [aiWidth]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, folderFilterId]);

  function handleUnauthorized(res) {
    if (res.status === 401) {
      localStorage.removeItem("token");
    }
  }

  // ---- Resizable AI Panel ----
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
      const newWidth = rect.right - x;
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
      const token = localStorage.getItem("token");
      const res = await apiFetch("/folders/with_counts", { token });

      if (!res.ok) {
        handleUnauthorized(res);
        console.error("Failed to load folders:", res.status, await res.text());
        return;
      }

      const data = await res.json();
      setFolders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load folders:", err);
    }
  }

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

      const token = localStorage.getItem("token");
      const res = await apiFetch(`/notes?${params.toString()}`, {
        token,
        signal: controller.signal,
      });

      if (!res.ok) {
        handleUnauthorized(res);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const token = localStorage.getItem("token");
      const res = await apiFetch("/notes", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        handleUnauthorized(res);
        console.error("POST /notes failed:", res.status, await res.text());
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

      loadFolders();
    } catch (e) {
      console.error("Failed to create note:", e);
    }
  }

  async function handleCreateFolder(e) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch("/folders", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.status === 409) {
        alert("A folder with this name already exists.");
        return;
      }

      if (!res.ok) {
        handleUnauthorized(res);
        console.error("Create folder failed:", res.status, await res.text());
        alert("Failed to create folder.");
        return;
      }

      setNewFolderName("");
      loadFolders();
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  }

  function handleDeleteInUI(deletedId) {
    setNotes((prev) => prev.filter((n) => n.id !== deletedId));
    setTotal((t) => Math.max(0, t - 1));
    setSelectedId((prev) => (prev === deletedId ? null : prev));
    loadFolders();
  }

  function handleUpdateInUI(updatedNote) {
    setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
    loadFolders();
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

      {/* MAIN EDITOR */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <NoteItem
            note={selectedNote}
            folders={folders}
            onDelete={handleDeleteInUI}
            onUpdate={handleUpdateInUI}
            onRefresh={() => {
              loadNotes();
              loadFolders();
            }}
          />
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

      {/* AI PANEL */}
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