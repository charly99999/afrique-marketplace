import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ client: null as unknown }));

vi.mock("./supabaseClient", () => ({
  requireSupabaseClient: () => state.client,
}));

import {
  followPortableSeller,
  getPortableFollowStatus,
  getPortableListingDetail,
  getPortableSellerProfile,
  signInWithPhoneAndPassword,
  signUpWithPhoneAndPassword,
  searchPortableListings,
  unfollowPortableSeller,
} from "./marketplaceSupabase";

const sellerRow = {
  id: "seller-uuid",
  first_name: "Awa",
  last_name: "Traoré",
  phone: "+2250700000000",
  city: "Abidjan",
  bio: "Vendeuse vérifiée.",
  business_category: "Immobilier",
  business_hours: "Lun–Sam",
  address: "Cocody",
  website: "https://example.com",
  contact_email: "contact@example.com",
  profile_photo_path: "seller-uuid/profile.jpg",
  cover_photo_path: "seller-uuid/cover.jpg",
};

const listingRow = {
  id: "listing-uuid",
  owner_id: "seller-uuid",
  title: "Appartement familial",
  description: "Annonce de test suffisamment détaillée.",
  category_id: "immobilier",
  city: "Abidjan",
  price: "12500000",
  currency: "XOF",
  item_condition: "bon_etat",
  media: [{ key: "seller-uuid/listings/photo.jpg", kind: "image" }],
  status: "published",
  created_at: "2026-08-25T00:00:00.000Z",
  updated_at: "2026-08-25T00:00:00.000Z",
};

function maybeSingle(data: unknown) {
  return vi.fn().mockResolvedValue({ data, error: null });
}

describe("adaptateurs Supabase des pages publiques", () => {
  beforeEach(() => {
    state.client = null;
  });

  it("charge une annonce publiée avec le seul profil vendeur vérifié public", async () => {
    const listingMaybeSingle = maybeSingle(listingRow);
    const sellerMaybeSingle = maybeSingle(sellerRow);
    state.client = {
      from: vi.fn((table: string) => {
        if (table === "am_listings") {
          const chain = { eq: vi.fn(), maybeSingle: listingMaybeSingle };
          chain.eq.mockReturnValue(chain);
          return { select: vi.fn(() => chain) };
        }
        const chain = { eq: vi.fn() };
        chain.eq.mockReturnValue(chain);
        chain.maybeSingle = sellerMaybeSingle;
        return { select: vi.fn(() => chain), ...chain };
      }),
    };

    const detail = await getPortableListingDetail("listing-uuid");

    expect(detail?.listing.id).toBe("listing-uuid");
    expect(detail?.seller).toMatchObject({ userId: "seller-uuid", firstName: "Awa", verificationStatus: "verified" });
    expect(state.client.from).toHaveBeenNthCalledWith(1, "am_listings");
    expect(state.client.from).toHaveBeenNthCalledWith(2, "am_public_seller_profiles");
  });

  it("charge la fiche publique d’un vendeur et limite ses annonces au statut publié", async () => {
    const sellerMaybeSingle = maybeSingle(sellerRow);
    const listingOrder = vi.fn().mockResolvedValue({ data: [listingRow], error: null });
    state.client = {
      from: vi.fn((table: string) => {
        if (table === "am_public_seller_profiles") {
          const chain = { eq: vi.fn(), maybeSingle: sellerMaybeSingle };
          chain.eq.mockReturnValue(chain);
          return { select: vi.fn(() => chain) };
        }
        const chain = { eq: vi.fn(), order: listingOrder };
        chain.eq.mockReturnValue(chain);
        return { select: vi.fn(() => chain) };
      }),
    };

    const profile = await getPortableSellerProfile("seller-uuid");

    expect(profile?.seller.userId).toBe("seller-uuid");
    expect(profile?.listings).toHaveLength(1);
    expect(listingOrder).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("lit et met à jour uniquement le suivi du membre connecté", async () => {
    const followLookup = maybeSingle({ seller_id: "seller-uuid" });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const deleteFilter = vi.fn();
    const deleteSellerFilter = vi.fn().mockResolvedValue({ error: null });
    deleteFilter.mockReturnValue({ eq: deleteSellerFilter });
    state.client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "buyer-uuid" } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn(() => {
          const chain = { eq: vi.fn(), maybeSingle: followLookup };
          chain.eq.mockReturnValue(chain);
          return chain;
        }),
        insert,
        delete: vi.fn(() => ({ eq: deleteFilter })),
      })),
    };

    await expect(getPortableFollowStatus("seller-uuid")).resolves.toBe(true);
    await followPortableSeller("seller-uuid");
    await unfollowPortableSeller("seller-uuid");

    expect(insert).toHaveBeenCalledWith({ follower_id: "buyer-uuid", seller_id: "seller-uuid" });
    expect(deleteFilter).toHaveBeenCalledWith("follower_id", "buyer-uuid");
    expect(deleteSellerFilter).toHaveBeenCalledWith("seller_id", "seller-uuid");
  });
});


describe("authentification par téléphone sans SMS", () => {
  it("utilise le même identifiant interne après normalisation du numéro", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: { access_token: "signup-token" } }, error: null });
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { session: { access_token: "login-token" } }, error: null });
    state.client = { auth: { signUp, signInWithPassword } };

    await expect(signUpWithPhoneAndPassword({ phone: "0565 24 23 49", password: "different-test-password", firstName: "Awa", lastName: "Kone", city: "Abidjan" })).resolves.toMatchObject({ session: { access_token: "signup-token" } });
    await expect(signInWithPhoneAndPassword("+225 05 65 24 23 49", "different-test-password")).resolves.toMatchObject({ session: { access_token: "login-token" } });

    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ email: "phone-2250565242349@accounts.afrique-marketplace.internal", password: "different-test-password", options: { data: expect.objectContaining({ phone: "+2250565242349" }) } }));
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "phone-2250565242349@accounts.afrique-marketplace.internal", password: "different-test-password" });
  });

  it("signale un compte non ouvert si Supabase ne renvoie pas de session", async () => {
    state.client = { auth: { signUp: vi.fn().mockResolvedValue({ data: { session: null, user: { id: "pending-user" } }, error: null }), signInWithPassword: vi.fn() } };
    await expect(signUpWithPhoneAndPassword({ phone: "+2250565242349", password: "different-test-password", firstName: "Awa", lastName: "Kone", city: "Abidjan" })).rejects.toThrow("session n’a pas été ouverte");
  });
});


describe("visibilité publique du catalogue", () => {
  it("charge les annonces publiées pour tous sans filtre de propriétaire", async () => {
    const row = { ...listingRow, owner_id: "other-user" };
    const chain = {
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      or: vi.fn(),
      then: (resolve: (value: { data: typeof row[]; error: null }) => unknown) => resolve({ data: [row], error: null }),
    };
    chain.eq.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.or.mockReturnValue(chain);
    state.client = { from: vi.fn(() => ({ select: vi.fn(() => chain) })) };

    const listings = await searchPortableListings({ query: "Appartement" });

    expect(listings).toHaveLength(1);
    expect(listings[0].userId).toBe("other-user");
    expect(chain.eq).toHaveBeenCalledWith("status", "published");
    expect(chain.or).toHaveBeenCalledWith("title.ilike.%Appartement%,description.ilike.%Appartement%");
  });
});
