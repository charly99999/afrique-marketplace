import { useAuth } from "@/_core/hooks/useAuth";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { QueryErrorState } from "@/components/QueryErrorState";
import { storageUrl } from "@/lib/media";
import { trpc } from "@/lib/trpc";
import { directCallHref } from "@shared/marketplace";
import { BadgeCheck, ChevronLeft, MapPin, MessageCircle, Phone, ShieldCheck, Video } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

function formatPrice(value: string | number, currency: string) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value)) + ` ${currency}`; }

export default function ListingDetail({ id }: { id: string }) {
  const listingId = Number(id);
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const data = trpc.marketplace.listings.detail.useQuery({ id: listingId }, { enabled: Number.isFinite(listingId), refetchInterval: 3000, refetchOnWindowFocus: true });
  const [message, setMessage] = useState("");
  const send = trpc.marketplace.conversations.send.useMutation();
  const listing = data.data?.listing;
  const seller = data.data?.seller;
  if (data.isLoading) return <MarketplaceShell><section className="page-wrap section-space"><div className="empty-state">Chargement de l’annonce…</div></section></MarketplaceShell>;
  if (data.error) return <MarketplaceShell><section className="page-wrap section-space"><QueryErrorState message="Le détail de cette annonce n’est pas disponible pour le moment." onRetry={() => data.refetch()} /></section></MarketplaceShell>;
  if (!listing || !seller) return <MarketplaceShell><section className="page-wrap section-space"><div className="gate-card"><h2>Cette annonce n’est plus disponible.</h2><Link href="/annonces" className="button button--gold">Voir les annonces</Link></div></section></MarketplaceShell>;
  const contact = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) return navigate("/compte");
    if (!message.trim()) return;
    send.mutate({ recipientId: listing.userId, listingId: listing.id, body: message });
  };
  const callHref = seller.phone ? directCallHref(seller.phone) : null;
  return <MarketplaceShell><section className="page-wrap section-space detail-page"><Link href="/annonces" className="back-link"><ChevronLeft size={17} /> Retour aux annonces</Link><div className="detail-grid"><div className="detail-media">{listing.media?.[0]?.kind === "video" ? <video src={storageUrl(listing.media[0].key)} controls /> : listing.media?.[0]?.key ? <img src={storageUrl(listing.media[0].key)} alt={listing.title} /> : <div className="media-placeholder">Aucun média</div>}</div><div className="detail-summary"><span className="listing-tag">{listing.category}</span><h1>{listing.title}</h1><p className="detail-location"><MapPin size={16} /> {listing.city} · {listing.condition.replaceAll("_", " ")}</p><strong className="detail-price">{formatPrice(listing.price, listing.currency)}</strong><div className="seller-card"><div className="seller-avatar">{seller.profilePhotoKey ? <img src={storageUrl(seller.profilePhotoKey)} alt="" /> : seller.firstName.charAt(0)}</div><div><p>Publié par</p><strong>{seller.firstName}</strong><span><MapPin size={12} /> {seller.city}</span></div>{seller.verificationStatus === "verified" && <span className="seller-verified"><BadgeCheck size={16} /> Vérifié</span>}</div>{seller.verificationStatus === "verified" && seller.phone && callHref && <a className="direct-call" href={callHref}><Phone size={18} /><span><small>Numéro du vendeur vérifié</small><strong>{seller.phone}</strong></span><span>Appeler</span></a>}{user?.id === listing.userId ? <p className="own-listing-note">Ceci est votre annonce.</p> : <form className="contact-form" onSubmit={contact}><label>Écrire au vendeur<textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Bonjour, votre annonce est-elle toujours disponible ?" rows={3} /></label>{send.isSuccess && <p className="form-success">Votre message a été envoyé. Retrouvez l’échange dans vos messages.</p>}{send.error && <p className="form-error">{send.error?.message}</p>}<button className="button button--gold button--wide"><MessageCircle size={17} /> {isAuthenticated ? "Envoyer mon message" : "Se connecter pour contacter"}</button></form>}<div className="call-disclosure"><ShieldCheck size={18} /><span>Le numéro est affiché seulement pour les vendeurs vérifiés. L’appel s’effectue directement depuis votre téléphone.</span></div></div></div></section></MarketplaceShell>;
}
