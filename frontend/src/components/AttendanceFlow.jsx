import { useEffect, useMemo, useState } from "react";
import client, { getApiErrorMessage } from "../api/client";
import { useDeviceFingerprint } from "../hooks/useDeviceFingerprint";
import LocationCheck from "./LocationCheck";
import QRScanner from "./QRScanner";
import LiveCamera from "./LiveCamera";

function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function getLateCutoffInfo() {
  return { hour: 9, minute: 35, label: "09:35 AM" };
}

export default function AttendanceFlow() {
  const [location, setLocation] = useState(null);
  const [officeLocation, setOfficeLocation] = useState(null);
  const [qrToken, setQrToken] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submittingLabel, setSubmittingLabel] = useState("Submit attendance");
  const fingerprint = useDeviceFingerprint();
  const lateCutoff = getLateCutoffInfo();

  useEffect(() => {
    client
      .get("/admin/office/location")
      .then((response) => setOfficeLocation(response.data.officeLocation))
      .catch(() => setOfficeLocation(null));
  }, []);

  const distanceInfo = useMemo(() => {
    if (!location || !officeLocation?.lat || !officeLocation?.lng) {
      return null;
    }

    const distanceMeters = haversineMeters(
      officeLocation.lat,
      officeLocation.lng,
      location.lat,
      location.lng
    );

    return {
      distanceMeters,
      insideRadius: distanceMeters <= Number(officeLocation.radiusMeters || 0)
    };
  }, [location, officeLocation]);

  const isNowLate = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(lateCutoff.hour, lateCutoff.minute, 0, 0);
    return now > cutoff;
  }, [lateCutoff.hour, lateCutoff.minute]);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setSubmittingLabel("Validating attendance...");

    try {
      const response = await client.post("/attendance/checkin", {
        location,
        qrToken,
        photoBase64,
        deviceFingerprint: fingerprint
      });

      setResult(response.data);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Attendance submission failed."));
    } finally {
      setLoading(false);
      setSubmittingLabel("Submit attendance");
    }
  };

  const resetFromQrStep = () => {
    setQrToken("");
    setPhotoBase64("");
    setError("");
  };

  if (result) {
    return (
      <div className="card success-card">
        <h2>Attendance Marked</h2>
        <p className="success-text">{result.message}</p>
        <p>{result.isLate ? "Status: Late" : "Status: Present"}</p>
        <p>Distance from office: {Math.round(result.distanceMeters)} meters</p>
        <p>Time: {new Date(result.time).toLocaleString()}</p>
        <p>{result.faceVerified ? "Face verification passed." : `Face verification note: ${result.faceVerificationMessage}`}</p>
        <p>Face score: {result.faceMatchScore}</p>
        <img src={result.photoUrl} alt="Check-in" className="preview-image" />
      </div>
    );
  }

  return (
    <div className="flow-stack">
      {!location && <LocationCheck onLocation={setLocation} />}
      {location && (
        <div className="card">
          <h3>Current Location Check</h3>
          <p>Accuracy: {Math.round(location.accuracy)} meters</p>
          {distanceInfo ? (
            <>
              <p>Distance from office: {Math.round(distanceInfo.distanceMeters)} meters</p>
              <p className={distanceInfo.insideRadius ? "success-text" : "error-text"}>
                {distanceInfo.insideRadius
                  ? "You are inside the allowed office radius."
                  : "You are currently outside the office radius."}
              </p>
            </>
          ) : (
            <p className="small-text">Office coordinates are still loading.</p>
          )}
        </div>
      )}
      {location && !qrToken && <QRScanner onScan={setQrToken} />}
      {location && qrToken && !photoBase64 && <LiveCamera onCapture={setPhotoBase64} />}
      {location && qrToken && photoBase64 && (
        <div className="card">
          <h3>Step 4: Confirm Attendance</h3>
          <p className={isNowLate ? "error-text" : "small-text"}>
            {isNowLate
              ? `You are submitting after ${lateCutoff.label}, so this attendance will be marked late.`
              : `Late attendance starts after ${lateCutoff.label}.`}
          </p>
          <img src={photoBase64} alt="Preview" className="preview-image" />
          <button onClick={handleSubmit} disabled={loading || !fingerprint}>
            {loading ? submittingLabel : "Submit attendance"}
          </button>
          <button type="button" onClick={resetFromQrStep} disabled={loading}>
            Rescan QR
          </button>
          {!fingerprint && <p>Preparing device fingerprint...</p>}
          {error && <p className="error-text">{error}</p>}
        </div>
      )}
    </div>
  );
}
