import { describe, expect, it } from "vitest";
import { canPublishWithVerification, directCallHref, isKnownCategory, listingCreateSchema, moderationStatuses, normalizePhone, profileUpdateForVerification, registrationSchema, resolveVerificationDecision, verificationNotification, visibleSellerPhone } from "../shared/marketplace";

describe("règles de marketplace", () => {
  it("accepte une inscription avec téléphone et mot de passe sans adresse e-mail", () => {
    const result = registrationSchema.safeParse({ firstName: "Awa", lastName: "Diop", phone: "+221 77 000 00 00", city: "Dakar", password: "UnePhraseSecrete9" });
    expect(result.success).toBe(true);
  });

  it("refuse une annonce trop succincte ou hors catégorie", () => {
    const result = listingCreateSchema.safeParse({ title: "TV", description: "Court", category: "inconnu", city: "Abidjan", price: 0, currency: "XOF", condition: "neuf", mediaData: [] });
    expect(result.success).toBe(false);
  });

  it("reconnaît les catégories officielles de la plateforme", () => {
    expect(isKnownCategory("immobilier")).toBe(true);
    expect(isKnownCategory("inconnu")).toBe(false);
  });

  it("bloque la publication tant que le profil n’est pas vérifié", () => {
    expect(canPublishWithVerification("pending")).toBe(false);
    expect(canPublishWithVerification("required")).toBe(false);
    expect(canPublishWithVerification("verified")).toBe(true);
  });

  it("n’emploie le selfie comme photo de profil qu’après approbation", () => {
    expect(profileUpdateForVerification("rejected", "selfies/123.jpg")).toEqual({ verificationStatus: "rejected" });
    expect(profileUpdateForVerification("approved", "selfies/123.jpg")).toEqual({ verificationStatus: "verified", profilePhotoKey: "selfies/123.jpg" });
  });

  it("produit une alerte de vérification compréhensible pour chaque décision", () => {
    expect(verificationNotification("approved", "")).toMatchObject({ title: "Profil vérifié" });
    expect(verificationNotification("rejected", "Document flou")).toEqual({ title: "Vérification à compléter", body: "Document flou" });
  });

  it("n’autorise que les états explicites de modération", () => {
    expect(moderationStatuses).toEqual(["published", "hidden", "removed"]);
    expect(moderationStatuses).not.toContain("archived");
  });

  it("applique complètement une approbation : profil vérifié, selfie et alerte", () => {
    expect(resolveVerificationDecision("approved", "selfies/live-42.jpg", "")).toEqual({
      profile: { verificationStatus: "verified", profilePhotoKey: "selfies/live-42.jpg" },
      notification: { title: "Profil vérifié", body: "Votre badge vérifié est désormais actif." },
    });
  });

  it("n’expose le numéro direct que pour un vendeur vérifié", () => {
    expect(visibleSellerPhone("verified", "+221 77 000 00 00")).toBe("+221 77 000 00 00");
    expect(visibleSellerPhone("pending", "+221 77 000 00 00")).toBeNull();
  });

  it("construit un lien tel: sûr à partir du numéro affiché", () => {
    expect(directCallHref("+221 77 000 00 00")).toBe("tel:+221770000000");
  });

  it("normalise le numéro de téléphone avant de l’utiliser comme identifiant", () => {
    expect(normalizePhone("+221 (77) 000-00-00")).toBe("+221770000000");
  });
});
