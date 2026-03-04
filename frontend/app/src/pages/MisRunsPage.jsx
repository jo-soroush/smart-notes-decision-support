import { Fragment, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

function MisRunsPage({ onOpenNote }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  const [symbol, setSymbol] = useState("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [expandedRunId, setExpandedRunId] = useState(null);
  const [showPayloadRunId, setShowPayloadRunId] = useState(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(limit));
    p.set("offset", String(offset));
    if (symbol.trim()) p.set("symbol", symbol.trim());
    if (sort) p.set("sort", sort);
    if (order) p.set("order", order);
    return p.toString();
  }, [limit, offset, symbol, sort, order]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");
        const res = await apiFetch(`/api/integrations/mis/runs?${query}`, { token });

        if (!res.ok) {
          const txt = await res.text();
          if (!ignore) setError(txt ? `Load failed (${res.status}): ${txt}` : `Load failed (${res.status})`);
          return;
        }

        const data = await res.json();

        if (!ignore) {
          setItems(Array.isArray(data?.items) ? data.items : []);
          setTotal(Number(data?.total || 0));
        }
      } catch {
        if (!ignore) setError("Load failed (network/server).");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [query]);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  function goPrev() {
    if (!canPrev) return;
    setOffset((v) => Math.max(0, v - limit));
  }

  function goNext() {
    if (!canNext) return;
    setOffset((v) => v + limit);
  }

  function handleOpenLinkedNote(linkedNoteId) {
    if (!linkedNoteId) return;

    const idStr = String(linkedNoteId);

    localStorage.setItem("open_note_id", idStr);

    window.dispatchEvent(
      new CustomEvent("smartnotes:open-note", {
        detail: { noteId: Number(linkedNoteId) },
      })
    );

    if (onOpenNote) onOpenNote();
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>MIS Runs</h2>

      <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.7 }}>
        Total: <strong>{total}</strong>
      </div>

      {loading && <div style={{ marginBottom: 10 }}>Loading…</div>}
      {error && <div style={{ marginBottom: 10, color: "tomato" }}>{error}</div>}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead style={{ background: "rgba(255,255,255,0.04)" }}>
          <tr>
            <th style={{ textAlign: "left", padding: 10 }}>dt</th>
            <th style={{ textAlign: "left", padding: 10 }}>symbol</th>
            <th style={{ textAlign: "left", padding: 10 }}>timeframe</th>
            <th style={{ textAlign: "left", padding: 10 }}>run_id</th>
            <th style={{ textAlign: "left", padding: 10 }}>status</th>
            <th style={{ textAlign: "left", padding: 10 }}>linked_note</th>
            <th style={{ textAlign: "left", padding: 10 }}>created_at</th>
          </tr>
        </thead>

        <tbody>
          {items.map((r) => {
            const linked = r.linked_note_id ?? null;
            const canOpen = Boolean(linked);

            return (
              <Fragment key={r.id}>
                <tr
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setExpandedRunId((prev) => (prev === r.id ? null : r.id))
                  }
                >
                  <td style={{ padding: 10 }}>{r.dt}</td>
                  <td style={{ padding: 10 }}>{r.symbol}</td>
                  <td style={{ padding: 10 }}>{r.timeframe}</td>
                  <td style={{ padding: 10, fontFamily: "monospace" }}>{r.run_id}</td>
                  <td style={{ padding: 10 }}>{r.pipeline_status}</td>

                  <td style={{ padding: 10 }}>
                    {canOpen ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLinkedNote(linked);
                        }}
                        style={{ padding: "6px 10px", borderRadius: 10 }}
                      >
                        Open #{linked}
                      </button>
                    ) : (
                      <span style={{ opacity: 0.6 }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: 10 }}>{r.created_at}</td>
                </tr>

                {expandedRunId === r.id && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: 14,
                        background: "rgba(255,255,255,0.03)",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          marginBottom: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                        }}
                      >
                        {r.manifest_path && (
                          <div>
                            <span style={{ opacity: 0.6 }}>manifest_path: </span>
                            {r.manifest_path}
                          </div>
                        )}

                        {r.market_flag && (
                          <div>
                            <span style={{ opacity: 0.6 }}>market_flag: </span>
                            {r.market_flag}
                          </div>
                        )}

                        {r.risk_mode && (
                          <div>
                            <span style={{ opacity: 0.6 }}>risk_mode: </span>
                            {r.risk_mode}
                          </div>
                        )}

                        {r.pipeline_metadata && (
                          <div>
                            <span style={{ opacity: 0.6 }}>pipeline_metadata: </span>
                            {JSON.stringify(r.pipeline_metadata)}
                          </div>
                        )}

                        <div>
                          <span style={{ opacity: 0.6 }}>raw_payload: </span>

                          <button
                            style={{ marginLeft: 8 }}
                            onClick={() =>
                              setShowPayloadRunId((prev) =>
                                prev === r.id ? null : r.id
                              )
                            }
                          >
                            {showPayloadRunId === r.id
                              ? "Hide JSON"
                              : "Show JSON"}
                          </button>
                        </div>
                      </div>

                      {showPayloadRunId === r.id && (
                        <pre
                          style={{
                            margin: 0,
                            fontSize: 12,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                          }}
                        >
                          {JSON.stringify(r, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 14 }}>
        <button onClick={goPrev} disabled={!canPrev}>
          Prev
        </button>

        <button
          onClick={goNext}
          disabled={!canNext}
          style={{ marginLeft: 10 }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default MisRunsPage;