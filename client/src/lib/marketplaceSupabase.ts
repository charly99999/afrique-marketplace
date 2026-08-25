import { requireSupabaseClient } from "./supabaseClient";

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

export async function getPortableSession() {
  const { data, error } = await requireSupabaseClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signUpWithPhoneAndPassword(payload: { phone: string; password: string; firstName: string; lastName: string; city: string }) {
  const { data, error } = await requireSupabaseClient().auth.signUp({
    phone: payload.phone,
    password: payload.password,
    options: { data: { first_name: payload.firstName, last_name: payload.lastName, city: payload.city } },
  });
  if (error) throw error;
  return data;
}

export async function signInWithPhoneAndPassword(phone: string, password: string) {
  const { data, error } = await requireSupabaseClient().auth.signInWithPassword({ phone, password });
  if (error) throw error;
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

export function portableMediaUrl(path: string | null | undefined) {
  if (!path) return "";
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

export async function createPortableListing(payload: Omit<PortableListing, "id" | "userId" | "status" | "createdAt" | "updatedAt">) {
  const client = requireSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Connexion requise.");
  const { data, error } = await client.from("am_listings").insert({
    owner_id: user.id, title: payload.title, description: payload.description, category_id: payload.category,
    city: payload.city, price: payload.price, currency: payload.currency, item_condition: payload.condition, media: payload.media,
  }).select().single();
  if (error) throw error;
  return normalizeListing(data as Record<string, unknown>);
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
  }).select().single();
  if (error) throw error;
  return normalizeListing(data as Record<string, unknown>);
}

export async function uploadPortableMedia(path: string, file: File, privateIdentity = false) {
  const bucket = privateIdentity ? "marketplace-identity" : "marketplace-media";
  const { error } = await requireSupabaseClient().storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
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
