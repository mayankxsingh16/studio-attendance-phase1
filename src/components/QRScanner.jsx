import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function QRScanner({ onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code?.data) {
      setStatus("success");
      stopScanner();
      onScan(code.data);
      return;
    }

    animationRef.current = requestAnimationFrame(tick);
  };

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }
        }
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("scanning");
      animationRef.current = requestAnimationFrame(tick);
    } catch (scannerError) {
      setStatus("error");
      setError(scannerError.message || "Unable to access the camera for QR scanning.");
    }
  };

  return (
    <div className="card">
      <h3>Step 2: Scan Admin QR</h3>
      <video ref={videoRef} className="camera-preview" autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {status === "scanning" && <p>Point your camera at the QR code.</p>}
      {status === "success" && <p className="success-text">QR scanned successfully.</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
