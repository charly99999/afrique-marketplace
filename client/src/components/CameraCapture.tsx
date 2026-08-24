import { Camera, Check, RefreshCcw, Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { compressImageDataUrl, mediaErrorMessage } from "@/lib/media";

type CameraCaptureProps = {
  title: string;
  hint: string;
  onCapture: (dataUrl: string) => void;
};

export function CameraCapture({ title, hint, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [image, setImage] = useState<string>();
  const [error, setError] = useState<string>();

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setReady(false);
    setActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (!active || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => setError("L’aperçu caméra n’a pas pu démarrer. Utilisez l’appareil photo ci-dessous."));
  }, [active]);

  const cameraErrorMessage = (error: unknown) => {
    const name = error instanceof DOMException ? error.name : "";
    if (!window.isSecureContext) return "La caméra exige une page sécurisée HTTPS. Ouvrez l’application depuis son adresse sécurisée.";
    if (name === "NotAllowedError" || name === "SecurityError") return "Autorisez l’accès à la caméra dans les réglages du navigateur, puis réessayez.";
    if (name === "NotFoundError") return "Aucune caméra avant n’a été détectée sur cet appareil.";
    if (name === "NotReadableError") return "La caméra est déjà utilisée par une autre application. Fermez-la, puis réessayez.";
    return "La caméra n’a pas pu démarrer. Utilisez l’appareil photo ci-dessous ou réessayez.";
  };

  const startCamera = async () => {
    try {
      setError(undefined);
      setStarting(true);
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported-camera");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" }, width: { ideal: 900 }, height: { ideal: 900 } }, audio: false });
      streamRef.current = stream;
      setActive(true);
    } catch (error) {
      setError(cameraErrorMessage(error));
    } finally {
      setStarting(false);
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !ready) {
      setError("L’aperçu caméra n’est pas encore prêt. Attendez une seconde, puis reprenez le selfie.");
      return;
    }
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

  const useNativeCamera = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = await compressImageDataUrl(String(reader.result), 1200);
        setImage(dataUrl);
        onCapture(dataUrl);
        setError(undefined);
      } catch (error) {
        setError(mediaErrorMessage(error));
      }
    };
    reader.onerror = () => setError("La photo prise avec l’appareil n’a pas pu être lue. Réessayez.");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const openNativeCamera = () => {
    stopCamera();
    nativeCameraRef.current?.click();
  };

  return (
    <div className="camera-capture">
      <div className="camera-capture__head"><span><Camera size={18} /> {title}</span>{image && <span className="status-chip status-chip--verified"><Check size={14} /> Prise en direct</span>}</div>
      <p>{hint}</p>
      {image ? <img className="camera-capture__preview" src={image} alt="Selfie de vérification pris en direct" /> : active ? <video ref={videoRef} autoPlay muted playsInline onLoadedMetadata={() => setReady(true)} className="camera-capture__preview" /> : <div className="camera-capture__empty"><Camera size={28} /></div>}
      <div className="camera-capture__actions">
        {active ? <><button type="button" disabled={!ready} onClick={capture} className="button button--gold"><Camera size={16} /> {ready ? "Prendre le selfie" : "Préparation…"}</button><button type="button" onClick={openNativeCamera} className="button button--outline"><Smartphone size={16} /> Appareil photo</button><button type="button" onClick={stopCamera} className="button button--ghost"><X size={16} /> Annuler</button></> : <><button type="button" disabled={starting} onClick={startCamera} className="button button--outline"><RefreshCcw size={16} /> {starting ? "Ouverture…" : image ? "Reprendre" : "Ouvrir la caméra"}</button><button type="button" onClick={openNativeCamera} className="button button--ghost"><Smartphone size={16} /> Appareil photo</button></>}
      </div>
      <input ref={nativeCameraRef} hidden type="file" accept="image/*" capture="user" onChange={useNativeCamera} />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
