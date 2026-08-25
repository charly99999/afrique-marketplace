import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const respond = (payload: unknown, status = 200) => Response.json(payload, { status, headers: corsHeaders });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = request.headers.get("Authorization");
  if (!url || !serviceRole) return respond({ error: "Service administratif non configuré." }, 503);
  if (!authHeader) return respond({ error: "Authentification requise." }, 401);

  const admin = createClient(url, serviceRole);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return respond({ error: "Session invalide." }, 401);
  const { data: operator } = await admin.from("am_profiles").select("role").eq("id", user.id).maybeSingle();
  if (operator?.role !== "admin") return respond({ error: "Accès administrateur requis." }, 403);

  const body = await request.json().catch(() => ({}));
  const action = body?.action;

  if (action === "overview") {
    const [users, pending, listings, flagged] = await Promise.all([
      admin.from("am_profiles").select("id", { count: "exact", head: true }),
      admin.from("am_identity_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("am_listings").select("id", { count: "exact", head: true }),
      admin.from("am_listings").select("id", { count: "exact", head: true }).eq("status", "hidden"),
    ]);
    return respond({ users: users.count ?? 0, pendingVerifications: pending.count ?? 0, listings: listings.count ?? 0, flaggedContent: flagged.count ?? 0 });
  }

  if (action === "pending") {
    const { data: verifications, error } = await admin.from("am_identity_verifications").select("id, user_id, document_type, document_path, selfie_path, ai_review, ai_reviewed_at, created_at").eq("status", "pending").order("created_at", { ascending: true }).limit(100);
    if (error) return respond({ error: "Dossiers indisponibles." }, 500);
    const userIds = (verifications ?? []).map(item => item.user_id);
    const { data: profiles } = userIds.length ? await admin.from("am_profiles").select("id, first_name, last_name, phone, city").in("id", userIds) : { data: [] };
    const profilesById = new Map((profiles ?? []).map(item => [item.id, item]));
    return respond((verifications ?? []).map(item => {
      const profile = profilesById.get(item.user_id);
      return { id: item.id, userId: item.user_id, documentType: item.document_type, aiReview: item.ai_review, aiReviewedAt: item.ai_reviewed_at, createdAt: item.created_at, firstName: profile?.first_name ?? "", lastName: profile?.last_name ?? "", phone: profile?.phone ?? "", city: profile?.city ?? "" };
    }));
  }

  if (action === "proof-url") {
    const verificationId = String(body?.verificationId ?? "");
    const proof = body?.proof === "selfie" ? "selfie" : "document";
    const { data: verification } = await admin.from("am_identity_verifications").select("document_path, selfie_path").eq("id", verificationId).maybeSingle();
    if (!verification) return respond({ error: "Dossier introuvable." }, 404);
    const path = proof === "selfie" ? verification.selfie_path : verification.document_path;
    const { data, error } = await admin.storage.from("marketplace-identity").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return respond({ error: "Preuve privée indisponible." }, 500);
    return respond({ url: data.signedUrl });
  }

  if (action === "listings") {
    const { data, error } = await admin.from("am_listings").select("id, title, category_id, city, status, created_at").order("created_at", { ascending: false }).limit(200);
    if (error) return respond({ error: "Annonces indisponibles." }, 500);
    return respond((data ?? []).map(item => ({ id: item.id, title: item.title, category: item.category_id, city: item.city, status: item.status })));
  }

  if (action === "review") {
    const verificationId = String(body?.verificationId ?? "");
    const decision = body?.decision;
    const note = String(body?.note ?? "").trim();
    const confirmedConsistent = Boolean(body?.confirmedConsistent);
    if (!verificationId || !["approved", "rejected"].includes(decision)) return respond({ error: "Décision invalide." }, 400);
    if (decision === "approved" && !confirmedConsistent) return respond({ error: "La confirmation de cohérence est requise." }, 400);
    if (decision === "rejected" && note.length < 8) return respond({ error: "Un motif de refus précis est requis." }, 400);
    const { data: verification } = await admin.from("am_identity_verifications").select("user_id, selfie_path").eq("id", verificationId).eq("status", "pending").maybeSingle();
    if (!verification) return respond({ error: "Dossier introuvable ou déjà traité." }, 404);
    const { error: reviewError } = await admin.from("am_identity_verifications").update({ status: decision, admin_note: decision === "rejected" ? note : null }).eq("id", verificationId);
    if (reviewError) return respond({ error: "Décision non enregistrée." }, 500);
    if (decision === "approved") await admin.from("am_profiles").update({ verification_status: "verified", profile_photo_path: verification.selfie_path }).eq("id", verification.user_id);
    else await admin.from("am_profiles").update({ verification_status: "rejected" }).eq("id", verification.user_id);
    await admin.from("am_notifications").insert({ user_id: verification.user_id, type: "verification", title: decision === "approved" ? "Profil vérifié" : "Nouvelle soumission requise", body: decision === "approved" ? "Votre badge vérifié est désormais actif." : note });
    return respond({ status: decision });
  }

  if (action === "moderate") {
    const listingId = String(body?.listingId ?? "");
    const status = body?.status;
    if (!listingId || !["published", "hidden", "removed"].includes(status)) return respond({ error: "Statut invalide." }, 400);
    const { error } = await admin.from("am_listings").update({ status }).eq("id", listingId);
    if (error) return respond({ error: "Modération indisponible." }, 500);
    return respond({ status });
  }

  return respond({ error: "Action administrative inconnue." }, 400);
});
