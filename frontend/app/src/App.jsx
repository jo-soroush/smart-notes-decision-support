import { useState } from "react";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");

  function handleLogin(newToken) {
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken("");
  }

  const isLoggedIn = Boolean(token);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header isLoggedIn={isLoggedIn} onLogout={handleLogout} />
      <div style={{ flex: 1, minHeight: 0 }}>
        {isLoggedIn ? <HomePage /> : <LoginPage onLogin={handleLogin} />}
      </div>
    </div>
  );
}

export default App;