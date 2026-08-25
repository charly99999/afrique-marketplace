import { describe, expect, it } from "vitest";
import { resolveBackendMode } from "./backendMode";

describe("mode de backend portable", () => {
  it("reste sur le backend actuel par défaut", () => {
    expect(resolveBackendMode()).toBe("legacy");
    expect(resolveBackendMode("autre")).toBe("legacy");
  });

  it("active explicitement la couche Supabase", () => {
    expect(resolveBackendMode("supabase")).toBe("supabase");
    expect(resolveBackendMode(" SUPABASE ")).toBe("supabase");
  });
});
