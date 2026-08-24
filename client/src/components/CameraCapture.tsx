import { Camera, Check, RefreshCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CameraCaptureProps = {
  title: string;
  hint: string;
  onCapture: (dataUrl: string) => void;
};

export function CameraCapture({ title, hint, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [image, setImage] = useState<string>();
  const [error, setError] = useState<string>();

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    try {
      setError(undefined);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 900 }, height: { ideal: 900 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);
    } catch {
      setError("L’accès à la caméra est nécessaire pour prendre le selfie en direct.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 720;
    canvas.height = 720;
    const context = canvas.getContext("2d");
    context?.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, 720, 720);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    setImage(dataUrl);
    onCapture(dataUrl);
    stopCamera();
  };

  return (
    <div className="camera-capture">
      <div className="camera-capture__head"><span><Camera size={18} /> {title}</span>{image && <span className="status-chip status-chip--verified"><Check size={14} /> Prise en direct</span>}</div>
      <p>{hint}</p>
      {image ? <img className="camera-capture__preview" src={image} alt="Selfie de vérification pris en direct" /> : active ? <video ref={videoRef} autoPlay muted playsInline className="camera-capture__preview" /> : <div className="camera-capture__empty"><Camera size={28} /></div>}
      <div className="camera-capture__actions">
        {active ? <><button type="button" onClick={capture} className="button button--gold"><Camera size={16} /> Prendre le selfie</button><button type="button" onClick={stopCamera} className="button button--ghost"><X size={16} /> Annuler</button></> : <button type="button" onClick={startCamera} className="button button--outline"><RefreshCcw size={16} /> {image ? "Reprendre" : "Ouvrir la caméra"}</button>}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
