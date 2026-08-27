import { describe, expect, it } from "vitest";

describe("configuration publique Supabase", () => {
  it("répond sur l’endpoint léger Auth avec la clé publishable", async () => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    expect(url).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
    expect(key).toMatch(/^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+)$/);

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
    });
    expect(response.ok).toBe(true);
  }, 15_000);
});
