import { describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    getProfile: vi.fn(),
    getLatestVerification: vi.fn(),
    findOrCreateConversation: vi.fn(),
  createMessage: vi.fn(),
  createNotification: vi.fn(),
  reviewVerification: vi.fn(),
  moderateListing: vi.fn(),
  },
}));

vi.mock("./db", () => dbMock);
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));

import { marketplaceRouter } from "./routers/marketplace";

function caller(role: "user" | "admin" = "user") {
  return marketplaceRouter.createCaller({
    user: { id: 11, role, openId: "marketplace-test", name: "Test", email: null, loginMethod: "phone", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as never,
    res: {} as never,
  });
}

describe("flux métier marketplace", () => {
  it("empêche effectivement un profil non vérifié de publier", async () => {
    dbMock.getProfile.mockResolvedValueOnce({ verificationStatus: "pending" });
    await expect(caller().listings.create({ title: "Téléphone récent à vendre", description: "Appareil en bon état, avec chargeur et boîte d’origine.", category: "telephones", city: "Dakar", price: 250000, currency: "XOF", condition: "bon_etat", mediaData: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("crée un message et une alerte pour le destinataire", async () => {
    dbMock.findOrCreateConversation.mockResolvedValueOnce({ id: 44 });
    await caller().conversations.send({ recipientId: 22, listingId: 7, body: "Bonjour, est-ce encore disponible ?" });
    expect(dbMock.createMessage).toHaveBeenCalledWith({ conversationId: 44, senderId: 11, body: "Bonjour, est-ce encore disponible ?" });
    expect(dbMock.createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 22, type: "message", title: "Nouveau message" }));
  });

  it("réserve les actions de modération à un administrateur", async () => {
    await expect(caller().listings.moderate({ listingId: 5, status: "hidden" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await caller("admin").listings.moderate({ listingId: 5, status: "hidden" });
    expect(dbMock.moderateListing).toHaveBeenCalledWith(5, "hidden");
  });

  it("notifie la décision de vérification après revue administrative", async () => {
    dbMock.reviewVerification.mockResolvedValueOnce({ userId: 22 });
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
});
