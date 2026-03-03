import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function AiPanel({ noteId }) {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // ---- resizable summary box (vertical) ----
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHRef = useRef(0);

  const [summaryHeight, setSummaryHeight] = useState(() => {
    const saved = Number(localStorage.getItem("aiSummaryHeight") || 360);
    return clamp(saved || 360, 160, 720);
  });

  useEffect(() => {
    localStorage.setItem("aiSummaryHeight", String(summaryHeight));
  }, [summaryHeight]);

  function startResizeSummary(e) {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHRef.current = summaryHeight;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }

  useEffect(() => {
    function onMove(e) {
      if (!isResizingRef.current) return;
      const dy = e.clientY - startYRef.current;
      const next = startHRef.current + dy; // drag down => taller
      setSummaryHeight(clamp(next, 160, 720));
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
  }, [summaryHeight]);
  // -----------------------------------------

  useEffect(() => {
    if (!noteId) {
      setSummary(null);
      setSummaryError(null);
      setLoadingSummary(false);
      return;
    }

    let ignore = false;

    async function loadSummaryFromDB() {
      setSummaryError(null);

      try {
        const params = new URLSearchParams({
          note_id: String(noteId),
          action_type: "summary",
        });

        const token = localStorage.getItem("token");
        const res = await apiFetch(`/ai/results/latest?${params.toString()}`, { token });

        if (res.status === 404) {
          if (!ignore) setSummary(null);
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          if (!ignore) setSummaryError(`Load summary failed (${res.status}): ${text}`);
          return;
        }

        const data = await res.json();
        if (!ignore) setSummary(data?.result_text ?? null);
      } catch (e) {
        if (!ignore) setSummaryError("Load summary failed (network/server).");
      }
    }

    loadSummaryFromDB();
    return () => {
      ignore = true;
    };
  }, [noteId]);

  async function handleGenerateSummary() {
    if (!noteId) return;
    if (summary) return; // ✅ already exists => avoid extra cost

    setLoadingSummary(true);
    setSummaryError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch("/ai/jobs", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_id: noteId,
          action_type: "summary",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setSummaryError(text || `AI summary failed (${res.status})`);
        return;
      }

      const data = await res.json();
      setSummary(data?.result_text ?? null);
    } catch (err) {
      setSummaryError("Failed to generate summary (network/server).");
    } finally {
      setLoadingSummary(false);
    }
  }

  const hasSummary = !!summary;
  const disableGenerate = !noteId || loadingSummary || hasSummary;

  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 12,
        padding: 12,
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800 }}>AI</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Summary</div>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={disableGenerate}
          style={{ padding: "8px 10px", borderRadius: 10 }}
          title={hasSummary ? "Summary already exists for this note." : ""}
        >
          {loadingSummary ? "Generating..." : hasSummary ? "Summary Ready" : "Generate"}
        </button>
      </div>

      {!noteId ? (
        <p style={{ marginTop: 12, marginBottom: 0, opacity: 0.7, fontSize: 13 }}>
          Select a note to see AI summary.
        </p>
      ) : null}

      {summaryError ? (
        <p style={{ color: "tomato", marginTop: 12, marginBottom: 0, whiteSpace: "pre-wrap" }}>
          {summaryError}
        </p>
      ) : null}

      {noteId && summary ? (
        <div
          style={{
            marginTop: 12,
            borderRadius: 12,
            border: "1px solid #333",
            background: "#222",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 12, fontWeight: 800 }}>AI Summary</div>

          {/* Resizable content area */}
          <div
            style={{
              height: summaryHeight,
              padding: "0 12px 12px 12px",
              overflow: "auto",
            }}
          >
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}>
              {summary}
            </div>
          </div>

          {/* Drag handle (vertical) */}
          <div
            onMouseDown={startResizeSummary}
            title="Drag to resize"
            style={{
              height: 10,
              cursor: "row-resize",
              background: "rgba(255,255,255,0.06)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        </div>
      ) : null}

      {noteId && !summary && !summaryError ? (
        <p style={{ marginTop: 12, marginBottom: 0, opacity: 0.75, fontSize: 13 }}>
          No summary yet. Click “Generate”.
        </p>
      ) : null}
    </div>
  );
}

export default AiPanel;