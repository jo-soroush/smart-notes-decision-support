import { useState } from "react";

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("test1@example.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const form = new URLSearchParams();
      form.set("grant_type", "password");
      form.set("username", email);
      form.set("password", password);

      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
        body: form.toString(),
      });

      if (!res.ok) {
        const txt = await res.text();
        setError(txt ? `Login failed (${res.status}): ${txt}` : `Login failed (${res.status})`);
        return;
      }

      const data = await res.json();
      const token = data?.access_token;

      if (!token) {
        setError("Login failed: no access_token in response");
        return;
      }

      localStorage.setItem("token", token);
      onLogin(token);
    } catch (err) {
      setError(`Login error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 20 }}>
      <div
        style={{
          width: 360,
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Login</h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ padding: "10px 12px", borderRadius: 10 }}
            autoComplete="username"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            style={{ padding: "10px 12px", borderRadius: 10 }}
            autoComplete="current-password"
          />

          <button disabled={loading} type="submit" style={{ padding: "10px 12px", borderRadius: 10 }}>
            {loading ? "Logging in..." : "Login"}
          </button>

          {error ? <div style={{ fontSize: 13, opacity: 0.85, whiteSpace: "pre-wrap" }}>{error}</div> : null}
        </form>
      </div>
    </div>
  );
}

export default LoginPage;