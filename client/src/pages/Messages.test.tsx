import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const alert = { id: 77, userId: 11, type: "system", title: "Nouvelle annonce d’un vendeur suivi", body: "Une nouvelle annonce est disponible : Toyota Yaris hybride", readAt: null, createdAt: new Date() };

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("@/components/MarketplaceShell", () => ({ MarketplaceShell: ({ children, title }: { children: React.ReactNode; title?: string }) => <main aria-label={title}>{children}</main> }));
vi.mock("@/components/QueryErrorState", () => ({ QueryErrorState: ({ message }: { message: string }) => <p>{message}</p> }));
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
        markRead: { useMutation: () => ({ mutate: vi.fn() }) },
      },
      reviews: { leave: { useMutation: () => ({ mutate: vi.fn() }) } },
    },
  },
}));

import Messages from "./Messages";

describe("Messages", () => {
  it("affiche dans le flux complet l’alerte récupérée de nouvelle annonce suivie", () => {
    const html = renderToStaticMarkup(<Messages />);

    expect(html).toContain("Messages et alertes");
    expect(html).toContain("Nouvelle annonce d’un vendeur suivi");
    expect(html).toContain("Une nouvelle annonce est disponible : Toyota Yaris hybride");
  });
});
