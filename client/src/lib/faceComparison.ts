import type { LocalKycPreflight } from "./kycLocalPreflight";

export type FaceComparisonResult = {
  status: "pass" | "fail" | "unknown";
  similarity: number | null;
  reason: string;
  model: "mobilenetv2_mcp.onnx";
};

const MODEL_URL = "/manus-storage/mobilenetv2_mcp_58f218fa.onnx";
const WASM_URL = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/";
const MATCH_THRESHOLD = 0.35;
let sessionPromise: Promise<any> | undefined;

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = import("onnxruntime-web").then(async ort => {
      ort.env.wasm.wasmPaths = WASM_URL;
      return ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] });
    });
  }
  return sessionPromise;
}

function imageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image invalide."));
    image.src = dataUrl;
  });
}

function cosine(a: Float32Array, b: Float32Array) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

async function faceCrop(dataUrl: string, landmarks: Array<{ x: number; y: number }>) {
  const image = await imageFromDataUrl(dataUrl);
  const xs = landmarks.map(point => point.x * image.naturalWidth);
  const ys = landmarks.map(point => point.y * image.naturalHeight);
  const minX = Math.max(0, Math.min(...xs));
  const maxX = Math.min(image.naturalWidth, Math.max(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxY = Math.min(image.naturalHeight, Math.max(...ys));
  const marginX = (maxX - minX) * 0.35;
  const marginY = (maxY - minY) * 0.45;
  const sx = Math.max(0, minX - marginX);
  const sy = Math.max(0, minY - marginY);
  const sw = Math.min(image.naturalWidth - sx, maxX - minX + marginX * 2);
  const sh = Math.min(image.naturalHeight - sy, maxY - minY + marginY * 2);
  const canvas = document.createElement("canvas");
  canvas.width = 112;
  canvas.height = 112;
  const context = canvas.getContext("2d");
  if (!context || sw <= 0 || sh <= 0) throw new Error("Visage non recadrable.");
  context.drawImage(image, sx, sy, sw, sh, 0, 0, 112, 112);
  return context.getImageData(0, 0, 112, 112).data;
}

function imageDataToTensor(ort: any, pixels: Uint8ClampedArray) {
  const tensorData = new Float32Array(3 * 112 * 112);
  for (let y = 0; y < 112; y += 1) {
    for (let x = 0; x < 112; x += 1) {
      const source = (y * 112 + x) * 4;
      const target = y * 112 + x;
      tensorData[target] = (pixels[source] - 127.5) / 127.5;
      tensorData[112 * 112 + target] = (pixels[source + 1] - 127.5) / 127.5;
      tensorData[2 * 112 * 112 + target] = (pixels[source + 2] - 127.5) / 127.5;
    }
  }
  return new ort.Tensor("float32", tensorData, [1, 3, 112, 112]);
}

async function embedding(dataUrl: string, landmarks: Array<{ x: number; y: number }>) {
  const ort = await import("onnxruntime-web");
  const session = await getSession();
  const pixels = await faceCrop(dataUrl, landmarks);
  const input = imageDataToTensor(ort, pixels);
  const output = await session.run({ data: input }) as Record<string, { data?: unknown }>;
  const firstOutput = Object.values(output)[0];
  const value = output.fc1?.data ?? firstOutput?.data;
  if (!(value instanceof Float32Array)) throw new Error("Sortie d’embedding ONNX invalide.");
  return value;
}

export async function compareDocumentFaceToSelfie(documentData: string, selfieData: string, documentLandmarks: Array<{ x: number; y: number }>, selfieLandmarks: Array<{ x: number; y: number }>): Promise<FaceComparisonResult> {
  try {
    const [documentEmbedding, selfieEmbedding] = await Promise.all([
      embedding(documentData, documentLandmarks),
      embedding(selfieData, selfieLandmarks),
    ]);
    const similarity = cosine(documentEmbedding, selfieEmbedding);
    return {
      status: similarity >= MATCH_THRESHOLD ? "pass" : "fail",
      similarity,
      reason: similarity >= MATCH_THRESHOLD ? "Similarité faciale au-dessus du seuil local de pré-contrôle." : "Similarité faciale sous le seuil local de pré-contrôle.",
      model: "mobilenetv2_mcp.onnx",
    };
  } catch {
    return { status: "unknown", similarity: null, reason: "Le modèle local n’a pas pu produire deux embeddings comparables.", model: "mobilenetv2_mcp.onnx" };
  }
}

export function comparisonAllowsNoAutomaticApproval(result: FaceComparisonResult, preflight: Pick<LocalKycPreflight, "safeToSubmit">) {
  return result.status === "pass" && preflight.safeToSubmit;
}
