import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { getSession, onAuthStateChange, legacyUseQuery } = vi.hoisted(() => ({
  getSession: vi.fn(async () => ({ data: { session: { user: { id: "member-1", phone: "+22501020304", email: null, user_metadata: { first_name: "Awa", last_name: "Traoré" } } } }, error: null })),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  legacyUseQuery: vi.fn(() => { throw new Error("Le mode Supabase ne doit pas appeler tRPC."); }),
}));

vi.mock("@/lib/backendMode", () => ({ isSupabaseMode: true }));
vi.mock("@/lib/supabaseClient", () => ({ requireSupabaseClient: () => ({ auth: { getSession, onAuthStateChange, signOut: vi.fn() } }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: vi.fn(), auth: { me: { useQuery: legacyUseQuery }, logout: { useMutation: vi.fn() } } } }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));

import { useAuth } from "./useAuth";

function AuthProbe() {
  const { loading, user, isAuthenticated } = useAuth();
  return <output>{JSON.stringify({ loading, name: user?.name ?? null, isAuthenticated })}</output>;
}

describe("useAuth en mode Supabase", () => {
  it("lit la session Supabase sans requête d’authentification tRPC", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => { renderer = create(<AuthProbe />); });
    await act(async () => { await Promise.resolve(); });

    expect(getSession).toHaveBeenCalledOnce();
    expect(onAuthStateChange).toHaveBeenCalledOnce();
    expect(legacyUseQuery).not.toHaveBeenCalled();
    expect(renderer!.root.findByType("output").children.join("")).toContain('"name":"Awa Traoré"');
    expect(renderer!.root.findByType("output").children.join("")).toContain('"isAuthenticated":true');
  });
});
