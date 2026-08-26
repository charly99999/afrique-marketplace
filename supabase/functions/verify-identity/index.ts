import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { decideIdentityVerification, type IdentityReview, unavailableIdentityReview } from "./decision.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return Response.json({ error: "Service de vérification non configuré." }, { status: 503, headers: corsHeaders });

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return Response.json({ error: "Authentification requise." }, { status: 401, headers: corsHeaders });
  const admin = createClient(url, serviceRole);
  const token = authHeader.replace(/^Bearer\s+/i, "");
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

  const applyDecision = async (review: IdentityReview) => {
    const { error } = await admin.rpc("am_apply_identity_decision", {
      p_verification_id: verificationId,
      p_decision: "pending",
      p_review: review,
      p_note: null,
    });
    if (error) throw new Error("La transition de vérification n’a pas été enregistrée.");
  };

  const review: IdentityReview = unavailableIdentityReview(
    "Aucun fournisseur distant n’est requis : les pré-contrôles locaux doivent être complétés et toute décision positive reste soumise à une revue fondée sur les preuves."
  );
  try {
    await applyDecision(decideIdentityVerification(review));
  } catch (error) {
    console.error("verify-identity pending transition failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Le statut de vérification n’a pas pu être confirmé." }, { status: 500, headers: corsHeaders });
  }

  return Response.json({
    status: "pending",
    analysisAvailable: false,
    manualReviewRequired: true,
    message: "Les pré-contrôles locaux sont terminés. Votre dossier reste protégé et sera examiné sans dépendre d’une API Gemini.",
    review,
  }, { headers: corsHeaders });
});
