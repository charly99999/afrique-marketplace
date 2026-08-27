import { describe, expect, it } from "vitest";
import { decideIdentityVerification, unavailableIdentityReview } from "../../../supabase/functions/verify-identity/decision";

describe("contrat de validation automatique d’identité", () => {
  it("valide automatiquement un dossier seulement lorsque tous les contrôles disponibles réussissent", () => {
    expect(decideIdentityVerification({ recommendation: "approve", confidence: 91, documentReadable: true, selfieFaceVisible: true, profileInformationConsistent: true, analysisAvailable: true })).toEqual({ verificationStatus: "approved", profileStatus: "verified", applySelfieAsProfilePhoto: true });
  });

  it("ne valide pas un dossier lorsque le document ou le selfie échoue", () => {
    expect(decideIdentityVerification({ recommendation: "reject", confidence: 92, documentReadable: false, selfieFaceVisible: true, profileInformationConsistent: false, analysisAvailable: true })).toEqual({ verificationStatus: "rejected", profileStatus: "rejected", applySelfieAsProfilePhoto: false });
  });

  it("maintient en attente une inscription incomplète ou une analyse non disponible", () => {
    expect(decideIdentityVerification({ recommendation: "approve", confidence: 90, documentReadable: true, selfieFaceVisible: true, profileInformationConsistent: false, analysisAvailable: true })).toEqual({ verificationStatus: "pending", profileStatus: "pending", applySelfieAsProfilePhoto: false });
    expect(decideIdentityVerification(unavailableIdentityReview("Fournisseur indisponible"))).toEqual({ verificationStatus: "pending", profileStatus: "pending", applySelfieAsProfilePhoto: false });
  });

  it("n’applique le selfie comme photo de profil qu’après validation automatique complète", () => {
    expect(decideIdentityVerification({ recommendation: "manual_review", confidence: 99, documentReadable: true, selfieFaceVisible: true, profileInformationConsistent: true, analysisAvailable: true }).applySelfieAsProfilePhoto).toBe(false);
    expect(decideIdentityVerification({ recommendation: "approve", confidence: 85, documentReadable: true, selfieFaceVisible: true, profileInformationConsistent: true, analysisAvailable: true }).applySelfieAsProfilePhoto).toBe(true);
  });
});
