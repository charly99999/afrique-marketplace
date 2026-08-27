import { describe, expect, it, vi } from "vitest";
import { resolveVerificationDecision } from "../shared/marketplace";

const { dbMock, analyzeVerificationWithAiMock } = vi.hoisted(() => ({
  dbMock: {
    getProfile: vi.fn(),
    createListing: vi.fn(),
    searchListings: vi.fn(),
    getListing: vi.fn(),
    getPublicProfile: vi.fn(),
    updateProfileDetails: vi.fn(),
    getListingsForUser: vi.fn(),
    getPublicSellerProfile: vi.fn(),
    getListingsForPublicSeller: vi.fn(),
    isFollowingSeller: vi.fn(),
    followSeller: vi.fn(),
    unfollowSeller: vi.fn(),
    getFollowedSellers: vi.fn(),
    notifyFollowersAboutListing: vi.fn(),
    getLatestVerification: vi.fn(),
    getVerificationDossier: vi.fn(),
    saveAiVerificationReview: vi.fn(),
    applyAutomatedVerificationDecision: vi.fn(),
    findOrCreateConversation: vi.fn(),
    getConversation: vi.fn(),
    getConversations: vi.fn(),
    getMessages: vi.fn(),
    createMessage: vi.fn(),
    createNotification: vi.fn(),
    listNotifications: vi.fn(),
    reviewVerification: vi.fn(),
    moderateListing: vi.fn(),
  },
  analyzeVerificationWithAiMock: vi.fn(),
}));

vi.mock("./db", () => dbMock);
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./verificationAi", () => ({ analyzeVerificationWithAi: analyzeVerificationWithAiMock }));

import { marketplaceRouter } from "./routers/marketplace";

