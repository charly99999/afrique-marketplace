import { requireSupabaseClient } from "./supabaseClient";
import { internalLoginEmail, normalizePhoneNumber } from "./phoneAuth";

export type PortableListingFilters = { query?: string; category?: string; city?: string; condition?: string };

export type PortableListing = {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  city: string;
  price: string | number;
  currency: string;
  condition: "neuf" | "comme_neuf" | "bon_etat" | "a_reparer";
  media: Array<{ key: string; kind: "image" | "video" }>;
  status: "published" | "hidden" | "removed";
  createdAt: string;
  updatedAt: string;
};

export type PortableProfile = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  bio: string;
  businessCategory: string;
  businessHours: string;
  address: string;
  website: string;
  contactEmail: string;
  profilePhotoKey: string | null;
  coverPhotoKey: string | null;
  verificationStatus: "required" | "pending" | "verified" | "rejected";
};

export type PortableSeller = {
  userId: string;
  firstName: string;
  lastName: string;
  city: string;
  businessCategory: string;
  profilePhotoKey: string | null;
};

export type PortableSellerProfile = PortableSeller & {
  phone: string | null;
  bio: string;
  businessHours: string;
  address: string;
  website: string;
  contactEmail: string;
  coverPhotoKey: string | null;
  verificationStatus: "verified";
};

