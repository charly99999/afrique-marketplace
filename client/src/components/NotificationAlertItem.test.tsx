import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { NotificationAlertItem } from "./NotificationAlertItem";

describe("NotificationAlertItem", () => {
  it("affiche le titre et le contenu d’une alerte de nouvelle annonce suivie", () => {
    const html = renderToStaticMarkup(<NotificationAlertItem item={{ id: 77, title: "Nouvelle annonce d’un vendeur suivi", body: "Une nouvelle annonce est disponible : Toyota Yaris hybride", readAt: null }} onOpen={vi.fn()} />);

    expect(html).toContain("Nouvelle annonce d’un vendeur suivi");
    expect(html).toContain("Une nouvelle annonce est disponible : Toyota Yaris hybride");
    expect(html).toContain("alert-item--unread");
  });
});
