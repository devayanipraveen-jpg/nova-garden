import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, signup } from "../api/authApi";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("aarav@nova.dev");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
      navigate("/garden");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-ivory)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          padding: 32,
          background: "#fff",
          border: "1px solid var(--color-sage-soft)",
          borderRadius: 12,
        }}
      >
        <h1 style={{ fontSize: 28, marginBottom: 4 }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75em", fontWeight: 700 }}>NOVA</span> garden</h1>
        <p style={{ marginTop: 0, marginBottom: 24, color: "#514f45", fontSize: 14 }}>
          Grow better code.
        </p>

        {mode === "signup" && (
          <label style={fieldStyle}>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          </label>
        )}
        <label style={fieldStyle}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        <label style={fieldStyle}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
          />
        </label>

        {error && <p style={{ color: "var(--color-coral)", fontSize: 13 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 0",
            marginTop: 8,
            background: "var(--color-forest)",
            color: "var(--color-ivory)",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
          }}
        >
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          style={{
            width: "100%",
            padding: "8px 0",
            marginTop: 8,
            background: "transparent",
            border: "none",
            color: "var(--color-olive)",
            fontSize: 13,
          }}
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>

        <p style={{ fontSize: 12, color: "#8a8878", marginTop: 16 }}>
          Demo login: aarav@nova.dev / password123 (seeded)
        </p>
      </form>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#514f45",
  marginBottom: 14,
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  marginTop: 4,
  border: "1px solid var(--color-sage-soft)",
  borderRadius: 6,
  fontSize: 14,
};
