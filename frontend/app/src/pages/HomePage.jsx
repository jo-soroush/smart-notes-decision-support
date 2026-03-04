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

  // ✅ MIS pin (so loadNotes doesn't wipe the opened note out of state)
  const misPinnedNoteRef = useRef(null);
  const misPinnedNoteIdRef = useRef(null);
  const openingFromMisRef = useRef(false);

  const [aiWidth] = useState(() => {
    const saved = Number(localStorage.getItem("aiPanelWidth") || 360);
    return clamp(saved || 360, 280, 620);
  });

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  async function openNoteById(noteId) {
    const want = Number(noteId);
    if (!Number.isFinite(want)) return;

    openingFromMisRef.current = true;
    misPinnedNoteIdRef.current = want;

    try {
      const token = getToken();
      const res = await apiFetch(`/notes/${want}`, { token });

      if (!res.ok) {
        console.error("Failed to fetch note directly:", await res.text());
        return;
      }

      const note = await res.json();
      misPinnedNoteRef.current = note;

      setNotes((prev) => {
        const exists = prev.some((n) => n.id === note.id);
        return exists ? prev : [note, ...prev];
      });

      setSelectedId(note.id);
    } catch (e) {
      console.error("Open note error:", e);
    }
  }

  useEffect(() => {
    const pending = localStorage.getItem("open_note_id");
    if (!pending) return;

    localStorage.removeItem("open_note_id");
    openNoteById(pending);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, folderFilterId]);

  async function loadFolders() {
    try {
      const token = getToken();
      const res = await apiFetch(`/folders/with_counts`, { token });
      if (!res.ok) return;

      const data = await res.json();
      setFolders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
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

      const token = getToken();
      const res = await apiFetch(`/notes?${params.toString()}`, {
        token,
        signal: controller.signal,
      });

      if (!res.ok) {
        console.error("Load notes failed:", await res.text());
        return;
      }

      const data = await res.json();
      let items = data.items ?? [];

      const pinned = misPinnedNoteRef.current;
      if (pinned && !items.some((n) => n.id === pinned.id)) {
        items = [pinned, ...items];
      }

      setNotes(items);
      setPages(data.pages ?? 0);
      setTotal(data.total ?? 0);

      setSelectedId((prev) => {
        const pinnedId = misPinnedNoteIdRef.current;
        if (pinnedId) return pinnedId;

        if (prev) return prev;
        return items.length > 0 ? items[0].id : null;
      });

      openingFromMisRef.current = false;
    } catch (err) {
      if (err?.name !== "AbortError") console.error(err);
    }
  }

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    loadNotes();
  }, [page, limit, debouncedSearch, folderFilterId]);

  // ✅ instant UI sync after Save (no manual refresh needed)
  function handleNoteUpdate(updated) {
    if (!updated?.id) return;

    // keep pinned note updated too
    misPinnedNoteRef.current = updated;
    misPinnedNoteIdRef.current = updated.id;

    setNotes((prev) => {
      const exists = prev.some((n) => n.id === updated.id);
      const next = exists ? prev.map((n) => (n.id === updated.id ? updated : n)) : [updated, ...prev];
      return next;
    });

    setSelectedId(updated.id);

    // update sidebar counts if folder/status changed
    loadFolders();
  }

  // ✅ NEW: instant UI sync after Delete (no manual refresh needed)
  function handleNoteDelete(deletedId) {
    const id = Number(deletedId);
    if (!Number.isFinite(id)) return;

    // اگر نوت حذف شده همون pinned بود، پاکش کن
    if (misPinnedNoteIdRef.current === id) {
      misPinnedNoteIdRef.current = null;
      misPinnedNoteRef.current = null;
    }

    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);

      // اگر همون نوت انتخاب شده حذف شد، انتخاب رو ببر روی اولین نوت باقی‌مونده
      setSelectedId((cur) => {
        if (cur !== id) return cur;
        return next.length > 0 ? next[0].id : null;
      });

      return next;
    });

    // counts + pagination درست بشه
    loadFolders();
    loadNotes();
  }

  async function handleCreateNote() {
    try {
      const token = getToken();

      const fallbackStatus = notes.length > 0 ? notes[0].status : "draft";

      const payload = {
        title: "Untitled",
        content: "",
        status: fallbackStatus,
        folder_id: folderFilterId ? Number(folderFilterId) : null,
      };

      const res = await apiFetch(`/notes`, {
        token,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Create note failed:", await res.text());
        return;
      }

      const created = await res.json();

      misPinnedNoteRef.current = created;
      misPinnedNoteIdRef.current = created.id;

      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);

      loadFolders();
      loadNotes();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;

    try {
      const token = getToken();
      const res = await apiFetch(`/folders`, {
        token,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        console.error("Create folder failed:", await res.text());
        return;
      }

      setNewFolderName("");
      await loadFolders();
    } catch (e) {
      console.error(e);
    }
  }

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  return (
    <div ref={rootRef} style={{ height: "100%", display: "flex", minHeight: 0 }}>
      <div style={{ width: 320, padding: 12, overflow: "auto" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={handleCreateNote} style={{ padding: "8px 10px", cursor: "pointer" }}>
            + New Note
          </button>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ flex: 1, padding: "8px 10px" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <select
            value={folderFilterId}
            onChange={(e) => setFolderFilterId(e.target.value)}
            style={{ flex: 1, padding: "8px 10px" }}
          >
            <option value="">All folders</option>
            {folders.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.name} {typeof f.count === "number" ? `(${f.count})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name..."
            style={{ flex: 1, padding: "8px 10px" }}
          />
          <button onClick={handleCreateFolder} style={{ padding: "8px 10px", cursor: "pointer" }}>
            Add
          </button>
        </div>

        <NotesList notes={notes} folders={folders} selectedId={selectedId} onSelect={setSelectedId} />

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <small>
            Page {page}/{pages || 1} • Total {total}
          </small>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: "6px 10px", cursor: page <= 1 ? "not-allowed" : "pointer" }}
            >
              Prev
            </button>

            <button
              disabled={pages ? page >= pages : false}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: "6px 10px",
                cursor: pages ? (page >= pages ? "not-allowed" : "pointer") : "pointer",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        <NoteItem
          note={selectedNote}
          folders={folders}
          onUpdate={handleNoteUpdate}
          onDelete={handleNoteDelete}
        />
      </div>

      <div style={{ width: aiWidth }}>
        <AiPanel noteId={selectedId} />
      </div>
    </div>
  );
}

export default HomePage;