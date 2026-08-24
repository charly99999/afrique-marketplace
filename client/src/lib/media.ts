export const MAX_MEDIA_DATA_URL_CHARS = 2_650_000;
export const MAX_VIDEO_BYTES = 1_800_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("La photo ne peut pas être lue."));
    image.src = source;
  });
}

export function ensureImageWithinLimit(dataUrl: string): string {
  if (dataUrl.length > MAX_MEDIA_DATA_URL_CHARS) {
    throw new Error("La photo reste trop lourde. Prenez-la de plus près ou avec une qualité plus faible.");
  }
  return dataUrl;
}

export async function compressImageDataUrl(source: string, maxDimension = 1600): Promise<string> {
  const image = await loadImage(source);
  let scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  let quality = 0.82;
  let result = source;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("La compression de la photo est indisponible.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    result = canvas.toDataURL("image/jpeg", quality);
    if (result.length <= MAX_MEDIA_DATA_URL_CHARS) return ensureImageWithinLimit(result);
    scale *= 0.72;
    quality = Math.max(0.48, quality - 0.1);
  }

  return ensureImageWithinLimit(result);
}

export async function fileToDataUrl(file: File): Promise<string> {
  if (file.type.startsWith("image/")) {
    const original = await readFileAsDataUrl(file);
    return compressImageDataUrl(original);
  }
  if (file.type.startsWith("video/") && file.size > MAX_VIDEO_BYTES) {
    throw new Error("La vidéo dépasse 1,8 Mo. Choisissez une vidéo plus courte ou plus légère.");
  }
  const result = await readFileAsDataUrl(file);
  if (result.length > MAX_MEDIA_DATA_URL_CHARS) throw new Error("Ce média est trop lourd. Réduisez sa durée ou sa qualité.");
  return result;
}

export function mediaErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Le média n’a pas pu être préparé. Réessayez avec un fichier plus léger.";
}

export function storageUrl(key?: string | null) {
  return key ? `/manus-storage/${key}` : undefined;
}
