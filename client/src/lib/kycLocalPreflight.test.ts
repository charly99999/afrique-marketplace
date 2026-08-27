import { describe, expect, it } from "vitest";
import { isLocalPreflightBlocking, localDocumentQuality, type LocalKycPreflight } from "./kycLocalPreflight";

describe("pré-contrôles KYC locaux", () => {
  it("refuse un document qui n’est pas une image", () => {
    expect(localDocumentQuality("data:application/pdf;base64,AAAA").quality).toBe("fail");
  });

  it("refuse une image vide ou trop petite", () => {
    expect(localDocumentQuality("data:image/jpeg;base64,AAAA").quality).toBe("fail");
  });

  it("ne bloque pas une image suffisamment grande avant les contrôles complémentaires", () => {
    const data = `data:image/jpeg;base64,${"A".repeat(16_000)}`;
    expect(localDocumentQuality(data).quality).toBe("pass");
  });

  it("bloque uniquement un document manifestement invalide", () => {
    const invalid: Pick<LocalKycPreflight, "document"> = { document: { quality: "fail", ocrText: "", ocrAvailable: false, faceCount: null, faceDetected: false } };
    expect(isLocalPreflightBlocking(invalid)).toBe(true);
  });

  it("laisse les contrôles incomplets partir en revue humaine", () => {
    const incomplete: Pick<LocalKycPreflight, "document"> = { document: { quality: "unknown", ocrText: "", ocrAvailable: false, faceCount: null, faceDetected: false } };
    expect(isLocalPreflightBlocking(incomplete)).toBe(false);
  });
});
