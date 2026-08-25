import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const aiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
  if (!url || !serviceRole || !aiKey) return Response.json({ error: "Service de vérification non configuré." }, { status: 503, headers: corsHeaders });

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return Response.json({ error: "Authentification requise." }, { status: 401, headers: corsHeaders });
  const admin = createClient(url, serviceRole);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return Response.json({ error: "Session invalide." }, { status: 401, headers: corsHeaders });

  const { verificationId } = await request.json().catch(() => ({}));
  if (typeof verificationId !== "string" || !verificationId) return Response.json({ error: "Identifiant de dossier invalide." }, { status: 400, headers: corsHeaders });
  const { data: verification } = await admin.from("am_identity_verifications").select("id,user_id,document_type,document_path,selfie_path,status").eq("id", verificationId).eq("user_id", user.id).eq("status", "pending").single();
  if (!verification) return Response.json({ error: "Dossier introuvable ou déjà traité." }, { status: 404, headers: corsHeaders });
  const ownedPrefix = `${user.id}/`;
  if (!verification.document_path.startsWith(ownedPrefix) || !verification.selfie_path.startsWith(ownedPrefix)) return Response.json({ error: "Chemins de preuve invalides." }, { status: 403, headers: corsHeaders });

  // Le fournisseur IA est explicitement remplacé par une clé externe. Cette
  // fonction ne déclare jamais l’identité d’une personne : elle n’automatise
  // que les dossiers très cohérents, sinon maintient la revue humaine.
  const toInlineImage = async (path: string) => {
    const { data: signed, error } = await admin.storage.from("marketplace-identity").createSignedUrl(path, 60);
    if (error || !signed?.signedUrl) throw new Error("Impossible de lire une preuve privée.");
    const image = await fetch(signed.signedUrl);
    if (!image.ok) throw new Error("Preuve privée indisponible.");
    const bytes = new Uint8Array(await image.arrayBuffer());
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return { inlineData: { mimeType: image.headers.get("content-type")?.split(";")[0] || "image/jpeg", data: btoa(binary) } };
  };
  const [documentImage, selfieImage] = await Promise.all([toInlineImage(verification.document_path), toInlineImage(verification.selfie_path)]);
  const prompt = `Analyse uniquement la lisibilité du document (${verification.document_type}), la présence d’un visage sur le selfie et la cohérence apparente avec le profil. Retourne un JSON: recommendation(approve|reject|manual_review), confidence(0-100), documentReadable, selfieFaceVisible, profileInformationConsistent, reasons. N’infère aucun attribut sensible.`;
  const modelResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, documentImage, selfieImage] }], generationConfig: { responseMimeType: "application/json" } }),
  });
  if (!modelResponse.ok) return Response.json({ error: "Analyse indisponible, dossier conservé en attente." }, { status: 503, headers: corsHeaders });
  const payload = await modelResponse.json();
  let review: { recommendation?: string; confidence?: number; documentReadable?: boolean; selfieFaceVisible?: boolean; profileInformationConsistent?: boolean; reasons?: string[] };
  try {
    review = JSON.parse(payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
  } catch {
    return Response.json({ error: "Réponse d’analyse invalide, dossier conservé en attente." }, { status: 503, headers: corsHeaders });
  }
  const approved = review.recommendation === "approve" && review.confidence >= 85 && review.documentReadable && review.selfieFaceVisible && review.profileInformationConsistent;
  const rejected = review.recommendation === "reject" && (!review.documentReadable || !review.selfieFaceVisible);
  const status = approved ? "approved" : rejected ? "rejected" : "pending";
  await admin.from("am_identity_verifications").update({ status, ai_review: review, ai_reviewed_at: new Date().toISOString(), admin_note: status === "rejected" ? (review.reasons ?? []).join(" ") : null }).eq("id", verificationId);
  if (approved) await admin.from("am_profiles").update({ verification_status: "verified", profile_photo_path: verification.selfie_path }).eq("id", user.id);
  if (status !== "pending") await admin.from("am_notifications").insert({ user_id: user.id, type: "verification", title: status === "approved" ? "Profil vérifié" : "Nouvelle soumission requise", body: status === "approved" ? "Votre badge vérifié est désormais actif." : "Votre dossier doit être soumis à nouveau avec des preuves plus lisibles." });
  return Response.json({ status, review }, { headers: corsHeaders });
});
