import React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const retryPortableVerification = vi.fn();
const getMyPortableProfile = vi.fn();
const getMyPortableVerification = vi.fn();

vi.mock("@/lib/backendMode", () => ({ isSupabaseMode: true }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("@/components/MarketplaceShell", () => ({ MarketplaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/QueryErrorState", () => ({ QueryErrorState: ({ message }: { message: string }) => <p>{message}</p> }));
vi.mock("@/components/CameraCapture", () => ({ CameraCapture: () => <div>Caméra sécurisée</div> }));
vi.mock("@/lib/media", () => ({ fileToDataUrl: vi.fn(), mediaErrorMessage: (error: unknown) => String(error) }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/lib/marketplaceSupabase", () => ({
  getMyPortableProfile: (...args: unknown[]) => getMyPortableProfile(...args),
  getMyPortableVerification: (...args: unknown[]) => getMyPortableVerification(...args),
  retryPortableVerification: (...args: unknown[]) => retryPortableVerification(...args),
  submitPortableVerification: vi.fn(),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ marketplace: { verification: { mine: { invalidate: vi.fn() } }, profile: { mine: { invalidate: vi.fn() } } } }),
    marketplace: {
      profile: { mine: { useQuery: () => ({ data: null, error: null, refetch: vi.fn() }) } },
      verification: {
        mine: { useQuery: () => ({ data: null, error: null, refetch: vi.fn() }) },
        submit: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
        analyzeMine: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
    },
  },
}));

import Verification from "./Verification";

async function renderVerification(verification: { id: string; status: "pending"; adminNote: null; aiReviewedAt: string | null; retryAllowed: boolean; analysisAvailable: boolean | null }): Promise<ReactTestRenderer> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(["portable-my-profile"], { id: "member-uuid", verificationStatus: "pending" });
  queryClient.setQueryData(["portable-my-verification"], verification);
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<QueryClientProvider client={queryClient}><Verification /></QueryClientProvider>);
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  return renderer;
}

describe("Vérification portable : reprise sans doublon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyPortableProfile.mockResolvedValue({ id: "member-uuid", verificationStatus: "pending" });
  });

  it("propose une relance du même dossier quand l’analyse n’a pas été confirmée", async () => {
    getMyPortableVerification.mockResolvedValue({ id: "verification-uuid", status: "pending", adminNote: null, aiReviewedAt: null, retryAllowed: true, analysisAvailable: null });
    retryPortableVerification.mockResolvedValue({ verification: { id: "verification-uuid", status: "pending", adminNote: null, aiReviewedAt: "2026-08-26T12:15:03.000Z", retryAllowed: false, analysisAvailable: true }, analysisError: null });

    const renderer = await renderVerification({ id: "verification-uuid", status: "pending", adminNote: null, aiReviewedAt: null, retryAllowed: true, analysisAvailable: null });
    expect(JSON.stringify(renderer.toJSON())).toContain("Relancer l’analyse sécurisée");
    expect(JSON.stringify(renderer.toJSON())).toContain("sans envoyer une seconde fois vos preuves");

    const retryButton = renderer.root.findAllByType("button").find((button: ReactTestInstance) => button.props.children === "Relancer l’analyse sécurisée");
    expect(retryButton).toBeDefined();
    await act(async () => { retryButton!.props.onClick(); });
    expect(retryPortableVerification).toHaveBeenCalledWith("verification-uuid");
  });

  it("affiche une revue humaine et ne propose aucune relance automatique après analyse confirmée", async () => {
    getMyPortableVerification.mockResolvedValue({ id: "verification-uuid", status: "pending", adminNote: null, aiReviewedAt: "2026-08-26T12:15:03.000Z", retryAllowed: false, analysisAvailable: true });

    const renderer = await renderVerification({ id: "verification-uuid", status: "pending", adminNote: null, aiReviewedAt: "2026-08-26T12:15:03.000Z", retryAllowed: false, analysisAvailable: true });
    const content = JSON.stringify(renderer.toJSON());
    expect(content).toContain("revue humaine");
    expect(content).not.toContain("Relancer l’analyse sécurisée");
    expect(retryPortableVerification).not.toHaveBeenCalled();
  });
});
