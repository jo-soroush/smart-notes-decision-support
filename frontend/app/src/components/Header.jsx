function Header({ isLoggedIn, onLogout, view, onChangeView }) {
  return (
    <header
      style={{
        marginBottom: "1rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
      }}
    >
      <div>
        <h1 style={{ margin: 0 }}>Smart Notes</h1>
        <p style={{ margin: 0 }}>Internal Decision Support Tool</p>
      </div>

      {isLoggedIn ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onChangeView?.("home")}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                opacity: view === "home" ? 1 : 0.7,
              }}
              title="Notes"
            >
              Notes
            </button>

            <button
              onClick={() => onChangeView?.("mis")}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                opacity: view === "mis" ? 1 : 0.7,
              }}
              title="MIS Runs"
            >
              MIS
            </button>
          </div>

          <button
            onClick={onLogout}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
            }}
          >
            Logout
          </button>
        </div>
      ) : null}
    </header>
  );
}

export default Header;