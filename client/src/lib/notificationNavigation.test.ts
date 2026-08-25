import { describe, expect, it, vi } from "vitest";
import { getInternalListingPath, openNotificationDestination } from "./notificationNavigation";

describe("ouverture des alertes", () => {
  it("marque une alerte non lue puis ouvre son annonce interne", () => {
    const navigate = vi.fn();
    const markRead = vi.fn((_id, callbacks) => callbacks.onSuccess?.());
    const opened = openNotificationDestination({ id: 91, readAt: null, linkPath: "/annonce/85" }, { markRead, navigate });

    expect(opened).toBe(true);
    expect(markRead).toHaveBeenCalledWith(91, expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }));
    expect(navigate).toHaveBeenCalledWith("/annonce/85");
  });

  it("ouvre tout de même l’annonce lorsque le marquage lu échoue", () => {
    const navigate = vi.fn();
    const markRead = vi.fn((_id, callbacks) => callbacks.onError?.());
    openNotificationDestination({ id: 92, readAt: null, linkPath: "/annonce/86" }, { markRead, navigate });

    expect(navigate).toHaveBeenCalledWith("/annonce/86");
  });

  it("refuse les destinations externes ou non liées à une annonce", () => {
    expect(getInternalListingPath("https://exemple.test")).toBeNull();
    expect(getInternalListingPath("/profil")).toBeNull();
    expect(getInternalListingPath("/annonce/85")).toBe("/annonce/85");
  });
});
