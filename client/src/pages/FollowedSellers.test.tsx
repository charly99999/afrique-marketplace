import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("@/components/MarketplaceShell", () => ({ MarketplaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/QueryErrorState", () => ({ QueryErrorState: ({ message }: { message: string }) => <p>{message}</p> }));
vi.mock("@/lib/media", () => ({ storageUrl: (value: string) => value }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/lib/trpc", () => ({ trpc: { marketplace: { follows: { mine: { useQuery: () => ({ data: [{ userId: 12, firstName: "Awa", lastName: "Traoré", city: "Abidjan", businessCategory: "Immobilier", profilePhotoKey: null }], isLoading: false, error: null }) } } } } }));

import FollowedSellers from "./FollowedSellers";

describe("Vendeurs suivis", () => {
  it("préserve l’affichage des vendeurs vérifiés lorsque la couche portable est inactive", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let renderer: ReactTestRenderer;
    await act(async () => { renderer = create(<QueryClientProvider client={queryClient}><FollowedSellers /></QueryClientProvider>); });
    const output = renderer!.toJSON();

    expect(JSON.stringify(output)).toContain("Awa");
    expect(JSON.stringify(output)).toContain("Profil vérifié");
  });
});
