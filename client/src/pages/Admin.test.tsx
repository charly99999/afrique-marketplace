import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/lib/backendMode", () => ({ isSupabaseMode: false }));

vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/QueryErrorState", () => ({ QueryErrorState: ({ message }: { message: string }) => <p>{message}</p> }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "admin" } }) }));
vi.mock("@/lib/media", () => ({ storageUrl: (value: string) => value }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ marketplace: { admin: { overview: { invalidate: vi.fn() }, pendingVerifications: { invalidate: vi.fn() }, listings: { invalidate: vi.fn() } }, profile: { mine: { invalidate: vi.fn() } }, verification: { mine: { invalidate: vi.fn() } }, listings: { detail: { invalidate: vi.fn() } } } }),
    marketplace: {
      admin: {
        overview: { useQuery: () => ({ data: { users: 5, pendingVerifications: 1, listings: 9, flaggedContent: 0 }, error: null, refetch: vi.fn() }) },
        pendingVerifications: { useQuery: () => ({ data: [{ id: 91, firstName: "Awa", lastName: "Traoré", city: "Abidjan", phone: "+22501020304", documentType: "cni", documentKey: "document", selfieKey: "selfie", createdAt: new Date() }], error: null, refetch: vi.fn() }) },
        listings: { useQuery: () => ({ data: [], error: null, refetch: vi.fn() }) },
        reviewVerification: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
      },
      listings: { moderate: { useMutation: () => ({ mutate: vi.fn() }) } },
    },
  },
}));

import Admin from "./Admin";

describe("Administration", () => {
  it("préserve la revue de dossier et les indicateurs lorsque la couche portable est inactive", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let renderer: ReactTestRenderer;
    await act(async () => { renderer = create(<QueryClientProvider client={queryClient}><Admin /></QueryClientProvider>); });

    expect(JSON.stringify(renderer!.toJSON())).toContain("Supervision Afrique Marketplace");
    expect(JSON.stringify(renderer!.toJSON())).toContain("Awa");
    expect(JSON.stringify(renderer!.toJSON())).toContain("Valider");
  });
});
