import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const { navigateMock, markReadMock } = vi.hoisted(() => ({ navigateMock: vi.fn(), markReadMock: vi.fn() }));
const alert = { id: 77, userId: 11, type: "system", title: "Nouvelle annonce d’un vendeur suivi", body: "Une nouvelle annonce est disponible : Toyota Yaris hybride", linkPath: "/annonce/85", readAt: null, createdAt: new Date() };

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("@/components/MarketplaceShell", () => ({ MarketplaceShell: ({ children, title }: { children: React.ReactNode; title?: string }) => <main aria-label={title}>{children}</main> }));
vi.mock("@/components/QueryErrorState", () => ({ QueryErrorState: ({ message }: { message: string }) => <p>{message}</p> }));
vi.mock("wouter", () => ({ useLocation: () => ["/messages", navigateMock] }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    marketplace: {
      conversations: {
        list: { useQuery: () => ({ data: [] }) },
        messages: { useQuery: () => ({ data: [] }) },
        reply: { useMutation: () => ({ mutate: vi.fn() }) },
      },
      notifications: {
        list: { useQuery: () => ({ data: [alert] }) },
        markRead: { useMutation: () => ({ mutate: markReadMock }) },
      },
      reviews: { leave: { useMutation: () => ({ mutate: vi.fn() }) } },
    },
  },
}));

import Messages from "./Messages";

describe("Messages", () => {
  it("ouvre l’annonce après un vrai clic sur l’alerte et marque celle-ci comme lue", async () => {
    markReadMock.mockReset();
    navigateMock.mockReset();
    markReadMock.mockImplementation((_input, callbacks) => callbacks?.onSuccess?.());
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let renderer: ReactTestRenderer;

    await act(async () => { renderer = create(<QueryClientProvider client={queryClient}><Messages /></QueryClientProvider>); });
    const alertButton = renderer!.root.findAll(node => node.type === "button" && String(node.props.className).includes("alert-item"))[0];
    expect(alertButton).toBeDefined();

    await act(async () => { alertButton.props.onClick(); });

    expect(markReadMock).toHaveBeenCalledWith({ notificationId: 77 }, expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }));
    expect(navigateMock).toHaveBeenCalledWith("/annonce/85");
  });
});