function normalizeListing(row: Record<string, unknown>): PortableListing {
  return {
    id: String(row.id),
    userId: String(row.owner_id),
    title: String(row.title),
    description: String(row.description),
    category: String(row.category_id),
    city: String(row.city),
    price: row.price as string | number,
    currency: String(row.currency),
    condition: row.item_condition as PortableListing["condition"],
    media: Array.isArray(row.media) ? row.media as PortableListing["media"] : [],
    status: row.status as PortableListing["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function normalizeProfile(row: Record<string, unknown>): PortableProfile {
  return {
    id: String(row.id),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    phone: String(row.phone ?? ""),
    city: String(row.city ?? ""),
    bio: String(row.bio ?? ""),
    businessCategory: String(row.business_category ?? ""),
    businessHours: String(row.business_hours ?? ""),
    address: String(row.address ?? ""),
    website: String(row.website ?? ""),
    contactEmail: String(row.contact_email ?? ""),
    profilePhotoKey: row.profile_photo_path ? String(row.profile_photo_path) : null,
    coverPhotoKey: row.cover_photo_path ? String(row.cover_photo_path) : null,
    verificationStatus: (row.verification_status ?? "required") as PortableProfile["verificationStatus"],
  };
}

function normalizePublicSeller(row: Record<string, unknown>): PortableSellerProfile {
  return {
    userId: String(row.id),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    phone: row.phone ? String(row.phone) : null,
    city: String(row.city ?? ""),
    bio: String(row.bio ?? ""),
    businessCategory: String(row.business_category ?? ""),
    businessHours: String(row.business_hours ?? ""),
    address: String(row.address ?? ""),
    website: String(row.website ?? ""),
    contactEmail: String(row.contact_email ?? ""),
    profilePhotoKey: row.profile_photo_path ? String(row.profile_photo_path) : null,
    coverPhotoKey: row.cover_photo_path ? String(row.cover_photo_path) : null,
    verificationStatus: "verified",
  };
}

export async function getPortableSession() {
  const { data, error } = await requireSupabaseClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

export function toMarketplaceAuthError(error: unknown, action: "signup" | "signin") {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (action === "signup" && /already registered|already exists|duplicate|unique/i.test(message)) {
    return new Error("Ce numéro est déjà associé à un compte. Connectez-vous avec ce numéro au lieu de créer un second compte.");
  }
  if (action === "signin" && /invalid login credentials|invalid credentials/i.test(message)) {
    return new Error("Numéro ou mot de passe incorrect. Vérifiez vos informations puis réessayez.");
  }
  return error instanceof Error ? error : new Error("Une erreur d’authentification est survenue.");
}

export async function signUpWithPhoneAndPassword(payload: { phone: string; password: string; firstName: string; lastName: string; city: string }) {
  const normalizedPhone = normalizePhoneNumber(payload.phone);
  const { data, error } = await requireSupabaseClient().auth.signUp({
    email: internalLoginEmail(normalizedPhone),
    password: payload.password,
    options: {
      data: {
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        phone: normalizedPhone,
        city: payload.city.trim(),
      },
    },
  });
  if (error) throw toMarketplaceAuthError(error, "signup");
  if (!data.session) throw new Error("Le compte a été créé, mais la session n’a pas été ouverte. Réessayez de vous connecter.");
  return data;
}

export async function signInWithPhoneAndPassword(phone: string, password: string) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const { data, error } = await requireSupabaseClient().auth.signInWithPassword({
    email: internalLoginEmail(normalizedPhone),
    password,
  });
  if (error) throw toMarketplaceAuthError(error, "signin");
  if (!data.session) throw new Error("Connexion impossible : aucune session active n’a été créée.");
  return data;
}

export async function signOutPortable() {
  const { error } = await requireSupabaseClient().auth.signOut();
  if (error) throw error;
}

export async function getMyPortableProfile() {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) return null;
  const { data, error } = await client.from("am_profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data ? normalizeProfile(data as Record<string, unknown>) : null;
}

export async function updateMyPortableProfile(details: { bio?: string; businessCategory?: string; businessHours?: string; address?: string; website?: string; contactEmail?: string }) {
  const client = requireSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Connexion requise.");
  const { data, error } = await client.from("am_profiles").update({
    bio: details.bio ?? null,
    business_category: details.businessCategory ?? null,
    business_hours: details.businessHours ?? null,
    address: details.address ?? null,
    website: details.website ?? null,
    contact_email: details.contactEmail ?? null,
  }).eq("id", user.id).select().single();
  if (error) throw error;
  return normalizeProfile(data as Record<string, unknown>);
}

export async function listMyPortableListings() {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) return [];
  const { data, error } = await client.from("am_listings").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(item => normalizeListing(item as Record<string, unknown>));
}

export async function listMyPortableFollows() {
  const client = requireSupabaseClient();
  const { data: follows, error: followsError } = await client.from("am_seller_follows").select("seller_id").order("created_at", { ascending: false });
  if (followsError) throw followsError;
  const sellerIds = (follows ?? []).map(item => String(item.seller_id));
  if (!sellerIds.length) return [];
  const { data: sellers, error: sellersError } = await client.from("am_public_seller_profiles").select("id, first_name, last_name, city, business_category, profile_photo_path").in("id", sellerIds);
  if (sellersError) throw sellersError;
  const sellersById = new Map((sellers ?? []).map(item => [String(item.id), item]));
  return sellerIds.flatMap(userId => {
    const seller = sellersById.get(userId);
    if (!seller) return [];
    return [{
      userId,
      firstName: String(seller.first_name),
      lastName: String(seller.last_name),
      city: String(seller.city),
      businessCategory: String(seller.business_category ?? ""),
      profilePhotoKey: seller.profile_photo_path ? String(seller.profile_photo_path) : null,
    } satisfies PortableSeller];
  });
}

export function portableMediaUrl(path: string | null | undefined) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return requireSupabaseClient().storage.from("marketplace-media").getPublicUrl(path).data.publicUrl;
}

