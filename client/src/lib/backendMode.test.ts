import { describe, expect, it } from "vitest";
import { resolveBackendMode } from "./backendMode";

describe("mode de backend portable", () => {
  it("reste sur Supabase par défaut pour éviter un repli silencieux vers une ancienne base", () => {
    expect(resolveBackendMode()).toBe("supabase");
    expect(resolveBackendMode("autre")).toBe("supabase");
  });

  it("ne conserve la couche legacy que lorsqu’elle est explicitement demandée", () => {
    expect(resolveBackendMode("supabase")).toBe("supabase");
    expect(resolveBackendMode(" SUPABASE ")).toBe("supabase");
    expect(resolveBackendMode("legacy")).toBe("legacy");
  });
});
