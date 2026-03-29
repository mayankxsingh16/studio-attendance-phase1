import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import client, { getApiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

function DocumentList({ documents }) {
  if (!documents?.length) {
    return <p className="small-text">No documents uploaded yet.</p>;
  }

  return (
    <div className="document-list">
      {documents.map((document, index) => (
        <a
          key={`${document.url}-${index}`}
          className="document-link"
          href={document.url}
          target="_blank"
          rel="noreferrer"
        >
          <span>{document.name || `Document ${index + 1}`}</span>
          <span className="small-text">
            {document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString() : "Uploaded"}
          </span>
        </a>
      ))}
    </div>
  );
}

export default function EmployeeHomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get("/auth/me")
      .then((response) => {
        setProfile(response.data.user);
      })
      .catch((requestError) => {
        setError(getApiErrorMessage(requestError, "Could not load your profile."));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const today = profile?.todayAttendance || null;
  const history = profile?.recentHistory || [];

  return (
    <div className="page-wrap">
      {error && <div className="card alert-error">{error}</div>}

      <div className="grid-two">
        <div className="card">
          <h2>Welcome, {profile?.name || user?.name}</h2>
          <p>Use the attendance flow when you are on-site and the admin QR is active.</p>
          <Link to="/employee/attendance" className="button-link">
            Open attendance flow
          </Link>
        </div>

        <div className="card">
          <h3>Employee Profile</h3>
          {loading && <p>Loading your profile...</p>}
          {profile ? (
            <>
              <div className="profile-header">
                <div className="avatar-shell">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="avatar-image" />
                  ) : (
                    <div className="avatar-placeholder">{(profile.name || "E").slice(0, 1).toUpperCase()}</div>
                  )}
                </div>
                <div>
                  <h4>{profile.name}</h4>
                  <p className="small-text">{profile.email}</p>
                  <p className="small-text">Late cutoff: {profile.lateCutoffLabel}</p>
                </div>
              </div>
              <div className="profile-grid">
                <div>
                  <span className="small-text">Phone Number</span>
                  <p>{profile.phone || "Not set"}</p>
                </div>
                <div>
                  <span className="small-text">Account</span>
                  <p>{profile.isActive ? "Active" : "Inactive"}</p>
                </div>
                <div>
                  <span className="small-text">Device</span>
                  <p>{profile.deviceBound ? "Bound to this device" : "Not bound yet"}</p>
                </div>
                <div>
                  <span className="small-text">Face setup</span>
                  <p>{profile.faceEnrolled ? "Face enrolled" : "Face not enrolled"}</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid-two">
        <div className="card">
          <h3>Today</h3>
          {loading && <p>Loading your attendance status...</p>}
          {today ? (
            <div>
              <p>Status: {today.status}</p>
              <p>Time: {new Date(today.checkIn.time).toLocaleString()}</p>
              <p>
                Face: {today.checkIn.faceVerified ? "Verified" : "Needs review"} (
                {today.checkIn.faceMatchScore ?? 0})
              </p>
              <img src={today.checkIn.photoUrl} alt="Today" className="preview-image" />
            </div>
          ) : !loading ? (
            <p>No attendance marked yet today.</p>
          ) : null}
        </div>

        <div className="card">
          <h3>Device Profile</h3>
          {loading && <p>Loading device details...</p>}
          {profile?.deviceInfo ? (
            <div>
              <p>Bound at: {new Date(profile.deviceInfo.boundAt).toLocaleString()}</p>
              <p className="small-text">User agent: {profile.deviceInfo.userAgent || "Unavailable"}</p>
            </div>
          ) : !loading ? (
            <p>No device details available yet.</p>
          ) : null}
        </div>
      </div>

      <div className="card">
        <h3>Documents</h3>
        {loading && <p>Loading your documents...</p>}
        {!loading && <DocumentList documents={profile?.documents || []} />}
      </div>

      <div className="card">
        <h3>Recent history</h3>
        {loading && <p>Loading recent history...</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Face</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item._id}>
                  <td>{item.date}</td>
                  <td>{item.status}</td>
                  <td>{item.checkIn.faceVerified ? "Verified" : "Review"}</td>
                  <td>{new Date(item.checkIn.time).toLocaleString()}</td>
                </tr>
              ))}
              {!loading && history.length === 0 && (
                <tr>
                  <td colSpan="4">No history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
