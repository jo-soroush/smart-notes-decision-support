function Header({ isLoggedIn, onLogout }) {
  return (
    <header
      style={{
        marginBottom: "1rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 16px",
      }}
    >
      <div>
        <h1 style={{ margin: 0 }}>Smart Notes</h1>
        <p style={{ margin: 0 }}>Internal Decision Support Tool</p>
      </div>

      {isLoggedIn ? (
        <button
          onClick={onLogout}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
          }}
        >
          Logout
        </button>
      ) : null}
    </header>
  );
}

export default Header;