function caller(role: "user" | "admin" = "user", userId = 11) {
  return marketplaceRouter.createCaller({
    user: { id: userId, role, openId: "marketplace-test", name: "Test", email: null, loginMethod: "phone", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as never,
    res: {} as never,
  });
}

describe("flux métier marketplace", () => {
  it("empêche effectivement un profil non vérifié de publier", async () => {
    dbMock.getProfile.mockResolvedValueOnce({ verificationStatus: "pending" });
    await expect(caller().listings.create({ title: "Téléphone récent à vendre", description: "Appareil en bon état, avec chargeur et boîte d’origine.", category: "telephones", city: "Dakar", price: 250000, currency: "XOF", condition: "bon_etat", mediaData: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("retourne le catalogue public des annonces publiées à tout visiteur", async () => {
    const publicListing = { id: 71, userId: 22, title: "Peugeot 301", status: "published", category: "vehicules", city: "Abidjan" };
    dbMock.searchListings.mockResolvedValueOnce([publicListing]);

    await expect(caller().listings.search({ category: "vehicules", city: "Abidjan" })).resolves.toEqual([publicListing]);
    expect(dbMock.searchListings).toHaveBeenCalledWith({ category: "vehicules", city: "Abidjan" });
  });

  it("ne rend jamais accessible le détail d’une annonce non publiée", async () => {
    dbMock.getListing.mockResolvedValueOnce({ id: 72, status: "hidden" });
    await expect(caller().listings.detail({ id: 72 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("alerte les abonnés sans bloquer la publication d’un vendeur vérifié", async () => {
    dbMock.getProfile.mockResolvedValueOnce({ verificationStatus: "verified" });
    dbMock.createListing.mockResolvedValueOnce({ id: 55 });
    dbMock.notifyFollowersAboutListing.mockResolvedValueOnce(2);

    await expect(caller().listings.create({ title: "Téléphone récent à vendre", description: "Appareil en bon état, avec chargeur et boîte d’origine.", category: "telephones", city: "Dakar", price: 250000, currency: "XOF", condition: "bon_etat", mediaData: [] })).resolves.toEqual({ id: 55 });
    expect(dbMock.notifyFollowersAboutListing).toHaveBeenCalledWith(11, { id: 55, title: "Téléphone récent à vendre" });
  });

  it("enregistre les informations professionnelles facultatives du membre connecté", async () => {
    const details = { bio: "Conseiller en immobilier et créateur de solutions locales.", businessCategory: "Immobilier", businessHours: "Lun–Sam · 08h–18h", address: "Cocody, Abidjan", website: "https://afrique-exemple.com", contactEmail: "contact@afrique-exemple.com" };
    dbMock.getProfile.mockResolvedValueOnce({ userId: 11 });
    dbMock.updateProfileDetails.mockResolvedValueOnce({ userId: 11, ...details });

    await expect(caller().profile.updateDetails(details)).resolves.toMatchObject({ userId: 11, businessCategory: "Immobilier" });
    expect(dbMock.updateProfileDetails).toHaveBeenCalledWith(11, details);
  });

  it("récupère les annonces du membre connecté pour sa fiche profil", async () => {
    dbMock.getListingsForUser.mockResolvedValueOnce([{ id: 31, userId: 11, title: "Appartement à louer", status: "published" }]);

    await expect(caller().listings.mine()).resolves.toEqual([{ id: 31, userId: 11, title: "Appartement à louer", status: "published" }]);
    expect(dbMock.getListingsForUser).toHaveBeenCalledWith(11);
  });

  it("expose un vendeur vérifié et ses annonces publiées via une route partageable", async () => {
    dbMock.getPublicSellerProfile.mockResolvedValueOnce({ userId: 22, firstName: "Awa", lastName: "Traoré", phone: "+22501020304", city: "Abidjan", verificationStatus: "verified" });
    dbMock.getListingsForPublicSeller.mockResolvedValueOnce([{ id: 41, userId: 22, title: "Terrain à vendre", status: "published" }]);

    const publicSeller = await caller().sellers.detail({ userId: 22 });
    expect(publicSeller).toMatchObject({ seller: { firstName: "Awa", phone: "+22501020304", verificationStatus: "verified" }, listings: [{ id: 41, userId: 22 }] });
    expect(publicSeller.seller).not.toHaveProperty("passwordHash");
    expect(dbMock.getListingsForPublicSeller).toHaveBeenCalledWith(22);
  });

  it("ne rend pas public un profil vendeur non vérifié", async () => {
    dbMock.getPublicSellerProfile.mockResolvedValueOnce(undefined);
    await expect(caller().sellers.detail({ userId: 23 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("interdit de suivre son propre profil et un vendeur non vérifié", async () => {
    await expect(caller().follows.follow({ sellerId: 11 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    dbMock.getPublicSellerProfile.mockResolvedValueOnce(undefined);
    await expect(caller().follows.follow({ sellerId: 23 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("permet de suivre un vendeur vérifié puis de retrouver sa sélection", async () => {
    dbMock.getPublicSellerProfile.mockResolvedValueOnce({ userId: 22, verificationStatus: "verified" });
    dbMock.followSeller.mockResolvedValueOnce({ following: true });
    dbMock.getFollowedSellers.mockResolvedValueOnce([{ userId: 22, firstName: "Awa", lastName: "Traoré", verificationStatus: "verified" }]);

    await expect(caller().follows.follow({ sellerId: 22 })).resolves.toEqual({ following: true });
    expect(dbMock.followSeller).toHaveBeenCalledWith(11, 22);
    await expect(caller().follows.mine()).resolves.toMatchObject([{ userId: 22, firstName: "Awa", verificationStatus: "verified" }]);
  });

  it("crée un message et une alerte pour le destinataire", async () => {
    dbMock.findOrCreateConversation.mockResolvedValueOnce({ id: 44 });
    await caller().conversations.send({ recipientId: 22, listingId: 7, body: "Bonjour, est-ce encore disponible ?" });
    expect(dbMock.createMessage).toHaveBeenCalledWith({ conversationId: 44, senderId: 11, body: "Bonjour, est-ce encore disponible ?" });
    expect(dbMock.createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 22, type: "message", title: "Nouveau message" }));
  });

  it("permet à un membre de répondre dans sa conversation et notifie l’autre participant", async () => {
    dbMock.getConversation.mockResolvedValueOnce({ id: 44, buyerId: 11, sellerId: 22 });

    await expect(caller().conversations.reply({ conversationId: 44, body: "Merci pour votre réponse." })).resolves.toEqual({ success: true });
    expect(dbMock.createMessage).toHaveBeenCalledWith({ conversationId: 44, senderId: 11, body: "Merci pour votre réponse." });
    expect(dbMock.createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 22, type: "message", title: "Nouveau message" }));
  });

  it("interdit à un tiers de lire ou répondre à une conversation qui ne lui appartient pas", async () => {
    dbMock.getConversation.mockResolvedValue({ id: 45, buyerId: 22, sellerId: 33 });

    await expect(caller("user", 11).conversations.messages({ conversationId: 45 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller("user", 11).conversations.reply({ conversationId: 45, body: "Intrusion" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("retourne à un abonné l’alerte persistée de nouvelle annonce dans sa liste d’alertes", async () => {
    const alert = { id: 77, userId: 11, type: "system", title: "Nouvelle annonce d’un vendeur suivi", body: "Une nouvelle annonce est disponible : Toyota Yaris hybride", linkPath: "/annonce/85", readAt: null, createdAt: new Date() };
    dbMock.listNotifications.mockResolvedValueOnce([alert]);

    await expect(caller().notifications.list()).resolves.toEqual([alert]);
    expect(dbMock.listNotifications).toHaveBeenCalledWith(11);
  });

  it("réserve les actions de modération à un administrateur", async () => {
    await expect(caller().listings.moderate({ listingId: 5, status: "hidden" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await caller("admin").listings.moderate({ listingId: 5, status: "hidden" });
    expect(dbMock.moderateListing).toHaveBeenCalledWith(5, "hidden");
  });

  it("notifie la décision de vérification après revue administrative", async () => {
    dbMock.reviewVerification.mockResolvedValueOnce({ userId: 22, selfieKey: "verifications/22/selfie.jpg" });
    await caller("admin").admin.reviewVerification({ verificationId: 8, decision: "approved", note: "", confirmedConsistent: true });
    expect(dbMock.reviewVerification).toHaveBeenCalledWith(8, 11, "approved", "");
    expect(dbMock.createNotification).toHaveBeenCalledWith({ userId: 22, type: "verification", title: "Profil vérifié", body: "Votre badge vérifié est désormais actif." });
  });

  it("interdit une validation sans confirmation de cohérence du dossier", async () => {
    await expect(caller("admin").admin.reviewVerification({ verificationId: 8, decision: "approved", note: "", confirmedConsistent: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("exige un motif exploitable lorsqu’un dossier est refusé", async () => {
    await expect(caller("admin").admin.reviewVerification({ verificationId: 8, decision: "rejected", note: "flou", confirmedConsistent: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("conserve le statut en attente tant qu’aucune décision n’est enregistrée", async () => {
    dbMock.getLatestVerification.mockResolvedValueOnce({ id: 8, documentType: "cni", status: "pending", adminNote: null, createdAt: new Date() });
    await expect(caller().verification.mine()).resolves.toMatchObject({ id: 8, status: "pending" });
  });

  it("transmet le motif de refus au membre pour sa nouvelle soumission", async () => {
    dbMock.getLatestVerification.mockResolvedValueOnce({ id: 8, documentType: "cni", status: "rejected", adminNote: "Le document est illisible, veuillez reprendre une photo nette.", createdAt: new Date() });
    await expect(caller().verification.mine()).resolves.toMatchObject({ status: "rejected", adminNote: "Le document est illisible, veuillez reprendre une photo nette." });
  });

  it("propage une approbation administrative au profil persistant avec le selfie validé", async () => {
    const persistedProfile = { userId: 22, verificationStatus: "pending", profilePhotoKey: null as string | null };
    dbMock.reviewVerification.mockImplementationOnce(async () => {
      Object.assign(persistedProfile, resolveVerificationDecision("approved", "verifications/22/live-selfie.jpg", "").profile);
      return { userId: 22, selfieKey: "verifications/22/live-selfie.jpg" };
    });
    dbMock.getProfile.mockResolvedValueOnce(persistedProfile);
    await caller("admin").admin.reviewVerification({ verificationId: 8, decision: "approved", note: "", confirmedConsistent: true });
    expect(await dbMock.getProfile(22)).toEqual({ userId: 22, verificationStatus: "verified", profilePhotoKey: "verifications/22/live-selfie.jpg" });
  });

  it("conserve le dossier en attente sans preuve serveur indépendante", async () => {
    dbMock.getLatestVerification.mockResolvedValueOnce({ id: 18, status: "pending" });
    dbMock.getVerificationDossier.mockResolvedValueOnce({ id: 18, userId: 11, documentType: "cni", documentKey: "verifications/11/document.jpg", selfieKey: "verifications/11/selfie.jpg", firstName: "Amadou", lastName: "Diallo", city: "Dakar" });

    await expect(caller().verification.analyzeMine()).resolves.toMatchObject({ id: 18, status: "pending", aiStatus: "manual_review" });
    expect(dbMock.saveAiVerificationReview).toHaveBeenCalledWith(18, expect.objectContaining({ recommendation: "manual_review", confidence: 0 }));
    expect(dbMock.applyAutomatedVerificationDecision).not.toHaveBeenCalled();
  });
});
