import { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

const containerStyle = {
  minHeight: "100vh",
  background: "#0d1117",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
};

const cardStyle = {
  width: "100%",
  maxWidth: 360,
  padding: "40px 32px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const titleStyle = {
  textAlign: "center",
  color: "#e6edf3",
  fontSize: 28,
  fontWeight: 600,
  letterSpacing: -0.5,
  margin: 0,
};

const dotStyle = {
  color: "#39d353",
};

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#e6edf3",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "12px 16px",
  background: "#238636",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
};

const errorStyle = {
  color: "#da3633",
  fontSize: 13,
  textAlign: "center",
  margin: 0,
};

function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={containerStyle}>
      <form style={cardStyle} onSubmit={handleSubmit}>
        <h1 style={titleStyle}>
          h<span style={dotStyle}>.</span>
        </h1>
        <input
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
          autoComplete="username"
          autoFocus
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          autoComplete="current-password"
        />
        {error && <p style={errorStyle}>{error}</p>}
        <button type="submit" style={buttonStyle} disabled={loading}>
          {loading ? "..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default Login;
