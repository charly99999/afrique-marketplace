import { compareDocumentFaceToSelfie, type FaceComparisonResult } from "./faceComparison";

export type LocalKycPreflight = {
  document: {
    quality: "pass" | "fail" | "unknown";
    ocrText: string;
    ocrAvailable: boolean;
    faceCount: number | null;
    faceDetected: boolean;
  };
  selfie: {
    faceCount: number | null;
    faceDetected: boolean;
    liveness: "passed" | "not_checked";
  };
  faceComparison: FaceComparisonResult;

  safeToSubmit: boolean;
  reasons: string[];
};

const FACE_LANDMARK_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

function parseDataUrl(dataUrl: string) {
  const match = /^data:([^;,]+)?(?:;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error("Preuve image invalide.");
  return { mimeType: match[1] || "image/jpeg", payload: match[2] };
}

function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de lire l’image de preuve."));
    image.src = dataUrl;
  });
}

export function localDocumentQuality(dataUrl: string) {
  try {
    const { mimeType, payload } = parseDataUrl(dataUrl);
    const bytes = Math.floor((payload.length * 3) / 4);
    if (!mimeType.startsWith("image/")) return { quality: "fail" as const, reason: "Le document doit être une image." };
    if (bytes < 10_000) return { quality: "fail" as const, reason: "La photo du document est trop petite ou vide." };
    return { quality: "pass" as const, reason: "Qualité minimale d’image détectée." };
  } catch {
    return { quality: "fail" as const, reason: "Le format du document est invalide." };
  }
}

export async function runLocalDocumentOcr(dataUrl: string) {
  const quality = localDocumentQuality(dataUrl);
  if (quality.quality === "fail") return { ...quality, text: "", available: false };
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("fra");
    const result = await worker.recognize(dataUrl);
    await worker.terminate();
    const text = result.data.text.trim();
    return { quality: text.length >= 8 ? "pass" as const : "unknown" as const, reason: text.length >= 8 ? "Texte détecté localement." : "Texte insuffisant pour conclure.", text, available: true };
  } catch {
    return { quality: "unknown" as const, reason: "OCR local momentanément indisponible.", text: "", available: false };
  }
}

async function runLocalFaceCheck(dataUrl: string) {
  try {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
    const landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: FACE_LANDMARK_MODEL },
      runningMode: "IMAGE",
      numFaces: 2,
      minFaceDetectionConfidence: 0.65,
      minFacePresenceConfidence: 0.65,
    });
    const image = await decodeImage(dataUrl);
    const result = landmarker.detect(image);
    const faceCount = result.faceLandmarks.length;
    landmarker.close();
    const landmarks = faceCount === 1 ? result.faceLandmarks[0].map(point => ({ x: point.x, y: point.y })) : [];
    return { faceCount, faceDetected: faceCount === 1, landmarks, liveness: "not_checked" as const };
  } catch {
    return { faceCount: null, faceDetected: false, landmarks: [], liveness: "not_checked" as const };
  }
}

export const runLocalSelfieFaceCheck = runLocalFaceCheck;

export async function runLocalKycPreflight(documentData: string, selfieData: string, selfieLiveness: "passed" | "not_checked" = "not_checked"): Promise<LocalKycPreflight> {
  const documentQuality = await runLocalDocumentOcr(documentData);
  const [documentFace, detectedSelfie] = await Promise.all([runLocalFaceCheck(documentData), runLocalFaceCheck(selfieData)]);
  const selfie = { ...detectedSelfie, liveness: selfieLiveness };
  const faceComparison = documentFace.faceDetected && selfie.faceDetected
    ? await compareDocumentFaceToSelfie(documentData, selfieData, documentFace.landmarks, selfie.landmarks)
    : { status: "unknown" as const, similarity: null, reason: "Deux visages détectables sont nécessaires pour la comparaison.", model: "mobilenetv2_mcp.onnx" as const };
  const reasons: string[] = [];
  if (documentQuality.quality === "fail") reasons.push(documentQuality.reason);
  if (!documentFace.faceDetected) reasons.push(documentFace.faceCount === null ? "La détection locale du visage du document est indisponible." : "Le document doit montrer un visage détectable.");
  if (!selfie.faceDetected) reasons.push(selfie.faceCount === null ? "La détection locale du selfie est indisponible." : "Le selfie doit montrer exactement un visage.");
  if (!documentQuality.available) reasons.push("La lecture OCR locale n’a pas pu être confirmée.");
  if (faceComparison.status === "fail") reasons.push(faceComparison.reason);
  if (faceComparison.status === "unknown") reasons.push(faceComparison.reason);
  if (selfie.liveness === "not_checked") reasons.push("Le liveness n’est pas confirmé par une seule image ; le dossier ne sera jamais approuvé sur ce seul résultat.");
  return {
    document: { quality: documentQuality.quality, ocrText: documentQuality.text, ocrAvailable: documentQuality.available, faceCount: documentFace.faceCount, faceDetected: documentFace.faceDetected },
    selfie,
    faceComparison,
    safeToSubmit: documentQuality.quality !== "fail" && documentFace.faceDetected && selfie.faceDetected && selfie.liveness === "passed" && faceComparison.status === "pass",
    reasons,
  };
}

export function isLocalPreflightBlocking(result: Pick<LocalKycPreflight, "safeToSubmit">) {
  return !result.safeToSubmit;
}
