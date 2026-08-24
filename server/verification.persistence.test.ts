import { describe, expect, it, vi } from "vitest";
import { persistVerificationDecision } from "./db";

describe("persistance d’une décision de vérification", () => {
  it("écrit l’approbation et applique le selfie au profil vérifié", async () => {
    const updateVerification = vi.fn().mockResolvedValue(undefined);
    const updateProfile = vi.fn().mockResolvedValue(undefined);

    await persistVerificationDecision(
      { id: 14, userId: 27, selfieKey: "verifications/27/live-selfie.jpg" },
      1,
      "approved",
      "",
      { updateVerification, updateProfile },
    );

    expect(updateVerification).toHaveBeenCalledWith(expect.objectContaining({ id: 14, status: "approved", reviewerId: 1, adminNote: null }));
    expect(updateProfile).toHaveBeenCalledWith(27, { verificationStatus: "verified", profilePhotoKey: "verifications/27/live-selfie.jpg" });
  });

  it("conserve le selfie hors du profil lorsqu’un dossier est refusé", async () => {
    const updateVerification = vi.fn().mockResolvedValue(undefined);
    const updateProfile = vi.fn().mockResolvedValue(undefined);

    await persistVerificationDecision(
      { id: 15, userId: 28, selfieKey: "verifications/28/live-selfie.jpg" },
      1,
      "rejected",
      "Document illisible",
      { updateVerification, updateProfile },
    );

    expect(updateProfile).toHaveBeenCalledWith(28, { verificationStatus: "rejected" });
  });
});
