import { scryptSync } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";

const { dbMock, sdkMock } = vi.hoisted(() => ({
  dbMock: { getAuthUserByPhone: vi.fn(), createPhoneUser: vi.fn() },
  sdkMock: { createSessionToken: vi.fn() },
}));

vi.mock("./db", () => dbMock);
vi.mock("./_core/sdk", () => ({ sdk: sdkMock }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));

import { appRouter } from "./routers";

const user = { id: 31, openId: "phone:+221770000000", name: "Awa Ndiaye", email: null, loginMethod: "phone", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

function caller() {
  const cookie = vi.fn();
  return {
    caller: appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as never, res: { cookie, clearCookie: vi.fn() } as never }),
    cookie,
  };
}

describe("authentification interne par téléphone", () => {
  beforeEach(() => { vi.clearAllMocks(); sdkMock.createSessionToken.mockResolvedValue("session-interne"); });

  it("crée un compte sans e-mail et installe une session locale", async () => {
    dbMock.getAuthUserByPhone.mockResolvedValue(undefined);
    dbMock.createPhoneUser.mockResolvedValue(user);
    const { caller: api, cookie } = caller();
    await expect(api.auth.register({ firstName: "Awa", lastName: "Ndiaye", phone: "+221 77 000 00 00", city: "Dakar", password: "motdepasse-securise" })).resolves.toMatchObject({ id: 31, name: "Awa Ndiaye" });
    expect(dbMock.createPhoneUser).toHaveBeenCalledWith(expect.objectContaining({ phone: "+221770000000", firstName: "Awa" }));
    expect(cookie).toHaveBeenCalledWith(COOKIE_NAME, "session-interne", expect.objectContaining({ httpOnly: true }));
  });

  it("ouvre la session lorsque le téléphone et le mot de passe sont corrects", async () => {
    const salt = "test-salt";
    const hash = scryptSync("motdepasse-securise", salt, 64).toString("hex");
    dbMock.getAuthUserByPhone.mockResolvedValue({ ...user, passwordHash: `${salt}:${hash}` });
    const { caller: api, cookie } = caller();
    await expect(api.auth.login({ phone: "+221770000000", password: "motdepasse-securise" })).resolves.toMatchObject({ id: 31 });
    expect(cookie).toHaveBeenCalledWith(COOKIE_NAME, "session-interne", expect.objectContaining({ httpOnly: true }));
  });

  it("connecte un profil historique déjà enregistré avec son mot de passe chiffré", async () => {
    const salt = "historique-salt";
    const hash = scryptSync("ancien-mot-de-passe", salt, 64).toString("hex");
    dbMock.getAuthUserByPhone.mockResolvedValue({ ...user, id: 8, openId: "legacy-profile-8", passwordHash: `${salt}:${hash}` });
    const { caller: api } = caller();
    await expect(api.auth.login({ phone: "+221 77 000 00 00", password: "ancien-mot-de-passe" })).resolves.toMatchObject({ id: 8 });
    expect(sdkMock.createSessionToken).toHaveBeenCalledWith("legacy-profile-8", expect.any(Object));
  });
});
