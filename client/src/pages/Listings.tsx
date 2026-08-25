import { MarketplaceShell } from "@/components/MarketplaceShell";
import { QueryErrorState } from "@/components/QueryErrorState";
import { trpc } from "@/lib/trpc";
import { Filter, MapPin, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { emptyListingFilters, listingFiltersFromSearch } from "@/lib/listingFilters";
import { usePublicListings } from "@/lib/usePublicListings";

const categories = ["immobilier", "vehicules", "telephones", "electronique", "mode", "emploi"];
function price(value: string | number, currency: string) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value)) + ` ${currency}`; }

export default function Listings() {
  const search = useSearch();
  const [filters, setFilters] = useState(() => listingFiltersFromSearch(search));
  useEffect(() => { setFilters(listingFiltersFromSearch(search)); }, [search]);
  const request = useMemo(() => ({ query: filters.query || undefined, category: filters.category || undefined, city: filters.city || undefined, condition: filters.condition || undefined }), [filters]);
  const results = usePublicListings(request);
  return <MarketplaceShell title="Explorer les annonces"><section className="page-wrap section-space listings-layout"><aside className="filter-card"><div className="filter-card__title"><SlidersHorizontal size={18} /> Filtres</div><label><span>Recherche</span><div className="field-with-icon"><Search size={16} /><input value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })} placeholder="Mots-clés" /></div></label><label><span>Catégorie</span><select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}><option value="">Toutes</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label><span>Localisation</span><div className="field-with-icon"><MapPin size={16} /><input value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} placeholder="Ville" /></div></label><label><span>État</span><select value={filters.condition} onChange={e => setFilters({ ...filters, condition: e.target.value })}><option value="">Tous les états</option><option value="neuf">Neuf</option><option value="comme_neuf">Comme neuf</option><option value="bon_etat">Bon état</option><option value="a_reparer">À réparer</option></select></label><button className="button button--ghost button--wide" onClick={() => setFilters(emptyListingFilters)}><Filter size={16} /> Réinitialiser</button></aside><div><div className="results-top"><p><strong>{results.data?.length ?? 0}</strong> annonce{(results.data?.length ?? 0) > 1 ? "s" : ""} trouvée{(results.data?.length ?? 0) > 1 ? "s" : ""}</p></div>{results.error ? <QueryErrorState message="La recherche n’est pas disponible pour l’instant." onRetry={() => results.refetch()} /> : results.isLoading ? <div className="empty-state">Recherche en cours…</div> : results.data?.length ? <div className="listing-grid">{results.data.map(item => <Link href={`/annonce/${item.id}`} className="listing-card" key={item.id}><div className="listing-card__media">{item.media?.[0]?.kind === "video" ? <video src={`/manus-storage/${item.media[0].key}`} muted /> : item.media?.[0]?.key ? <img src={`/manus-storage/${item.media[0].key}`} alt="" /> : <div className="media-placeholder"><Sparkles /></div>}</div><div className="listing-card__body"><span>{item.category}</span><h3>{item.title}</h3><p><MapPin size={14} /> {item.city} · {item.condition.replaceAll("_", " ")}</p><strong>{price(item.price, item.currency)}</strong></div></Link>)}</div> : <div className="empty-state empty-state--bordered"><Sparkles size={25} /><h3>Aucun résultat pour le moment.</h3><p>Essayez une autre ville, une autre catégorie ou réduisez vos critères.</p></div>}</div></section></MarketplaceShell>;
}
