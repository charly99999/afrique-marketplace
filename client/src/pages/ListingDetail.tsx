import { useAuth } from "@/_core/hooks/useAuth";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { QueryErrorState } from "@/components/QueryErrorState";
import { isSupabaseMode } from "@/lib/backendMode";
import { storageUrl } from "@/lib/media";
import { getPortableFavoriteStatus, getPortableListingDetail, portableMediaUrl, reportPortableListing, setPortableFavorite, startPortableConversation } from "@/lib/marketplaceSupabase";
import { trpc } from "@/lib/trpc";
import { directCallHref } from "@shared/marketplace";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronLeft, Flag, Heart, MapPin, MessageCircle, Phone, ShieldCheck, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";

function formatPrice(value: string | number, currency: string) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value)) + ` ${currency}`; }

export default function ListingDetail({ id }: { id: string }) {
  const legacyListingId = Number(id);
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const legacyData = trpc.marketplace.listings.detail.useQuery({ id: legacyListingId }, { enabled: !isSupabaseMode && Number.isFinite(legacyListingId), refetchInterval: 3000, refetchOnWindowFocus: true });
  const portableData = useQuery({ queryKey: ["portable-listing-detail", id], queryFn: () => getPortableListingDetail(id), enabled: isSupabaseMode && Boolean(id), refetchOnWindowFocus: true });
  const data = isSupabaseMode ? portableData : legacyData;
  const [message, setMessage] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<"fraud" | "prohibited" | "inaccurate" | "harassment" | "other">("fraud");
  const [reportDetails, setReportDetails] = useState("");
  const legacySend = trpc.marketplace.conversations.send.useMutation({ onSuccess: () => setMessage("") });
  const portableSend = useMutation({ mutationFn: startPortableConversation, onSuccess: () => setMessage("") });
  const favoriteQuery = useQuery({ queryKey: ["portable-listing-favorite", id], queryFn: () => getPortableFavoriteStatus(id), enabled: isSupabaseMode && isAuthenticated && Boolean(id) });
  const favoriteMutation = useMutation({ mutationFn: ({ favorite }: { favorite: boolean }) => setPortableFavorite(id, favorite), onSuccess: value => favoriteQuery.refetch().then(() => value) });
  const reportMutation = useMutation({ mutationFn: reportPortableListing, onSuccess: () => { setReportOpen(false); setReportDetails(""); } });
  const listing = data.data?.listing;
  const seller = data.data?.seller;
  const isSending = isSupabaseMode ? portableSend.isPending : legacySend.isPending;
  const sendError = isSupabaseMode ? portableSend.error : legacySend.error;
  const sendSuccess = isSupabaseMode ? portableSend.isSuccess : legacySend.isSuccess;
  const mediaUrl = isSupabaseMode ? portableMediaUrl : storageUrl;
  if (data.isLoading) return <MarketplaceShell><section className="page-wrap section-space"><div className="empty-state">Chargement de l’annonce…</div></section></MarketplaceShell>;
  if (data.error) return <MarketplaceShell><section className="page-wrap section-space"><QueryErrorState message="Le détail de cette annonce n’est pas disponible pour le moment." onRetry={() => data.refetch()} /></section></MarketplaceShell>;
  if (!listing || !seller) return <MarketplaceShell><section className="page-wrap section-space"><div className="gate-card"><h2>Cette annonce n’est plus disponible.</h2><Link href="/annonces" className="button button--gold">Voir les annonces</Link></div></section></MarketplaceShell>;
  const contact = (event: FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) return navigate("/compte");
    if (!message.trim()) return;
    if (isSupabaseMode) portableSend.mutate({ sellerId: String(listing.userId), listingId: String(listing.id), body: message });
    else legacySend.mutate({ recipientId: Number(listing.userId), listingId: Number(listing.id), body: message });
  };
  const callHref = seller.phone ? directCallHref(seller.phone) : null;
  const isFavorite = favoriteQuery.data ?? false;
  const toggleFavorite = () => {
    if (!isAuthenticated) return navigate("/compte");
    favoriteMutation.mutate({ favorite: !isFavorite });
  };
  const submitReport = (event: FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) return navigate("/compte");
    reportMutation.mutate({ listingId: id, reason: reportReason, details: reportDetails });
  };
  const isOwnListing = String(user?.id ?? "") === String(listing.userId);
  return <MarketplaceShell><section className="page-wrap section-space detail-page"><Link href="/annonces" className="back-link"><ChevronLeft size={17} /> Retour aux annonces</Link><div className="detail-grid"><div className="detail-media">{listing.media?.[0]?.kind === "video" ? <video src={mediaUrl(listing.media[0].key)} controls /> : listing.media?.[0]?.key ? <img src={mediaUrl(listing.media[0].key)} alt={listing.title} /> : <div className="media-placeholder">Aucun média</div>}</div><div className="detail-summary"><span className="listing-tag">{listing.category}</span><h1>{listing.title}</h1><p className="detail-location"><MapPin size={16} /> {listing.city} · {listing.condition.replaceAll("_", " ")}</p><strong className="detail-price">{formatPrice(listing.price, listing.currency)}</strong><div className="detail-trust-actions"><button type="button" className="button button--outline button--small" onClick={toggleFavorite} disabled={favoriteMutation.isPending}><Heart size={16} fill={isFavorite ? "currentColor" : "none"} /> {isFavorite ? "Enregistrée" : "Enregistrer"}</button><button type="button" className="button button--ghost button--small" onClick={() => isAuthenticated ? setReportOpen(value => !value) : navigate("/compte")}><Flag size={16} /> Signaler</button></div><Link href={`/vendeur/${listing.userId}`} className="seller-card seller-card--link"><div className="seller-avatar">{seller.profilePhotoKey ? <img src={mediaUrl(seller.profilePhotoKey)} alt="" /> : seller.firstName.charAt(0)}</div><div><p>Voir le profil de</p><strong>{seller.firstName}</strong><span><MapPin size={12} /> {seller.city}</span></div>{seller.verificationStatus === "verified" && <span className="seller-verified"><BadgeCheck size={16} /> Vérifié</span>}</Link>{seller.verificationStatus === "verified" && seller.phone && callHref && <a className="direct-call" href={callHref}><Phone size={18} /><span><small>Numéro du vendeur vérifié</small><strong>{seller.phone}</strong></span><span>Appeler</span></a>}{reportOpen && <form className="listing-report-form" onSubmit={submitReport}><div className="listing-report-form__heading"><strong>Signaler cette annonce</strong><button type="button" className="icon-button" aria-label="Fermer le signalement" onClick={() => setReportOpen(false)}><X size={16} /></button></div><label>Motif<select value={reportReason} onChange={event => setReportReason(event.target.value as typeof reportReason)}><option value="fraud">Fraude ou arnaque</option><option value="prohibited">Produit interdit</option><option value="inaccurate">Informations inexactes</option><option value="harassment">Harcèlement</option><option value="other">Autre</option></select></label><label>Précisions facultatives<textarea value={reportDetails} onChange={event => setReportDetails(event.target.value)} maxLength={1000} rows={3} placeholder="Décrivez brièvement le problème…" /></label>{reportMutation.error && <p className="form-error">{reportMutation.error.message}</p>}{reportMutation.isSuccess && <p className="form-success">Votre signalement a été transmis à la modération.</p>}<button className="button button--gold button--wide" disabled={reportMutation.isPending}>{reportMutation.isPending ? "Envoi…" : "Envoyer le signalement"}</button></form>}{isOwnListing ? <p className="own-listing-note">Ceci est votre annonce.</p> : <form className="contact-form" onSubmit={contact}><label>Écrire au vendeur<textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Bonjour, votre annonce est-elle toujours disponible ?" rows={3} /></label>{sendSuccess && <p className="form-success">Votre message a été envoyé. Retrouvez l’échange dans vos messages.</p>}{sendError && <p className="form-error">{sendError.message}</p>}<button className="button button--gold button--wide" disabled={isSending}><MessageCircle size={17} /> {isSending ? "Envoi…" : isAuthenticated ? "Envoyer mon message" : "Se connecter pour contacter"}</button></form>}<div className="call-disclosure"><ShieldCheck size={18} /><span>Le numéro est affiché seulement pour les vendeurs vérifiés. L’appel s’effectue directement depuis votre téléphone.</span></div></div></div></section></MarketplaceShell>;
}
