import { useState } from "react";
import { Navigate } from "react-router-dom";
import client, { getApiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useDeviceFingerprint } from "../hooks/useDeviceFingerprint";

export default function LoginPage() {
  const { user, login } = useAuth();
  const fingerprint = useDeviceFingerprint();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/employee"} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await client.post("/auth/login", {
        ...form,
        deviceFingerprint: fingerprint
      });

      login(response.data);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Login failed."));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    setError("");
    setForm(
      role === "admin"
        ? { email: "admin@studio.com", password: "Admin@123" }
        : { email: "employee@studio.com", password: "Employee@123" }
    );
  };

  return (
    <div className="page-wrap">
      <div className="card auth-card">
        <h1>Studio Attendance</h1>
        <p>Log in as an admin or employee.</p>
        <div className="login-choice-row">
          <button type="button" onClick={() => fillDemo("admin")}>
            Admin Login
          </button>
          <button type="button" onClick={() => fillDemo("employee")}>
            Employee Login
          </button>
        </div>
        <form onSubmit={handleSubmit} className="form-stack">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
          <button type="submit" disabled={loading || !fingerprint}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        {!fingerprint && <p className="small-text">Preparing secure device check...</p>}
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
