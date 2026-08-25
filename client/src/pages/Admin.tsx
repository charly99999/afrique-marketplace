import DashboardLayout from "@/components/DashboardLayout";
import { QueryErrorState } from "@/components/QueryErrorState";
import { useAuth } from "@/_core/hooks/useAuth";
import { isSupabaseMode } from "@/lib/backendMode";
import { getPortableAdminOverview, getPortableAdminProofUrl, listPortableAdminListings, listPortableAdminPendingVerifications, moderatePortableListing, reviewPortableVerification } from "@/lib/marketplaceSupabase";
import { storageUrl } from "@/lib/media";
import { trpc } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, FileCheck2, ShieldAlert, Trash2, UsersRound } from "lucide-react";
import React, { useState } from "react";

export default function Admin() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const legacyOverview = trpc.marketplace.admin.overview.useQuery(undefined, { enabled: !isSupabaseMode });
  const legacyPending = trpc.marketplace.admin.pendingVerifications.useQuery(undefined, { enabled: !isSupabaseMode });
  const legacyListings = trpc.marketplace.admin.listings.useQuery(undefined, { enabled: !isSupabaseMode });
  const portableOverview = useQuery({ queryKey: ["portable-admin-overview"], queryFn: getPortableAdminOverview, enabled: isSupabaseMode });
  const portablePending = useQuery({ queryKey: ["portable-admin-pending"], queryFn: listPortableAdminPendingVerifications, enabled: isSupabaseMode });
  const portableListings = useQuery({ queryKey: ["portable-admin-listings"], queryFn: listPortableAdminListings, enabled: isSupabaseMode });
  const overview = isSupabaseMode ? portableOverview : legacyOverview;
  const pending = isSupabaseMode ? portablePending : legacyPending;
  const listings = isSupabaseMode ? portableListings : legacyListings;
  const refreshPortable = () => { portableOverview.refetch(); portablePending.refetch(); portableListings.refetch(); };
  const legacyReview = trpc.marketplace.admin.reviewVerification.useMutation({ onSuccess: () => { utils.marketplace.admin.overview.invalidate(); utils.marketplace.admin.pendingVerifications.invalidate(); utils.marketplace.profile.mine.invalidate(); utils.marketplace.verification.mine.invalidate(); utils.marketplace.listings.detail.invalidate(); } });
  const legacyModerate = trpc.marketplace.listings.moderate.useMutation({ onSuccess: () => { utils.marketplace.admin.listings.invalidate(); utils.marketplace.admin.overview.invalidate(); } });
  const portableReview = useMutation({ mutationFn: reviewPortableVerification, onSuccess: refreshPortable });
  const portableModerate = useMutation({ mutationFn: moderatePortableListing, onSuccess: refreshPortable });
  const [confirmedDossiers, setConfirmedDossiers] = useState<Record<string, boolean>>({});
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [reviewIssue, setReviewIssue] = useState<Record<string, string>>({});
  const [proofIssue, setProofIssue] = useState<string>();

  const reviewPending = isSupabaseMode ? portableReview.isPending : legacyReview.isPending;
  const reviewError = isSupabaseMode ? portableReview.error : legacyReview.error;
  const moderate = (listingId: string | number, status: "published" | "hidden" | "removed") => {
    if (isSupabaseMode) portableModerate.mutate({ listingId: String(listingId), status });
    else legacyModerate.mutate({ listingId: Number(listingId), status });
  };
  const decide = (verificationId: string | number, decision: "approved" | "rejected") => {
    const id = String(verificationId);
    const note = rejectionNotes[id]?.trim() ?? "";
    if (decision === "rejected" && note.length < 8) {
      setReviewIssue(current => ({ ...current, [id]: "Ajoutez un motif de refus précis (8 caractères minimum)." }));
      return;
    }
    if (decision === "approved" && !confirmedDossiers[id]) return;
    setReviewIssue(current => ({ ...current, [id]: "" }));
    if (isSupabaseMode) portableReview.mutate({ verificationId: id, decision, note, confirmedConsistent: decision === "approved" });
    else legacyReview.mutate({ verificationId: Number(verificationId), decision, note, confirmedConsistent: decision === "approved" });
  };
  const openProof = async (verificationId: string | number, proof: "document" | "selfie", legacyKey?: string) => {
    try {
      setProofIssue(undefined);
      const url = isSupabaseMode ? await getPortableAdminProofUrl(String(verificationId), proof) : storageUrl(legacyKey);
      if (!url) throw new Error("Preuve indisponible.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setProofIssue(error instanceof Error ? error.message : "Preuve privée indisponible.");
    }
  };

  if (!isSupabaseMode && user && user.role !== "admin") return <DashboardLayout><div className="admin-page"><div className="gate-card"><ShieldAlert size={31} /><h2>Accès administrateur requis.</h2><p>Ce tableau de bord est réservé aux comptes autorisés à examiner les vérifications et modérer les contenus.</p></div></div></DashboardLayout>;
  const adminError = overview.error || pending.error || listings.error;
  if (isSupabaseMode && adminError) return <DashboardLayout><div className="admin-page"><div className="gate-card"><ShieldAlert size={31} /><h2>Accès administrateur requis.</h2><p>{adminError.message || "Les données administratives ne sont pas accessibles avec cette session."}</p></div></div></DashboardLayout>;

  return <DashboardLayout><div className="admin-page"><div className="admin-heading"><p className="eyebrow eyebrow--dark">Espace de contrôle</p><h1>Supervision Afrique Marketplace</h1><p>Suivez les inscriptions, traitez les demandes de vérification et veillez à la qualité des contenus.</p></div>{overview.error ? <QueryErrorState message="Les indicateurs administratifs sont temporairement indisponibles." onRetry={() => overview.refetch()} /> : <><div className="admin-stats"><article><UsersRound /><span>Utilisateurs<strong>{overview.data?.users ?? 0}</strong></span></article><article><FileCheck2 /><span>À vérifier<strong>{overview.data?.pendingVerifications ?? 0}</strong></span></article><article><Eye /><span>Annonces<strong>{overview.data?.listings ?? 0}</strong></span></article><article><ShieldAlert /><span>À modérer<strong>{overview.data?.flaggedContent ?? 0}</strong></span></article></div><section className="admin-table-card"><header><div><h2>Vérifications à examiner</h2><p>Validez seulement après avoir comparé l’identité déclarée, le document et le selfie direct. Sans action, le dossier reste en attente.</p></div></header>{pending.error ? <QueryErrorState message="La file de vérification est indisponible." onRetry={() => pending.refetch()} /> : pending.data?.length ? <div className="admin-verifications admin-verifications--dossiers">{pending.data.map(item => { const id = String(item.id); return <article key={id}><div className="verification-dossier__identity"><strong>{item.firstName} {item.lastName}</strong><span>{item.city} · {item.phone} · {item.documentType}</span><small>Dossier #{id} · soumis le {new Date(item.createdAt).toLocaleDateString("fr-FR")}</small></div><div className="verification-dossier__proofs"><button type="button" className="button button--ghost button--small" onClick={() => openProof(item.id, "document", !isSupabaseMode ? item.documentKey : undefined)}>Voir le document</button><button type="button" className="button button--ghost button--small" onClick={() => openProof(item.id, "selfie", !isSupabaseMode ? item.selfieKey : undefined)}>Voir le selfie</button></div><label className="verification-confirm"><input type="checkbox" checked={Boolean(confirmedDossiers[id])} onChange={event => { setConfirmedDossiers(current => ({ ...current, [id]: event.target.checked })); setReviewIssue(current => ({ ...current, [id]: "" })); }} /> J’ai vérifié que le document, le selfie et les informations du profil sont cohérents.</label><textarea className="verification-note" value={rejectionNotes[id] ?? ""} onChange={event => setRejectionNotes(current => ({ ...current, [id]: event.target.value }))} placeholder="Motif obligatoire en cas de refus" rows={2} />{reviewIssue[id] && <p className="form-error">{reviewIssue[id]}</p>}<div className="admin-actions"><button className="button button--ghost button--small" onClick={() => decide(item.id, "rejected")}>Refuser avec motif</button><button disabled={!confirmedDossiers[id] || reviewPending} className="button button--gold button--small" onClick={() => decide(item.id, "approved")}><CheckCircle2 size={15} /> Valider le dossier cohérent</button></div></article>; })}</div> : <div className="empty-state">Aucun dossier en attente. Les nouvelles demandes apparaissent ici.</div>}{proofIssue && <p className="form-error">{proofIssue}</p>}{reviewError && <p className="form-error">{reviewError.message}</p>}</section><section className="admin-table-card admin-table-card--content"><header><div><h2>Modération des annonces</h2><p>Masquez ou retirez les contenus ne respectant pas les règles, puis rétablissez-les si nécessaire.</p></div></header>{listings.error ? <QueryErrorState message="La liste des annonces n’est pas disponible." onRetry={() => listings.refetch()} /> : listings.data?.length ? <div className="admin-verifications">{listings.data.map(item => <article key={item.id}><div><strong>{item.title}</strong><span>{item.category} · {item.city} · statut : {item.status}</span></div><div className="admin-actions"><button className="button button--ghost button--small" onClick={() => moderate(item.id, "published")}><Eye size={14} /> Publier</button><button className="button button--ghost button--small" onClick={() => moderate(item.id, "hidden")}><EyeOff size={14} /> Masquer</button><button className="button button--ghost button--small button--danger" onClick={() => moderate(item.id, "removed")}><Trash2 size={14} /> Retirer</button></div></article>)}</div> : <div className="empty-state">Aucune annonce à modérer actuellement.</div>}</section></>}</div></DashboardLayout>;
}
