import { useAuth } from "@/_core/hooks/useAuth";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { QueryErrorState } from "@/components/QueryErrorState";
import { storageUrl } from "@/lib/media";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, Heart, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function FollowedSellers() {
  const { isAuthenticated } = useAuth();
  const followed = trpc.marketplace.follows.mine.useQuery(undefined, { enabled: isAuthenticated, refetchOnWindowFocus: true });

  if (!isAuthenticated) return <MarketplaceShell title="Mes suivis"><section className="page-wrap section-space"><div className="gate-card"><Heart size={28} /><h2>Retrouvez vos vendeurs suivis.</h2><p>Connectez-vous pour conserver les profils qui vous intéressent et accéder rapidement à leurs nouvelles annonces.</p><Link href="/compte" className="button button--gold">Se connecter</Link></div></section></MarketplaceShell>;
  if (followed.isLoading) return <MarketplaceShell title="Mes suivis"><section className="page-wrap section-space"><div className="empty-state">Chargement de vos vendeurs suivis…</div></section></MarketplaceShell>;
  if (followed.error) return <MarketplaceShell title="Mes suivis"><section className="page-wrap section-space"><QueryErrorState message="Vos vendeurs suivis ne sont pas disponibles pour le moment." onRetry={() => followed.refetch()} /></section></MarketplaceShell>;
  return <MarketplaceShell title="Mes suivis"><section className="page-wrap section-space"><div className="followed-sellers-heading"><p className="eyebrow eyebrow--dark">Ma sélection</p><h2>Vendeurs suivis</h2><p>Retrouvez les profils vérifiés que vous avez choisi de suivre.</p></div>{followed.data?.length ? <div className="followed-seller-grid">{followed.data.map(seller => <Link href={`/vendeur/${seller.userId}`} key={seller.userId} className="followed-seller-card"><div className="followed-seller-card__avatar">{seller.profilePhotoKey ? <img src={storageUrl(seller.profilePhotoKey)} alt="" /> : seller.firstName.charAt(0)}</div><div><span><BadgeCheck size={14} /> Profil vérifié</span><strong>{seller.firstName} {seller.lastName}</strong><small><MapPin size={13} /> {seller.city}</small>{seller.businessCategory && <em>{seller.businessCategory}</em>}</div></Link>)}</div> : <div className="empty-state empty-state--bordered"><Heart size={28} /><h3>Aucun vendeur suivi pour le moment.</h3><p>Depuis une fiche vendeur, utilisez le bouton « Suivre » pour la retrouver ici.</p><Link href="/annonces" className="button button--gold button--small">Explorer les annonces</Link></div>}</section></MarketplaceShell>;
}
