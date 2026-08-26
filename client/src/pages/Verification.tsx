import { useAuth } from "@/_core/hooks/useAuth";
import { CameraCapture } from "@/components/CameraCapture";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { QueryErrorState } from "@/components/QueryErrorState";
import { isSupabaseMode } from "@/lib/backendMode";
import { fileToDataUrl, mediaErrorMessage } from "@/lib/media";
import { getMyPortableProfile, getMyPortableVerification, retryPortableVerification, submitPortableVerification } from "@/lib/marketplaceSupabase";
import { trpc } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileCheck2, LockKeyhole, ScanFace, ShieldCheck, Upload } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "wouter";

export default function Verification() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const legacyProfile = trpc.marketplace.profile.mine.useQuery(undefined, { enabled: !isSupabaseMode && isAuthenticated, refetchInterval: 3000, refetchOnWindowFocus: true });
  const portableProfile = useQuery({ queryKey: ["portable-my-profile"], queryFn: getMyPortableProfile, enabled: isSupabaseMode && isAuthenticated, refetchInterval: 3000, refetchOnWindowFocus: true });
  const profile = isSupabaseMode ? portableProfile : legacyProfile;
  const legacyExisting = trpc.marketplace.verification.mine.useQuery(undefined, { enabled: !isSupabaseMode && isAuthenticated, refetchInterval: 3000, refetchOnWindowFocus: true });
  const portableExisting = useQuery({ queryKey: ["portable-my-verification"], queryFn: getMyPortableVerification, enabled: isSupabaseMode && isAuthenticated, refetchInterval: 3000, refetchOnWindowFocus: true });
  const existing = isSupabaseMode ? portableExisting : legacyExisting;
  const [documentType, setDocumentType] = useState<"cni" | "passeport" | "permis" | "carte_scolaire">("cni");
  const [documentData, setDocumentData] = useState<string>();
  const [selfieData, setSelfieData] = useState<string>();
  const [mediaIssue, setMediaIssue] = useState<string>();
  const [aiMessage, setAiMessage] = useState<string>();
  const [aiStarted, setAiStarted] = useState(false);
  const reportAiResult = (result: { status: "approved" | "rejected" | "pending" }) => {
    setAiMessage(result.status === "approved" ? "Votre dossier a été validé automatiquement. Votre badge et votre photo de profil sont en cours d’actualisation." : result.status === "rejected" ? "Votre dossier nécessite une nouvelle soumission. Consultez le motif affiché pour corriger les éléments demandés." : "Votre dossier nécessite un examen complémentaire. Vous serez informé dès qu’une décision sera disponible.");
  };
  const legacySubmit = trpc.marketplace.verification.submit.useMutation({ onSuccess: result => {
    utils.marketplace.verification.mine.invalidate();
    utils.marketplace.profile.mine.invalidate();
    reportAiResult(result);
  } });
  const legacyAnalyzePending = trpc.marketplace.verification.analyzeMine.useMutation({ onSuccess: result => {
    utils.marketplace.verification.mine.invalidate();
    utils.marketplace.profile.mine.invalidate();
    reportAiResult(result);
  }, onError: () => {
    setAiMessage("L’analyse automatique est momentanément indisponible. Votre dossier reste protégé et sera examiné de façon complémentaire.");
  } });
  const portableSubmit = useMutation({ mutationFn: submitPortableVerification, onSuccess: result => {
    portableExisting.refetch();
    portableProfile.refetch();
    reportAiResult(result.verification);
    if (result.analysisError) setAiMessage(result.analysisError);
  } });
  const portableRetry = useMutation({ mutationFn: (verificationId: string) => retryPortableVerification(verificationId), onSuccess: result => {
    portableExisting.refetch();
    portableProfile.refetch();
    reportAiResult(result.verification);
    setAiMessage(result.analysisError || undefined);
  } });

  useEffect(() => {
    if (!isSupabaseMode && existing.data?.status === "pending" && !existing.data.aiReviewedAt && !aiStarted && !legacyAnalyzePending.isPending) {
      setAiStarted(true);
      legacyAnalyzePending.mutate();
    }
  }, [existing.data?.status, existing.data?.aiReviewedAt, aiStarted, legacyAnalyzePending.isPending, legacyAnalyzePending.mutate]);

  const pickDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setMediaIssue(undefined);
      setDocumentData(await fileToDataUrl(file));
    } catch (error) {
      setMediaIssue(mediaErrorMessage(error));
    }
  };
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!documentData || !selfieData) return;
    if (isSupabaseMode) portableSubmit.mutate({ documentType, documentData, selfieData });
    else legacySubmit.mutate({ documentType, documentData, selfieData });
  };
  const submitError = isSupabaseMode ? portableSubmit.error : legacySubmit.error;
  const submitPending = isSupabaseMode ? portableSubmit.isPending : legacySubmit.isPending;
  const analyzePending = isSupabaseMode ? false : legacyAnalyzePending.isPending;
  const portableAwaitingConfirmedAnalysis = isSupabaseMode && existing.data?.status === "pending" && !existing.data.aiReviewedAt;
  const portableInManualReview = isSupabaseMode && existing.data?.status === "pending" && Boolean(existing.data.aiReviewedAt);
  const portablePendingVerificationId = isSupabaseMode && existing.data?.status === "pending" ? String(existing.data.id) : null;
  const submitMessage = submitError?.message.includes("too_big") || submitError?.message.includes("3000000")
    ? "Une photo est encore trop lourde. Reprenez le document ou le selfie : ils seront compressés automatiquement."
    : submitError?.message;

  if (profile.error || existing.error) return <MarketplaceShell title="Vérification"><section className="page-wrap section-space"><QueryErrorState message="Le statut de votre vérification est indisponible pour le moment." onRetry={() => { profile.refetch(); existing.refetch(); }} /></section></MarketplaceShell>;
  if (!isAuthenticated || !profile.data) return <MarketplaceShell title="Vérification"><section className="page-wrap section-space"><div className="gate-card"><LockKeyhole size={28} /><h2>Créez d’abord votre profil.</h2><p>La vérification est réservée aux profils ayant renseigné leur identité de base.</p><Link href="/profil" className="button button--gold">Créer mon profil</Link></div></section></MarketplaceShell>;
  if (existing.data?.status === "approved" || profile.data.verificationStatus === "verified") return <MarketplaceShell title="Vérification"><section className="page-wrap section-space"><div className="gate-card gate-card--success"><ShieldCheck size={32} /><h2>Votre identité est vérifiée.</h2><p>Votre selfie validé est désormais votre photo de profil et votre badge de confiance est actif.</p><Link href="/vendre" className="button button--gold">Publier une annonce</Link></div></section></MarketplaceShell>;
  if (existing.data?.status === "pending") return <MarketplaceShell title="Vérification"><section className="page-wrap section-space"><div className="gate-card"><FileCheck2 size={31} /><h2>{analyzePending || submitPending || portableRetry.isPending ? "Analyse de votre dossier en cours." : portableAwaitingConfirmedAnalysis ? "Analyse à relancer." : "Votre dossier est en revue humaine."}</h2><p>{analyzePending || submitPending || portableRetry.isPending ? "Nous vérifions automatiquement la lisibilité du document, du selfie et la cohérence du profil." : portableAwaitingConfirmedAnalysis ? aiMessage || "Votre dossier est conservé, mais son analyse n’a pas pu être confirmée. Vous pouvez relancer uniquement l’analyse sécurisée du même dossier : aucun document ne sera envoyé une seconde fois." : portableInManualReview ? "L’analyse a demandé un examen humain complémentaire. Vos documents restent privés et vous serez informé dès qu’une décision fondée sur votre dossier sera prise." : aiMessage || "Vous recevrez une alerte dès qu’une décision aura été prise. Vos documents ne sont jamais affichés publiquement."}</p>{portableAwaitingConfirmedAnalysis && portablePendingVerificationId && <><button type="button" className="button button--gold" disabled={portableRetry.isPending} onClick={() => portableRetry.mutate(portablePendingVerificationId)}>{portableRetry.isPending ? "Relance de l’analyse…" : "Relancer l’analyse sécurisée"}</button>{portableRetry.error && <p className="form-error">{portableRetry.error.message}</p>}</>}<Link href="/profil" className="button button--outline">Revenir au profil</Link></div></section></MarketplaceShell>;

  const refusalNote = existing.data?.status === "rejected" ? existing.data.adminNote || "Votre dossier nécessite une nouvelle soumission." : undefined;
  return <MarketplaceShell title="Vérification d’identité"><section className="page-wrap section-space verification-layout"><div className="verification-intro"><p className="eyebrow eyebrow--dark">Étape 2 sur 3</p><h2>Un visage, un document, une communauté plus sûre.</h2><p>La vérification est obligatoire pour publier et échanger avec confiance. Votre selfie doit être pris maintenant via la caméra : il devient votre photo de profil après validation.</p><div className="privacy-note"><LockKeyhole size={20} /><span>Les pièces sont stockées de façon sécurisée ; seule leur référence est conservée dans notre base de données.</span></div></div><form className="verification-form" onSubmit={handleSubmit}>{aiMessage && <div className="verification-ai-status"><ShieldCheck size={20} /><span>{aiMessage}</span></div>}{refusalNote && <div className="verification-refusal"><ShieldCheck size={20} /><div><strong>Votre dossier nécessite une nouvelle soumission.</strong><span>Motif de l’examen : {refusalNote}</span></div></div>}<div className="verification-block"><span className="step-number">01</span><div><h3>Votre document</h3><p>Choisissez une CNI, un passeport, un permis ou une carte scolaire lisible. L’image est réduite automatiquement avant envoi.</p><select value={documentType} onChange={e => setDocumentType(e.target.value as typeof documentType)}><option value="cni">Carte nationale d’identité</option><option value="passeport">Passeport</option><option value="permis">Permis de conduire</option><option value="carte_scolaire">Carte scolaire</option></select><label className="document-drop"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={pickDocument} hidden />{documentData ? <img src={documentData} alt="Document sélectionné" /> : <><Upload size={26} /><strong>Ajouter la photo du document</strong><span>Photo lisible, recto ou page d’identité</span></>}</label></div></div><div className="verification-block"><span className="step-number">02</span><div><h3>Votre selfie en direct</h3><p>Alignez votre visage, gardez une lumière suffisante et ne portez pas de lunettes de soleil.</p><CameraCapture title="Prise directe uniquement" hint="L’import depuis la galerie est volontairement désactivé pour ce selfie." onCapture={data => { setMediaIssue(undefined); setSelfieData(data); }} /></div></div>{mediaIssue && <p className="form-error">{mediaIssue}</p>}{submitMessage && <p className="form-error">{submitMessage}</p>}<button disabled={!documentData || !selfieData || submitPending} className="button button--gold button--wide">{submitPending ? "Analyse sécurisée du dossier…" : <><ScanFace size={17} /> Soumettre ma vérification</>}</button></form></section></MarketplaceShell>;
}
