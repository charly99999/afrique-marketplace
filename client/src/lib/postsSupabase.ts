import { requireSupabaseClient } from "./supabaseClient";

export type PortablePostAuthor = {
  id: string;
  name: string;
  photoPath: string | null;
  verified: boolean;
};

export type PortablePost = {
  id: string;
  userId: string;
  content: string;
  mediaUrls: string[];
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
  author: PortablePostAuthor;
};

function asMediaUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && /^https?:\/\//i.test(item));
}

export function normalizePortablePost(row: Record<string, unknown>): PortablePost {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    content: typeof row.content === "string" ? row.content : "",
    mediaUrls: asMediaUrls(row.media_urls),
    visibility: row.visibility === "private" ? "private" : "public",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    author: {
      id: String(row.user_id),
      name: typeof row.author_name === "string" && row.author_name.trim() ? row.author_name : "Membre Afrique Marketplace",
      photoPath: typeof row.author_photo_path === "string" ? row.author_photo_path : null,
      verified: row.author_verified === true,
    },
  };
}

export async function listPublicPosts() {
  const { data, error } = await requireSupabaseClient()
    .from("posts_feed")
    .select("id, user_id, content, media_urls, visibility, created_at, updated_at, author_name, author_photo_path, author_verified")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(row => normalizePortablePost(row as Record<string, unknown>));
}

export async function createPortablePost(payload: { content: string; files: File[] }) {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Connectez-vous pour publier.");
  const content = payload.content.trim();
  if (!content && payload.files.length === 0) throw new Error("Ajoutez un texte, une photo ou une vidéo.");
  if (content.length > 5000) throw new Error("Le texte est limité à 5 000 caractères.");
  if (payload.files.length > 8) throw new Error("Vous pouvez joindre 8 fichiers maximum.");

  const mediaUrls: string[] = [];
  for (const file of payload.files) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) throw new Error("Seules les images et vidéos sont acceptées.");
    if (file.size > 25 * 1024 * 1024) throw new Error("Chaque fichier doit peser au maximum 25 Mo.");
    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || (file.type.startsWith("video/") ? "mp4" : "jpg");
    const path = `${user.id}/posts/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await client.storage.from("marketplace-media").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = client.storage.from("marketplace-media").getPublicUrl(path);
    mediaUrls.push(publicUrl.publicUrl);
  }

  const { data, error } = await client.from("posts").insert({ user_id: user.id, content, media_urls: mediaUrls, visibility: "public" }).select("id, user_id, content, media_urls, visibility, created_at, updated_at").single();
  if (error) throw error;
  if (!data) throw new Error("La publication n’a pas été confirmée par Supabase.");
  return normalizePortablePost(data as Record<string, unknown>);
}

export async function deletePortablePost(postId: string) {
  const client = requireSupabaseClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Connexion requise.");
  const { error } = await client.from("posts").delete().eq("id", postId).eq("user_id", user.id);
  if (error) throw error;
}

export function postInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "AM";
}
