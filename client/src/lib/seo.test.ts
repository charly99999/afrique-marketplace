import { describe, expect, it } from "vitest";
import { getSeoMetadata } from "./seo";

describe("métadonnées SEO", () => {
  it("autorise l’indexation des pages publiques et de leurs routes UUID", () => {
    expect(getSeoMetadata("/annonces").robots).toBe("index,follow");
    expect(getSeoMetadata("/annonce/00000000-0000-0000-0000-000000000000").robots).toBe("index,follow");
    expect(getSeoMetadata("/vendeur/00000000-0000-0000-0000-000000000000").canonical).toContain("/vendeur/00000000-0000-0000-0000-000000000000");
  });

  it("interdit l’indexation des espaces et des routes privées", () => {
    expect(getSeoMetadata("/compte").robots).toBe("noindex,nofollow,noarchive");
    expect(getSeoMetadata("/messages?conversation=abc").robots).toBe("noindex,nofollow,noarchive");
    expect(getSeoMetadata("/administration").robots).toBe("noindex,nofollow,noarchive");
  });
});
