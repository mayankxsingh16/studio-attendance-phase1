import { useRef, useState } from "react";

export default function LiveCamera({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [preview, setPreview] = useState("");

  const openCamera = async () => {
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStreaming(true);
    } catch (cameraError) {
      setError(cameraError.message || "Could not open the camera.");
    }
  };

  const stopStream = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(image);
    stopStream();
    setStreaming(false);
    onCapture(image);
  };

  return (
    <div className="card">
      <h3>Step 3: Take Live Photo</h3>
      {!streaming && !preview && <button onClick={openCamera}>Open selfie camera</button>}
      <video ref={videoRef} className="camera-preview" autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {streaming && <button onClick={capture}>Capture photo</button>}
      {preview && (
        <div className="preview-block">
          <img src={preview} alt="Attendance preview" className="preview-image" />
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
