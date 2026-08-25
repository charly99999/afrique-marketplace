import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/lib/backendMode", () => ({ isSupabaseMode: false }));

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("@/components/MarketplaceShell", () => ({ MarketplaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/lib/media", () => ({ fileToDataUrl: vi.fn(), mediaErrorMessage: (error: unknown) => String(error) }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    marketplace: {
      profile: { mine: { useQuery: () => ({ data: { verificationStatus: "verified" } }) } },
      listings: { create: { useMutation: () => ({ mutate: createMock, isPending: false, isSuccess: false, error: null }) } },
    },
  },
}));

import Sell from "./Sell";

describe("Publier une annonce", () => {
  it("conserve le formulaire de publication fonctionnel avec la branche legacy", async () => {
    createMock.mockReset();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let renderer: ReactTestRenderer;

    await act(async () => { renderer = create(<QueryClientProvider client={queryClient}><Sell /></QueryClientProvider>); });
    const form = renderer!.root.findByType("form");
    const inputs = renderer!.root.findAllByType("input");
    const textarea = renderer!.root.findByType("textarea");

    await act(async () => {
      inputs[0].props.onChange({ target: { value: "Appartement lumineux à louer" } });
      textarea.props.onChange({ target: { value: "Appartement lumineux, proche des transports et disponible immédiatement." } });
      inputs[1].props.onChange({ target: { value: "Dakar" } });
      inputs[2].props.onChange({ target: { value: "350000" } });
    });
    await act(async () => { form.props.onSubmit({ preventDefault: vi.fn() }); });

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Appartement lumineux à louer", city: "Dakar", price: 350000, mediaData: [] }));
  });
});
