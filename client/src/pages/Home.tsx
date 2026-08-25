import { ArrowRight, Building2, CarFront, ChevronRight, CircleCheckBig, MapPin, Search, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { QueryErrorState } from "@/components/QueryErrorState";
import { trpc } from "@/lib/trpc";
import { listingsHref } from "@/lib/listingFilters";

const categories = [
  { id: "immobilier", label: "Immobilier", copy: "Habiter, louer, investir", icon: Building2 },
  { id: "vehicules", label: "Véhicules", copy: "Trouver le bon trajet", icon: CarFront },
  { id: "telephones", label: "Téléphones", copy: "Rester connecté", icon: Smartphone },
];

function price(value: string | number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value)) + ` ${currency}`;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const filters = useMemo(() => ({ query: query || undefined, city: city || undefined, category: category || undefined }), [query, city, category]);
  const explorerHref = listingsHref({ query, city, category });
  const listings = trpc.marketplace.listings.search.useQuery(filters);

  return (
    <MarketplaceShell>
      <section className="hero-section">
        <div className="hero-noise" />
        <div className="page-wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={15} /> Une place de marché pensée pour l’Afrique</p>
            <h1>Ce qui compte mérite <em>confiance.</em></h1>
            <p className="hero-copy__lead">Achetez, vendez et échangez avec des profils dont l’identité est vérifiée. Une expérience africaine, élégante et conçue pour aller à l’essentiel.</p>
            <div className="trust-row"><span><ShieldCheck size={17} /> Identité contrôlée</span><span><CircleCheckBig size={17} /> Transactions plus sereines</span></div>
          </div>
          <aside className="discovery-panel" aria-label="Recherche d’annonces">
            <p className="discovery-panel__label">Trouver une opportunité</p>
            <label className="field-with-icon"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Que recherchez-vous ?" /></label>
            <label className="field-with-icon"><MapPin size={18} /><input value={city} onChange={event => setCity(event.target.value)} placeholder="Ville ou région" /></label>
            <select value={category} onChange={event => setCategory(event.target.value)} aria-label="Catégorie">
              <option value="">Toutes les catégories</option>
              {categories.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
            </select>
            <Link href={explorerHref} className="button button--gold button--wide">Explorer les annonces <ArrowRight size={17} /></Link>
          </aside>
        </div>
      </section>

      <section className="page-wrap section-space">
        <div className="section-heading"><div><p className="eyebrow eyebrow--dark">Choisir son univers</p><h2>Une recherche qui respecte votre temps.</h2></div><Link href="/annonces" className="text-link">Voir tout <ChevronRight size={17} /></Link></div>
        <div className="category-grid">
          {categories.map(item => <Link href={`/annonces?category=${item.id}`} className="category-card" key={item.id}><item.icon size={31} strokeWidth={1.5} /><div><strong>{item.label}</strong><span>{item.copy}</span></div><ChevronRight size={18} /></Link>)}
        </div>
      </section>

      <section className="page-wrap section-space section-space--compact">
        <div className="section-heading"><div><p className="eyebrow eyebrow--dark">Au plus près de vos besoins</p><h2>Les annonces disponibles.</h2></div><span className="results-count">{listings.data?.length ?? 0} résultat{(listings.data?.length ?? 0) > 1 ? "s" : ""}</span></div>
        {listings.error ? <QueryErrorState message="Les annonces n’ont pas pu être chargées pour le moment." onRetry={() => listings.refetch()} /> : listings.isLoading ? <div className="empty-state">Chargement des opportunités disponibles…</div> : listings.data?.length ? <div className="listing-grid">{listings.data.map(listing => <Link href={`/annonce/${listing.id}`} className="listing-card" key={listing.id}><div className="listing-card__media">{listing.media?.[0]?.kind === "video" ? <video src={`/manus-storage/${listing.media[0].key}`} muted /> : listing.media?.[0]?.key ? <img src={`/manus-storage/${listing.media[0].key}`} alt="" /> : <div className="media-placeholder"><Sparkles /></div>}</div><div className="listing-card__body"><span>{listing.category}</span><h3>{listing.title}</h3><p><MapPin size={14} /> {listing.city}</p><strong>{price(listing.price, listing.currency)}</strong></div></Link>)}</div> : <div className="empty-state empty-state--bordered"><Sparkles size={25} /><h3>La marketplace prend vie.</h3><p>Aucune annonce ne correspond encore à cette recherche. Ajustez vos critères ou revenez prochainement.</p></div>}
      </section>

      <section className="trust-banner"><div className="page-wrap trust-banner__inner"><ShieldCheck size={38} /><div><p className="eyebrow">Votre sécurité, sans compromis</p><h2>Un profil vérifié avant de publier.</h2><p>La vérification par pièce d’identité et selfie en direct crée un environnement plus fiable pour chaque échange.</p></div><Link href="/profil" className="button button--light">Créer mon profil <ArrowRight size={17} /></Link></div></section>
    </MarketplaceShell>
  );
}
