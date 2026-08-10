import { type FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiClientError } from "../api/client";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const from = (location.state as { from?: string })?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Password123!");
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="sidebar-mark" style={{ background: "var(--accent)" }}>
            MC
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>Mini ERP + CRM</div>
            <div style={{ fontSize: 12, color: "var(--slate)" }}>Wholesale operations portal</div>
          </div>
        </div>

        <h1 style={{ fontSize: 19, marginBottom: 4 }}>Sign in</h1>
        <p style={{ fontSize: 13, color: "var(--slate)", marginTop: 0, marginBottom: 18 }}>
          Use your employee login to access the dashboard.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%", marginTop: 6 }}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="login-demo-box">
          <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Demo logins (password: Password123!)</div>
          {[
            { role: "Admin", email: "admin@demo.com" },
            { role: "Sales", email: "sales@demo.com" },
            { role: "Warehouse", email: "warehouse@demo.com" },
            { role: "Accounts", email: "accounts@demo.com" },
          ].map((d) => (
            <div className="login-demo-row" key={d.email}>
              <span>{d.role}</span>
              <button
                type="button"
                onClick={() => fillDemo(d.email)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <code>{d.email}</code>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
