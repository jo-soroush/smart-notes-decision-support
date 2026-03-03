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

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  /* =========================
     OPEN NOTE FROM MIS (FIRST)
  ==========================*/

  useEffect(() => {
    const pending = localStorage.getItem("open_note_id");
    if (!pending) return;

    const want = Number(pending);
    if (!Number.isFinite(want)) {
      localStorage.removeItem("open_note_id");
      return;
    }

    (async () => {
      try {
        const token = getToken();
        const res = await apiFetch(`/notes/${want}`, { token });

        if (!res.ok) {
          console.error("Failed to fetch note directly:", await res.text());
          return;
        }

        const note = await res.json();

        setNotes((prev) => {
          const exists = prev.some((n) => n.id === note.id);
          return exists ? prev : [note, ...prev];
        });

        setSelectedId(note.id);
        localStorage.removeItem("open_note_id");
      } catch (e) {
        console.error("Open note error:", e);
      }
    })();
  }, []);

  /* =========================
     NORMAL LOAD NOTES
  ==========================*/

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
      const items = data.items ?? [];

      setNotes(items);
      setPages(data.pages ?? 0);
      setTotal(data.total ?? 0);

      // فقط اگر هیچ note ای انتخاب نشده
      setSelectedId((prev) => {
        if (prev) return prev;
        return items.length > 0 ? items[0].id : null;
      });
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error(err);
      }
    }
  }

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    loadNotes();
  }, [page, limit, debouncedSearch, folderFilterId]);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  /* =========================
     RENDER
  ==========================*/

  return (
    <div ref={rootRef} style={{ height: "100%", display: "flex", minHeight: 0 }}>
      <div style={{ width: 320, padding: 12, overflow: "auto" }}>
        <NotesList
          notes={notes}
          folders={folders}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        <NoteItem note={selectedNote} folders={folders} />
      </div>

      <div style={{ width: aiWidth }}>
        <AiPanel noteId={selectedId} />
      </div>
    </div>
  );
}

export default HomePage;