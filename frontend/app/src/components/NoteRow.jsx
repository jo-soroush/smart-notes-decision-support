import { useMemo } from "react";

function NoteRow({ note, folders = [], selected, onClick }) {
  const folderName = useMemo(() => {
    if (!note.folder_id) return "No folder";
    const f = folders.find((x) => x.id === note.folder_id);
    return f ? f.name : `#${note.folder_id}`;
  }, [note.folder_id, folders]);

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 10px",
        borderRadius: 10,
        cursor: "pointer",
        background: selected ? "rgba(255,255,255,0.06)" : "transparent",
        border: selected ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
        marginBottom: 6,
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 650,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {note.title?.trim() ? note.title : "Untitled"}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 12, opacity: 0.75 }}>
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 160,
          }}
        >
          {folderName}
        </span>
        <span>•</span>
        <span style={{ whiteSpace: "nowrap" }}>{note.status}</span>
      </div>
    </div>
  );
}

export default NoteRow;