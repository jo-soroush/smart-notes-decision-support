import { useState } from "react";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MisRunsPage from "./pages/MisRunsPage";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [view, setView] = useState("home"); // "home" | "mis"

  function handleLogin(newToken) {
    setToken(newToken);
    setView("home");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken("");
    setView("home");
  }

  const isLoggedIn = Boolean(token);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header isLoggedIn={isLoggedIn} onLogout={handleLogout} view={view} onChangeView={setView} />

      <div style={{ flex: 1, minHeight: 0 }}>
        {!isLoggedIn ? (
          <LoginPage onLogin={handleLogin} />
        ) : view === "home" ? (
          <HomePage />
        ) : (
          <MisRunsPage />
        )}
      </div>
    </div>
  );
}

export default App;