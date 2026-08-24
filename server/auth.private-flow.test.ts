import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    getUserByOpenId: vi.fn(), upsertUser: vi.fn(), getProfile: vi.fn(), getLatestVerification: vi.fn(), getConversations: vi.fn(), listNotifications: vi.fn(),
  },
}));

vi.mock("./db", () => dbMock);
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));

import { sdk } from "./_core/sdk";
import { marketplaceRouter } from "./routers/marketplace";

const member = { id: 42, openId: "phone:+221770000000", name: "Awa Ndiaye", email: null, loginMethod: "phone", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

describe("parcours privé après connexion téléphone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.getUserByOpenId.mockResolvedValue(member);
    dbMock.getProfile.mockResolvedValue({ userId: 42, verificationStatus: "pending" });
    dbMock.getLatestVerification.mockResolvedValue({ userId: 42, status: "pending" });
    dbMock.getConversations.mockResolvedValue([]);
    dbMock.listNotifications.mockResolvedValue([]);
  });

  it("réutilise la session interne pour les zones privées sans portail externe", async () => {
    const token = await sdk.createSessionToken(member.openId, { name: member.name! });
    const authenticated = await sdk.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${token}` } } as never);
    const caller = marketplaceRouter.createCaller({ user: authenticated, req: {} as never, res: {} as never });
    await expect(caller.profile.mine()).resolves.toMatchObject({ userId: 42 });
    await expect(caller.verification.mine()).resolves.toMatchObject({ status: "pending" });
    await expect(caller.conversations.list()).resolves.toEqual([]);
    await expect(caller.notifications.list()).resolves.toEqual([]);
  });
});
