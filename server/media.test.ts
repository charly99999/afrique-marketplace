import { createCanvas, Image as CanvasImage } from "@napi-rs/canvas";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compressImageDataUrl, ensureImageWithinLimit, fileToDataUrl, MAX_MEDIA_DATA_URL_CHARS, MAX_VIDEO_BYTES, mediaErrorMessage } from "../client/src/lib/media";

const savedImage = globalThis.Image;
const savedDocument = globalThis.document;

beforeEach(() => {
  Object.defineProperty(globalThis, "Image", { configurable: true, value: CanvasImage });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => createCanvas(1, 1) } });
});

afterEach(() => {
  Object.defineProperty(globalThis, "Image", { configurable: true, value: savedImage });
  Object.defineProperty(globalThis, "document", { configurable: true, value: savedDocument });
});

describe("préparation des médias", () => {
  it("rejette une vidéo trop lourde avant son envoi", async () => {
    const largeVideo = { type: "video/mp4", size: MAX_VIDEO_BYTES + 1 } as File;
    await expect(fileToDataUrl(largeVideo)).rejects.toThrow("La vidéo dépasse 1,8 Mo");
  });

  it("présente un message lisible lorsque la préparation d’un média échoue", () => {
    expect(mediaErrorMessage(new Error("La photo reste trop lourde."))).toBe("La photo reste trop lourde.");
    expect(mediaErrorMessage(null)).toBe("Le média n’a pas pu être préparé. Réessayez avec un fichier plus léger.");
  });

  it("accepte l’image résultant d’une compression sous la limite", () => {
    const compressedImage = "data:image/jpeg;base64," + "a".repeat(2_000);
    expect(ensureImageWithinLimit(compressedImage)).toBe(compressedImage);
  });

  it("rejette clairement une image qui reste trop lourde après compression", () => {
    const oversizedImage = "data:image/jpeg;base64," + "a".repeat(MAX_MEDIA_DATA_URL_CHARS);
    expect(() => ensureImageWithinLimit(oversizedImage)).toThrow("La photo reste trop lourde");
  });

  it("réduit réellement une image source volumineuse avant son envoi", async () => {
    const sourceCanvas = createCanvas(2400, 1800);
    const context = sourceCanvas.getContext("2d");
    const pixels = context.createImageData(2400, 1800);
    let seed = 9_973;
    for (let index = 0; index < pixels.data.length; index += 4) {
      seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
      pixels.data[index] = seed & 255;
      pixels.data[index + 1] = (seed >>> 8) & 255;
      pixels.data[index + 2] = (seed >>> 16) & 255;
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const source = sourceCanvas.toDataURL("image/png");
    const compressed = await compressImageDataUrl(source);
    expect(compressed.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(source.length).toBeGreaterThan(MAX_MEDIA_DATA_URL_CHARS);
    expect(compressed.length).toBeLessThan(source.length);
    expect(compressed.length).toBeLessThanOrEqual(MAX_MEDIA_DATA_URL_CHARS);
  });
});
