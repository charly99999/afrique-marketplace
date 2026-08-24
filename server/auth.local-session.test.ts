import { describe, expect, it } from "vitest";
import { sdk } from "./_core/sdk";

describe("session interne par téléphone", () => {
  it("signe puis vérifie une session locale réutilisable par les parcours privés", async () => {
    const token = await sdk.createSessionToken("phone:+221770000000", { name: "Awa Ndiaye" });
    const session = await sdk.verifySession(token);
    expect(session).toMatchObject({ openId: "phone:+221770000000", name: "Awa Ndiaye" });
  });
});
