import { describe, expect, it } from "vitest";
import { profileDetailsFromData, synchronizeProfileDetails } from "./profileDetails";

describe("synchronisation des détails du profil", () => {
  it("préserve une saisie locale lorsque le profil est actualisé pendant l’édition", () => {
    const draft = profileDetailsFromData({ bio: "Texte en cours de rédaction", businessCategory: "Immobilier" });
    const refreshedProfile = profileDetailsFromData({ bio: "Ancienne présentation", businessCategory: "Commerce" });

    expect(synchronizeProfileDetails(draft, refreshedProfile, true)).toEqual(draft);
  });

  it("actualise les détails lorsque le formulaire n’est pas en cours d’édition", () => {
    const current = profileDetailsFromData({ bio: "Ancienne présentation" });
    const refreshedProfile = profileDetailsFromData({ bio: "Présentation enregistrée", address: "Abidjan" });

    expect(synchronizeProfileDetails(current, refreshedProfile, false)).toEqual(refreshedProfile);
  });
});
