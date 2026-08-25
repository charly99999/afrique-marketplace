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
  const { data: profile } = await admin.from("am_profiles").select("first_name,last_name,city").eq("id", user.id).single();
  if (!profile) return Response.json({ error: "Profil introuvable, dossier conservé en attente." }, { status: 422, headers: corsHeaders });
  const ownedPrefix = `${user.id}/`;
  if (!verification.document_path.startsWith(ownedPrefix) || !verification.selfie_path.startsWith(ownedPrefix)) return Response.json({ error: "Chemins de preuve invalides." }, { status: 403, headers: corsHeaders });
  const keepPendingForManualReview = async (reason: string) => {
    const safeReason = reason.slice(0, 240);
    await admin.from("am_identity_verifications").update({ status: "pending", ai_review: { recommendation: "manual_review", confidence: 0, documentReadable: false, selfieFaceVisible: false, profileInformationConsistent: false, reasons: [safeReason] }, ai_reviewed_at: new Date().toISOString(), admin_note: "Analyse automatique indisponible : revue humaine requise." }).eq("id", verificationId).eq("user_id", user.id);
    return Response.json({ status: "pending", analysisUnavailable: true, message: "Analyse automatique indisponible. Votre dossier reste en attente d’une revue humaine." }, { headers: corsHeaders });
  };

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
  let documentImage: { inlineData: { mimeType: string; data: string } };
  let selfieImage: { inlineData: { mimeType: string; data: string } };
  try {
    [documentImage, selfieImage] = await Promise.all([toInlineImage(verification.document_path), toInlineImage(verification.selfie_path)]);
  } catch (error) {
    console.error("verify-identity private proof read failed", error instanceof Error ? error.message : "unknown");
    return keepPendingForManualReview("Les preuves privées sont momentanément indisponibles.");
  }
  const declaredProfile = JSON.stringify({ prenom: profile.first_name, nom: profile.last_name, ville: profile.city });
  const prompt = `Tu analyses un dossier d’identité pour une marketplace. Document déclaré: ${verification.document_type}. Profil déclaré (à comparer visuellement au document, sans prétendre identifier la personne): ${declaredProfile}. Le selfie doit montrer nettement un visage et le document doit être lisible. Retourne uniquement un JSON avec recommendation (approve|reject|manual_review), confidence (0-100), documentReadable, selfieFaceVisible, profileInformationConsistent et reasons. Approve uniquement si les trois indicateurs sont vrais et la confiance est au moins 85. Reject seulement si le document ou le selfie est inutilisable ; dans tout autre cas, manual_review. N’infère aucun attribut sensible.`;
  const modelResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, documentImage, selfieImage] }], generationConfig: { responseMimeType: "application/json" } }),
  });
  if (!modelResponse.ok) {
    console.error("verify-identity provider failed", modelResponse.status);
    return keepPendingForManualReview("Le fournisseur d’analyse automatique est momentanément indisponible.");
  }
  const payload = await modelResponse.json();
  let review: { recommendation?: string; confidence?: number; documentReadable?: boolean; selfieFaceVisible?: boolean; profileInformationConsistent?: boolean; reasons?: string[] };
  try {
    review = JSON.parse(payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
  } catch {
    return keepPendingForManualReview("La réponse d’analyse automatique est inexploitable.");
  }
  const recommendation = review.recommendation;
  const confidence = typeof review.confidence === "number" ? review.confidence : -1;
  const documentReadable = review.documentReadable === true;
  const selfieFaceVisible = review.selfieFaceVisible === true;
  const profileInformationConsistent = review.profileInformationConsistent === true;
  const reasons = Array.isArray(review.reasons) ? review.reasons.filter((reason): reason is string => typeof reason === "string").slice(0, 5) : [];
  const approved = recommendation === "approve" && confidence >= 85 && documentReadable && selfieFaceVisible && profileInformationConsistent;
  const rejected = (recommendation === "reject" || recommendation === "resubmit") && (!documentReadable || !selfieFaceVisible);
  const status = approved ? "approved" : rejected ? "rejected" : "pending";
  const normalizedReview = { recommendation, confidence, documentReadable, selfieFaceVisible, profileInformationConsistent, reasons };
  await admin.from("am_identity_verifications").update({ status, ai_review: normalizedReview, ai_reviewed_at: new Date().toISOString(), admin_note: status === "rejected" ? reasons.join(" ") : null }).eq("id", verificationId);
  if (approved) await admin.from("am_profiles").update({ verification_status: "verified", profile_photo_path: verification.selfie_path }).eq("id", user.id);
  if (status !== "pending") await admin.from("am_notifications").insert({ user_id: user.id, type: "verification", title: status === "approved" ? "Profil vérifié" : "Nouvelle soumission requise", body: status === "approved" ? "Votre badge vérifié est désormais actif." : "Votre dossier doit être soumis à nouveau avec des preuves plus lisibles." });
  return Response.json({ status, review: normalizedReview }, { headers: corsHeaders });
});