export async function uploadMyPortableCover(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choisissez une image de couverture valide.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La couverture est trop lourde. Choisissez une image de 5 Mo maximum.");
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Connexion requise.");
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const path = `${user.id}/covers/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from("marketplace-media").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await client.from("am_profiles").update({ cover_photo_path: path }).eq("id", user.id).select().single();
  if (error) throw error;
  return normalizeProfile(data as Record<string, unknown>);
}

export async function searchPortableListings(filters: PortableListingFilters) {
  const client = requireSupabaseClient();
  let query = client.from("am_listings").select("*").eq("status", "published").order("created_at", { ascending: false }).limit(60);
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.condition) query = query.eq("item_condition", filters.condition);
  if (filters.query?.trim()) query = query.or(`title.ilike.%${filters.query.trim()}%,description.ilike.%${filters.query.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(item => normalizeListing(item as Record<string, unknown>));
}

export async function getPortableListingDetail(listingId: string) {
  const client = requireSupabaseClient();
  const { data: listing, error: listingError } = await client
    .from("am_listings")
    .select("*")
    .eq("id", listingId)
    .eq("status", "published")
    .maybeSingle();
  if (listingError) throw listingError;
  if (!listing) return null;

  const { data: seller, error: sellerError } = await client
    .from("am_public_seller_profiles")
    .select("*")
    .eq("id", listing.owner_id)
    .maybeSingle();
  if (sellerError) throw sellerError;

  return {
    listing: normalizeListing(listing as Record<string, unknown>),
    seller: seller ? normalizePublicSeller(seller as Record<string, unknown>) : null,
  };
}

export async function getPortableFavoriteStatus(listingId: string) {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) return false;
  const { data, error } = await client.from("am_listing_favorites").select("listing_id").eq("listing_id", listingId).eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function setPortableFavorite(listingId: string, favorite: boolean) {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Connexion requise pour enregistrer une annonce.");
  if (favorite) {
    const { error } = await client.from("am_listing_favorites").upsert({ listing_id: listingId, user_id: user.id }, { onConflict: "listing_id,user_id" });
    if (error) throw error;
    return true;
  }
  const { error } = await client.from("am_listing_favorites").delete().eq("listing_id", listingId).eq("user_id", user.id);
  if (error) throw error;
  return false;
}

export async function reportPortableListing(payload: { listingId: string; reason: "fraud" | "prohibited" | "inaccurate" | "harassment" | "other"; details?: string }) {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Connexion requise pour signaler une annonce.");
  const { error } = await client.from("am_listing_reports").insert({ listing_id: payload.listingId, reporter_id: user.id, reason: payload.reason, details: payload.details?.trim() || null });
  if (error) {
    if (error.code === "23505") throw new Error("Vous avez déjà signalé cette annonce.");
    throw error;
  }
}

export async function getPortableSellerProfile(sellerId: string) {
  const client = requireSupabaseClient();
  const { data: seller, error: sellerError } = await client
    .from("am_public_seller_profiles")
    .select("*")
    .eq("id", sellerId)
    .maybeSingle();
  if (sellerError) throw sellerError;
  if (!seller) return null;

  const { data: listings, error: listingsError } = await client
    .from("am_listings")
    .select("*")
    .eq("owner_id", sellerId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (listingsError) throw listingsError;

  return {
    seller: normalizePublicSeller(seller as Record<string, unknown>),
    listings: (listings ?? []).map(item => normalizeListing(item as Record<string, unknown>)),
  };
}

export async function getPortableFollowStatus(sellerId: string) {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) return false;
  const { data, error } = await client
    .from("am_seller_follows")
    .select("seller_id")
    .eq("follower_id", user.id)
    .eq("seller_id", sellerId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function followPortableSeller(sellerId: string) {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Connexion requise.");
  const { error } = await client.from("am_seller_follows").insert({ follower_id: user.id, seller_id: sellerId });
  if (error) throw error;
}

export async function unfollowPortableSeller(sellerId: string) {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Connexion requise.");
  const { error } = await client
    .from("am_seller_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("seller_id", sellerId);
  if (error) throw error;
}

async function assertPortableListingCanBePublished(client: ReturnType<typeof requireSupabaseClient>, userId: string) {
  const { data, error } = await client.from("am_profiles").select("verification_status").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data || data.verification_status !== "verified") throw new Error("Votre identité doit être vérifiée avant de publier une annonce.");
}

async function verifyPortableListingPersistence(client: ReturnType<typeof requireSupabaseClient>, listingId: string, ownerId: string) {
  const { data, error } = await client
    .from("am_listings")
    .select("id, owner_id, status")
    .eq("id", listingId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.status !== "published") {
    throw new Error("La publication n’a pas été confirmée dans la marketplace. Réessayez avant de partager l’annonce.");
  }
}

export async function createPortableListing(payload: Omit<PortableListing, "id" | "userId" | "status" | "createdAt" | "updatedAt">) {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Connexion requise.");
  await assertPortableListingCanBePublished(client, user.id);
  const { data, error } = await client.from("am_listings").insert({
    owner_id: user.id, title: payload.title, description: payload.description, category_id: payload.category,
    city: payload.city, price: payload.price, currency: payload.currency, item_condition: payload.condition, media: payload.media, status: "published",
  }).select().single();
  if (error) throw error;
  const listing = normalizeListing(data as Record<string, unknown>);
  await verifyPortableListingPersistence(client, listing.id, user.id);
  return listing;
}

async function portableFileFromDataUrl(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const type = blob.type || "application/octet-stream";
  return new File([blob], fileName, { type });
}

export async function createPortableListingWithMedia(
  payload: Omit<PortableListing, "id" | "userId" | "status" | "createdAt" | "updatedAt" | "media">,
  preparedMedia: Array<{ dataUrl: string; fileName: string }>,
) {
  if (preparedMedia.length > 4) throw new Error("Ajoutez au maximum quatre médias.");
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Connexion requise.");
  await assertPortableListingCanBePublished(client, user.id);

  const media = await Promise.all(preparedMedia.map(async ({ dataUrl, fileName }) => {
    const file = await portableFileFromDataUrl(dataUrl, fileName);
    const kind = file.type.startsWith("video/") ? "video" : "image";
    if (!file.type.startsWith("image/") && file.type !== "video/mp4") throw new Error("Utilisez une image ou une vidéo MP4.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Un média dépasse la limite autorisée de 5 Mo.");
    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || (kind === "video" ? "mp4" : "jpg");
    const path = `${user.id}/listings/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from("marketplace-media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return { key: path, kind } as { key: string; kind: "image" | "video" };
  }));

  const { data, error } = await client.from("am_listings").insert({
    owner_id: user.id,
    title: payload.title,
    description: payload.description,
    category_id: payload.category,
    city: payload.city,
    price: payload.price,
    currency: payload.currency,
    item_condition: payload.condition,
    media,
    status: "published",
  }).select().single();
  if (error) throw error;
  const listing = normalizeListing(data as Record<string, unknown>);
  await verifyPortableListingPersistence(client, listing.id, user.id);
  return listing;
}

export async function uploadPortableMedia(path: string, file: File, privateIdentity = false) {
  const bucket = privateIdentity ? "marketplace-identity" : "marketplace-media";
  const { error } = await requireSupabaseClient().storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export type PortableVerification = {
  id: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  aiReviewedAt: string | null;
};

function normalizeVerification(row: Record<string, unknown>): PortableVerification {
  return {
    id: String(row.id),
    status: row.status as PortableVerification["status"],
    adminNote: row.admin_note ? String(row.admin_note) : null,
    aiReviewedAt: row.ai_reviewed_at ? String(row.ai_reviewed_at) : null,
  };
}

export async function getMyPortableVerification() {
  const client = requireSupabaseClient();
  const { data, error } = await client.from("am_identity_verifications").select("id, status, admin_note, ai_reviewed_at, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data ? normalizeVerification(data as Record<string, unknown>) : null;
}

export async function submitPortableVerification(payload: { documentType: "cni" | "passeport" | "permis" | "carte_scolaire"; documentData: string; selfieData: string }) {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Connexion requise.");
  const document = await portableFileFromDataUrl(payload.documentData, "document.jpg");
  const selfie = await portableFileFromDataUrl(payload.selfieData, "selfie.jpg");
  if (!document.type.startsWith("image/") || !selfie.type.startsWith("image/")) throw new Error("Le document et le selfie doivent être des images.");
  const documentPath = `${user.id}/identity/document-${crypto.randomUUID()}.jpg`;
  const selfiePath = `${user.id}/identity/selfie-${crypto.randomUUID()}.jpg`;
  const upload = async (path: string, file: File) => {
    const { error } = await client.storage.from("marketplace-identity").upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
  };
  await Promise.all([upload(documentPath, document), upload(selfiePath, selfie)]);
  const { data, error } = await client.from("am_identity_verifications").insert({
    user_id: user.id,
    document_type: payload.documentType,
    document_path: documentPath,
    selfie_path: selfiePath,
  }).select("id, status, admin_note, ai_reviewed_at").single();
  if (error) throw error;
  const verification = normalizeVerification(data as Record<string, unknown>);
  const { data: result, error: invokeError } = await client.functions.invoke("verify-identity", { body: { verificationId: verification.id } });
  if (invokeError) return { verification, analysisError: "Votre dossier est enregistré et reste en attente d’examen sécurisé." };
  const status = result?.status as PortableVerification["status"] | undefined;
  return { verification: { ...verification, status: status ?? verification.status, aiReviewedAt: new Date().toISOString() }, analysisError: null };
}

export async function listPortableConversations() {
  const { data, error } = await requireSupabaseClient().from("am_conversations").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function startPortableConversation(payload: { sellerId: string; listingId: string; body: string }) {
  const client = requireSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Connexion requise.");
  const { data: existing, error: lookupError } = await client.from("am_conversations").select("id").eq("buyer_id", user.id).eq("seller_id", payload.sellerId).eq("listing_id", payload.listingId).maybeSingle();
  if (lookupError) throw lookupError;
  const conversationId = existing?.id ?? (await client.from("am_conversations").insert({ buyer_id: user.id, seller_id: payload.sellerId, listing_id: payload.listingId }).select("id").single()).data?.id;
  if (!conversationId) throw new Error("Conversation indisponible.");
  const { error } = await client.from("am_messages").insert({ conversation_id: conversationId, sender_id: user.id, body: payload.body.trim() });
  if (error) throw error;
  return conversationId;
}

export async function listPortableMessages(conversationId: string) {
  const { data, error } = await requireSupabaseClient().from("am_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function replyPortableConversation(conversationId: string, body: string) {
  const client = requireSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Connexion requise.");
  const { error } = await client.from("am_messages").insert({ conversation_id: conversationId, sender_id: user.id, body: body.trim() });
  if (error) throw error;
}

export async function leavePortableReview(payload: { conversationId: string; rating: number; comment: string }) {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Connexion requise.");

  const { data: conversation, error: conversationError } = await client
    .from("am_conversations")
    .select("buyer_id, seller_id")
    .eq("id", payload.conversationId)
    .maybeSingle();
  if (conversationError) throw conversationError;
  if (!conversation) throw new Error("Conversation introuvable.");

  const recipientId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
  const { data, error } = await client
    .from("am_reviews")
    .insert({
      conversation_id: payload.conversationId,
      from_user_id: user.id,
      to_user_id: recipientId,
      rating: payload.rating,
      comment: payload.comment.trim(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listPortableNotifications() {
  const { data, error } = await requireSupabaseClient().from("am_notifications").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markPortableNotificationRead(notificationId: string) {
  const { error } = await requireSupabaseClient().from("am_notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId);
  if (error) throw error;
}

export type PortableAdminOverview = { users: number; pendingVerifications: number; listings: number; flaggedContent: number };
export type PortableAdminVerification = { id: string; userId: string; documentType: string; aiReview: unknown; aiReviewedAt: string | null; createdAt: string; firstName: string; lastName: string; phone: string; city: string; documentKey?: string; selfieKey?: string };
export type PortableAdminListing = { id: string; title: string; category: string; city: string; status: "published" | "hidden" | "removed" };
export type PortableAdminReport = { id: string; listingId: string; listingTitle: string; reporterId: string; reason: "fraud" | "prohibited" | "inaccurate" | "harassment" | "other"; details: string | null; status: "pending" | "reviewed" | "dismissed" | "actioned"; createdAt: string };

async function portableAdminRequest<T>(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await requireSupabaseClient().functions.invoke("admin-marketplace", { body: { action, ...payload } });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export function getPortableAdminOverview() {
  return portableAdminRequest<PortableAdminOverview>("overview");
}

export function listPortableAdminPendingVerifications() {
  return portableAdminRequest<PortableAdminVerification[]>("pending");
}

export function listPortableAdminListings() {
  return portableAdminRequest<PortableAdminListing[]>("listings");
}

export function listPortableAdminReports() {
  return portableAdminRequest<PortableAdminReport[]>("reports");
}

export async function getPortableAdminProofUrl(verificationId: string, proof: "document" | "selfie") {
  const result = await portableAdminRequest<{ url: string }>("proof-url", { verificationId, proof });
  return result.url;
}

export function reviewPortableVerification(payload: { verificationId: string; decision: "approved" | "rejected"; note: string; confirmedConsistent: boolean }) {
  return portableAdminRequest<{ status: "approved" | "rejected" }>("review", payload);
}

export function moderatePortableListing(payload: { listingId: string; status: "published" | "hidden" | "removed" }) {
  return portableAdminRequest<{ status: "published" | "hidden" | "removed" }>("moderate", payload);
}

export function moderatePortableReport(payload: { reportId: string; status: "reviewed" | "dismissed" | "actioned" }) {
  return portableAdminRequest<{ status: "reviewed" | "dismissed" | "actioned" }>("report", payload);
}
