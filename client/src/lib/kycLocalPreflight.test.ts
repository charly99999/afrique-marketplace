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

  it("considère tout résultat local incomplet comme non approuvable", () => {
    const uncertain: Pick<LocalKycPreflight, "safeToSubmit"> = { safeToSubmit: false };
    expect(isLocalPreflightBlocking(uncertain)).toBe(true);
  });
});
