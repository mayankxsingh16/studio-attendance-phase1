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

  return (
    <div className="page-wrap">
      <div className="card auth-card">
        <h1>Studio Attendance</h1>
        <p>Log in as an admin or employee.</p>
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
        <div className="helper-box">
          <strong>Seeded admin:</strong>
          <span>admin@studio.com / Admin@123</span>
        </div>
      </div>
    </div>
  );
}
