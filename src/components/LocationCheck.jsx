import { useState } from "react";

export default function LocationCheck({ onLocation }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleCheck = () => {
    setError("");
    setStatus("loading");

    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("success");
        onLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (geoError) => {
        setStatus("error");
        setError(geoError.message || "Unable to read your location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="card">
      <h3>Step 1: GPS Verification</h3>
      <p>Make sure location permission is enabled before continuing.</p>
      <button onClick={handleCheck} disabled={status === "loading"}>
        {status === "loading" ? "Checking location..." : "Verify my location"}
      </button>
      {status === "success" && <p className="success-text">Location captured successfully.</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
