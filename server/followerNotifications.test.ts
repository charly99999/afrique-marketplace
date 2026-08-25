import { describe, expect, it } from "vitest";
import { buildFollowerListingNotifications, persistFollowerListingNotifications } from "./db";

describe("alertes de nouvelles annonces pour abonnés", () => {
  it("cible chaque abonné une seule fois, exclut le vendeur et conserve un contenu explicite", () => {
    const notifications = buildFollowerListingNotifications([7, 11, 7, 22], 11, { id: 83, title: "Toyota Yaris hybride" });

    expect(notifications).toEqual([
      { userId: 7, type: "system", title: "Nouvelle annonce d’un vendeur suivi", body: "Une nouvelle annonce est disponible : Toyota Yaris hybride" },
      { userId: 22, type: "system", title: "Nouvelle annonce d’un vendeur suivi", body: "Une nouvelle annonce est disponible : Toyota Yaris hybride" },
    ]);
    expect(notifications.find(notification => notification.userId === 11)).toBeUndefined();
  });

  it("ne crée aucune alerte lorsqu’il n’existe aucun abonné distinct du vendeur", () => {
    expect(buildFollowerListingNotifications([11], 11, { id: 84, title: "Appartement meublé" })).toEqual([]);
  });

  it("persiste exactement les alertes construites afin qu’elles soient consultables dans la liste d’alertes", async () => {
    const notifications = buildFollowerListingNotifications([7, 22], 11, { id: 85, title: "Local commercial" });
    const persisted: typeof notifications = [];

    await persistFollowerListingNotifications(notifications, { insertNotifications: async rows => { persisted.push(...rows); } });

    expect(persisted).toEqual(notifications);
    expect(persisted.map(item => item.title)).toEqual(["Nouvelle annonce d’un vendeur suivi", "Nouvelle annonce d’un vendeur suivi"]);
  });
});
