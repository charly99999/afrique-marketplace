import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("@/components/MarketplaceShell", () => ({ MarketplaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/QueryErrorState", () => ({ QueryErrorState: ({ message }: { message: string }) => <p>{message}</p> }));
vi.mock("@/components/CameraCapture", () => ({ CameraCapture: () => <div>Caméra sécurisée</div> }));
vi.mock("@/lib/media", () => ({ fileToDataUrl: vi.fn(), mediaErrorMessage: (error: unknown) => String(error) }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ marketplace: { verification: { mine: { invalidate: vi.fn() } }, profile: { mine: { invalidate: vi.fn() } } } }),
    marketplace: {
      profile: { mine: { useQuery: () => ({ data: { verificationStatus: "required" }, error: null, refetch: vi.fn() }) } },
      verification: {
        mine: { useQuery: () => ({ data: null, error: null, refetch: vi.fn() }) },
        submit: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
        analyzeMine: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
    },
  },
}));

import Verification from "./Verification";

describe("Vérification d’identité", () => {
  it("préserve le formulaire protégé lorsque la couche portable est inactive", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let renderer: ReactTestRenderer;
    await act(async () => { renderer = create(<QueryClientProvider client={queryClient}><Verification /></QueryClientProvider>); });

    expect(JSON.stringify(renderer!.toJSON())).toContain("Soumettre ma vérification");
    expect(JSON.stringify(renderer!.toJSON())).toContain("Caméra sécurisée");
  });
});
