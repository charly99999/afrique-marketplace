import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { NotificationAlertItem } from "./NotificationAlertItem";

describe("NotificationAlertItem", () => {
  it("affiche le titre et le contenu d’une alerte de nouvelle annonce suivie", () => {
    const html = renderToStaticMarkup(<NotificationAlertItem item={{ id: 77, title: "Nouvelle annonce d’un vendeur suivi", body: "Une nouvelle annonce est disponible : Toyota Yaris hybride", linkPath: "/annonce/85", readAt: null }} onOpen={vi.fn()} />);

    expect(html).toContain("Nouvelle annonce d’un vendeur suivi");
    expect(html).toContain("Une nouvelle annonce est disponible : Toyota Yaris hybride");
    expect(html).toContain("Voir l’annonce");
    expect(html).toContain("alert-item--unread");
  });

  it("transmet au gestionnaire l’alerte sélectionnée au clic", () => {
    const item = { id: 78, title: "Nouvelle annonce d’un vendeur suivi", body: "Une nouvelle annonce est disponible : Terrain", linkPath: "/annonce/86", readAt: null };
    const onOpen = vi.fn();
    const element = NotificationAlertItem({ item, onOpen });

    (element.props as { onClick: () => void }).onClick();
    expect(onOpen).toHaveBeenCalledWith(item);
  });
});
