import { Camera, Check, RefreshCcw, Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { compressImageDataUrl, mediaErrorMessage } from "@/lib/media";

export type CaptureLiveness = "passed" | "not_checked";

type CameraCaptureProps = {
  title: string;
  hint: string;
  onCapture: (dataUrl: string, liveness: CaptureLiveness) => void;
};

const delay = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));

export function hasActiveLivenessSignal(samples: number[]) {
  return samples.length >= 10 && Math.max(...samples) - Math.min(...samples) >= 0.16;
}

export function CameraCapture({ title, hint, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<{ detectForVideo: (video: HTMLVideoElement, timestamp: number) => { faceLandmarks: Array<Array<{ x: number; y: number }>> }; close: () => void } | null>(null);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [liveness, setLiveness] = useState<"idle" | "checking" | "passed" | "uncertain">("idle");
  const [image, setImage] = useState<string>();
  const [error, setError] = useState<string>();

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    setReady(false);
    setActive(false);
    setLiveness("idle");
  };

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (!active || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => setError("L’aperçu caméra n’a pas pu démarrer. Utilisez l’appareil photo ci-dessous."));
  }, [active]);

  const cameraErrorMessage = (cameraError: unknown) => {
    const name = cameraError instanceof DOMException ? cameraError.name : "";
    if (!window.isSecureContext) return "La caméra exige une page sécurisée HTTPS. Ouvrez l’application depuis son adresse sécurisée.";
    if (name === "NotAllowedError" || name === "SecurityError") return "Autorisez l’accès à la caméra dans les réglages du navigateur, puis réessayez.";
    if (name === "NotFoundError") return "Aucune caméra avant n’a été détectée sur cet appareil.";
    if (name === "NotReadableError") return "La caméra est déjà utilisée par une autre application. Fermez-la, puis réessayez.";
    return "La caméra n’a pas pu démarrer. Utilisez l’appareil photo ci-dessous ou réessayez.";
  };

  const startLiveness = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setLiveness("checking");
    setError(undefined);
    try {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task" },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.7,
        minFacePresenceConfidence: 0.7,
      });
      landmarkerRef.current = landmarker;
      const yawSamples: number[] = [];
      const startedAt = performance.now();
      while (performance.now() - startedAt < 4_500 && streamRef.current && video.readyState >= 2) {
        const result = landmarker.detectForVideo(video, performance.now());
        const face = result.faceLandmarks[0];
        if (face) {
          const xs = face.map(point => point.x);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const nose = face[1];
          if (nose && maxX > minX) yawSamples.push((nose.x - minX) / (maxX - minX));
        }
        if (hasActiveLivenessSignal(yawSamples)) {
          setLiveness("passed");
          return;
        }
        await delay(160);
      }
      setLiveness("uncertain");
      setError("Le mouvement demandé n’a pas été confirmé. Regardez légèrement à gauche puis à droite et recommencez. Une simple photo ne suffit pas pour une validation automatique.");
    } catch {
      setLiveness("uncertain");
      setError("Le contrôle de présence vivante est indisponible sur cet appareil. Le dossier pourra rester en revue humaine, mais ne sera pas approuvé automatiquement.");
    }
  };

  const startCamera = async () => {
    try {
      setError(undefined);
      setStarting(true);
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported-camera");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" }, width: { ideal: 900 }, height: { ideal: 900 } }, audio: false });
      streamRef.current = stream;
      setActive(true);
    } catch (cameraError) {
      setError(cameraErrorMessage(cameraError));
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
    if (liveness !== "passed") {
      setError("Complétez d’abord le mouvement guidé pour confirmer la présence vivante.");
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
    onCapture(dataUrl, "passed");
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
        onCapture(dataUrl, "not_checked");
        setError("Photo capturée, mais le liveness n’est pas confirmé par une séquence caméra. Le dossier restera en revue humaine.");
      } catch (cameraError) {
        setError(mediaErrorMessage(cameraError));
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
      <div className="camera-capture__head"><span><Camera size={18} /> {title}</span>{image && <span className="status-chip status-chip--verified"><Check size={14} /> Capture effectuée</span>}</div>
      <p>{hint}</p>
      {image ? <img className="camera-capture__preview" src={image} alt="Selfie de vérification pris en direct" /> : active ? <video ref={videoRef} autoPlay muted playsInline onLoadedMetadata={() => { setReady(true); void startLiveness(); }} className="camera-capture__preview" /> : <div className="camera-capture__empty"><Camera size={28} /></div>}
      {active && <p className="camera-capture__liveness">{liveness === "checking" ? "Liveness actif : regardez légèrement à gauche puis à droite…" : liveness === "passed" ? "Présence vivante détectée pour cette capture." : "Un mouvement guidé sera demandé avant la capture."}</p>}
      <div className="camera-capture__actions">
        {active ? <><button type="button" disabled={!ready || liveness !== "passed"} onClick={capture} className="button button--gold"><Camera size={16} /> {liveness === "passed" ? "Prendre le selfie" : "Contrôle de présence…"}</button><button type="button" onClick={openNativeCamera} className="button button--outline"><Smartphone size={16} /> Appareil photo</button><button type="button" onClick={stopCamera} className="button button--ghost"><X size={16} /> Annuler</button></> : <><button type="button" disabled={starting} onClick={startCamera} className="button button--outline"><RefreshCcw size={16} /> {starting ? "Ouverture…" : image ? "Reprendre" : "Ouvrir la caméra"}</button><button type="button" onClick={openNativeCamera} className="button button--ghost"><Smartphone size={16} /> Appareil photo</button></>}
      </div>
      <input ref={nativeCameraRef} hidden type="file" accept="image/*" capture="user" onChange={useNativeCamera} />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
