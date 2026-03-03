import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

function MisRunsPage({ onOpenNote }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  const [symbol, setSymbol] = useState("");
  const [sort, setSort] = useState("created_at"); // dt | created_at
  const [order, setOrder] = useState("desc"); // asc | desc

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      } catch (e) {
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

    // 1) store it
    localStorage.setItem("open_note_id", idStr);

    // 2) ALSO emit an event so HomePage can react even if it doesn't remount
    window.dispatchEvent(new CustomEvent("smartnotes:open-note", { detail: { noteId: Number(linkedNoteId) } }));

    // 3) switch to home
    if (onOpenNote) onOpenNote();
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>MIS Runs</h2>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Total: <strong>{total}</strong>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <input
          value={symbol}
          onChange={(e) => {
            setOffset(0);
            setSymbol(e.target.value);
          }}
          placeholder="Filter by symbol (e.g. BTCUSDT)"
          style={{ padding: "10px 12px", borderRadius: 10, minWidth: 240 }}
        />

        <select
          value={sort}
          onChange={(e) => {
            setOffset(0);
            setSort(e.target.value);
          }}
          style={{ padding: "10px 12px", borderRadius: 10 }}
        >
          <option value="dt">sort: dt</option>
          <option value="created_at">sort: created_at</option>
        </select>

        <select
          value={order}
          onChange={(e) => {
            setOffset(0);
            setOrder(e.target.value);
          }}
          style={{ padding: "10px 12px", borderRadius: 10 }}
        >
          <option value="desc">order: desc</option>
          <option value="asc">order: asc</option>
        </select>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={goPrev} disabled={!canPrev}>
            Prev
          </button>
          <button onClick={goNext} disabled={!canNext}>
            Next
          </button>
        </div>
      </div>

      {loading ? <div style={{ marginTop: 12, opacity: 0.8 }}>Loading…</div> : null}
      {error ? (
        <div style={{ marginTop: 12, color: "tomato", whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: 12, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ overflowX: "auto" }}>
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
                  <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>{r.dt}</td>
                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>{r.symbol}</td>
                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>{r.timeframe}</td>
                    <td style={{ padding: 10, fontFamily: "monospace" }}>{r.run_id}</td>
                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>{r.pipeline_status}</td>

                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                      {canOpen ? (
                        <button onClick={() => handleOpenLinkedNote(linked)} style={{ padding: "6px 10px", borderRadius: 10 }}>
                          Open #{linked}
                        </button>
                      ) : (
                        <span style={{ opacity: 0.6 }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>{r.created_at}</td>
                  </tr>
                );
              })}

              {!loading && !error && items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 14, opacity: 0.75 }}>
                    No runs found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MisRunsPage;