import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { state } = vi.hoisted(() => ({ state: { profile: null as Record<string, unknown> | null } }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 11 } }) }));
vi.mock("@/components/MarketplaceShell", () => ({ MarketplaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/QueryErrorState", () => ({ QueryErrorState: ({ message }: { message: string }) => <p>{message}</p> }));
vi.mock("@/lib/media", () => ({ fileToDataUrl: vi.fn(), mediaErrorMessage: vi.fn(), storageUrl: (value: string) => value }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ marketplace: { profile: { mine: { invalidate: vi.fn() } } } }),
    marketplace: {
      profile: {
        mine: { useQuery: () => ({ data: state.profile, isLoading: false, error: null, refetch: vi.fn() }) },
        register: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
        uploadCover: { useMutation: () => ({ mutate: vi.fn(), error: null }) },
        updateDetails: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
      },
      listings: { mine: { useQuery: () => ({ data: [], isLoading: false, error: null }) } },
    },
  },
}));

import Profile from "./Profile";

describe("Personnaliser le profil", () => {
  it("conserve le texte saisi lorsque le profil se rafraîchit pendant l’édition", async () => {
    state.profile = { id: 1, userId: 11, firstName: "Awa", lastName: "Traoré", phone: "+22501020304", city: "Abidjan", bio: "Présentation initiale", businessCategory: "Commerce", businessHours: null, address: null, website: null, contactEmail: null, coverPhotoKey: null, profilePhotoKey: null, verificationStatus: "verified" };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let renderer: ReactTestRenderer;

    await act(async () => { renderer = create(<QueryClientProvider client={queryClient}><Profile /></QueryClientProvider>); });
    const editButton = renderer!.root.findAllByType("button")[0];
    expect(editButton).toBeDefined();
    await act(async () => { editButton!.props.onClick(); });
    const textarea = renderer!.root.findByType("textarea");
    await act(async () => { textarea.props.onChange({ target: { value: "Mon texte ne doit pas disparaître" } }); });

    state.profile = { ...state.profile, bio: "Valeur renvoyée par le rafraîchissement" };
    await act(async () => { renderer!.update(<QueryClientProvider client={queryClient}><Profile /></QueryClientProvider>); });

    expect(renderer!.root.findByType("textarea").props.value).toBe("Mon texte ne doit pas disparaître");
  });
});
