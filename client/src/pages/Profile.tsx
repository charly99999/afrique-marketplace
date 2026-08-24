import { useAuth } from "@/_core/hooks/useAuth";
import { fileToDataUrl, mediaErrorMessage, storageUrl } from "@/lib/media";
import { trpc } from "@/lib/trpc";
import { BriefcaseBusiness, Camera, CheckCircle2, ChevronRight, Clock3, ExternalLink, FileText, ImagePlus, Loader2, LockKeyhole, Mail, MapPin, Pencil, Phone, Save, ShieldAlert, ShieldCheck, UploadCloud, X } from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";
import { Link } from "wouter";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { QueryErrorState } from "@/components/QueryErrorState";

function VerificationState({ state }: { state?: string }) {
  if (state === "verified") return <span className="status-chip status-chip--verified"><ShieldCheck size={15} /> Profil vérifié</span>;
  if (state === "pending") return <span className="status-chip status-chip--pending"><Loader2 size={15} /> Vérification en cours</span>;
  if (state === "rejected") return <span className="status-chip status-chip--warning"><ShieldAlert size={15} /> Nouvelle soumission requise</span>;
  return <span className="status-chip status-chip--required"><LockKeyhole size={15} /> Vérification obligatoire</span>;
}

export default function Profile() {
  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();
  const profile = trpc.marketplace.profile.mine.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 3000, refetchOnWindowFocus: true });
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", city: "", password: "" });
  const [details, setDetails] = useState({ bio: "", businessCategory: "", businessHours: "", address: "", website: "", contactEmail: "" });
  const [editingDetails, setEditingDetails] = useState(false);
  const [coverIssue, setCoverIssue] = useState<string>();
  const register = trpc.marketplace.profile.register.useMutation({ onSuccess: () => utils.marketplace.profile.mine.invalidate() });
  const cover = trpc.marketplace.profile.uploadCover.useMutation({ onSuccess: () => utils.marketplace.profile.mine.invalidate() });
  const updateDetails = trpc.marketplace.profile.updateDetails.useMutation({ onSuccess: () => { utils.marketplace.profile.mine.invalidate(); setEditingDetails(false); } });
  const memberListings = trpc.marketplace.listings.mine.useQuery(undefined, { enabled: isAuthenticated, refetchOnWindowFocus: true });
  const data = profile.data;

  useEffect(() => {
    if (!data) return;
    setDetails({
      bio: data.bio ?? "",
      businessCategory: data.businessCategory ?? "",
      businessHours: data.businessHours ?? "",
      address: data.address ?? "",
      website: data.website ?? "",
      contactEmail: data.contactEmail ?? "",
    });
  }, [data]);

  const submitProfile = (event: React.FormEvent) => {
    event.preventDefault();
    register.mutate(form);
  };
  const uploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setCoverIssue(undefined);
      cover.mutate({ dataUrl: await fileToDataUrl(file) });
    } catch (error) {
      setCoverIssue(mediaErrorMessage(error));
    }
    event.target.value = "";
  };

  if (!isAuthenticated) return <MarketplaceShell title="Mon espace"><section className="page-wrap section-space"><div className="gate-card"><LockKeyhole size={28} /><h2>Votre espace sécurisé vous attend.</h2><p>Accédez à votre profil pour finaliser votre inscription sans e-mail et enclencher la vérification obligatoire.</p><Link href="/compte" className="button button--gold">Continuer</Link></div></section></MarketplaceShell>;

  return <MarketplaceShell title="Mon profil" action={data ? <VerificationState state={data.verificationStatus} /> : undefined}>
    <section className="page-wrap section-space">
      {profile.error ? <QueryErrorState message="Votre profil n’a pas pu être chargé. Vérifiez votre connexion puis réessayez." onRetry={() => profile.refetch()} /> : profile.isLoading ? <div className="empty-state">Chargement de votre profil…</div> : !data ? <div className="onboarding-layout"><div className="onboarding-intro"><p className="eyebrow eyebrow--dark">Étape 1 sur 3</p><h2>Créez votre identité sur Afrique Marketplace.</h2><p>Nous utilisons votre numéro de téléphone et votre ville pour vous accompagner. Votre adresse e-mail n’est pas demandée.</p><div className="privacy-note"><ShieldCheck size={20} /><span>Vos informations restent protégées et votre profil ne sera visible qu’après le parcours de vérification.</span></div></div><form className="premium-form" onSubmit={submitProfile}><div className="form-row"><label>Prénom<input required minLength={2} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></label><label>Nom<input required minLength={2} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></label></div><label>Numéro de téléphone<input required inputMode="tel" placeholder="Ex. +221 77 000 00 00" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label><label>Ville<input required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></label><label>Mot de passe<input required type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><small>8 caractères minimum. Il est chiffré avant enregistrement.</small></label>{register.error && <p className="form-error">{register.error.message}</p>}<button className="button button--gold button--wide" disabled={register.isPending}>{register.isPending ? "Création…" : "Créer mon profil"} <ChevronRight size={17} /></button></form></div> : <div className="profile-detail-layout"><article className="profile-showcase"><div className="profile-cover profile-cover--detail">{data.coverPhotoKey ? <img src={storageUrl(data.coverPhotoKey)} alt="Photo de couverture" /> : <div className="profile-cover__empty" />}</div><div className="profile-showcase__content"><div className="profile-avatar profile-avatar--detail">{data.profilePhotoKey ? <img src={storageUrl(data.profilePhotoKey)} alt="Photo de profil" /> : <span>{data.firstName.charAt(0)}{data.lastName.charAt(0)}</span>}</div><div className="profile-showcase__identity"><div className="profile-showcase__title"><h2>{data.firstName} {data.lastName}</h2><VerificationState state={data.verificationStatus} /></div><p className="profile-activity"><BriefcaseBusiness size={17} /> {data.businessCategory || "Membre de la communauté Afrique Marketplace"}</p>{data.bio ? <p className="profile-bio">{data.bio}</p> : <p className="profile-bio profile-bio--placeholder">Ajoutez une courte présentation pour inspirer confiance à vos acheteurs et vendeurs.</p>}<div className="profile-showcase__actions"><button type="button" className="button button--outline button--small" onClick={() => setEditingDetails(value => !value)}>{editingDetails ? <><X size={16} /> Fermer</> : <><Pencil size={16} /> Modifier mes informations</>}</button><label className="button button--outline button--small"><ImagePlus size={16} /> Galerie<input type="file" accept="image/*" onChange={uploadCover} hidden /></label><label className="button button--outline button--small"><Camera size={16} /> Couverture<input type="file" accept="image/*" capture="environment" onChange={uploadCover} hidden /></label></div></div></div>{coverIssue && <p className="form-error">{coverIssue}</p>}{cover.error && <p className="form-error">{cover.error.message.includes("too_big") ? "La couverture est trop lourde. Reprenez une image plus simple." : cover.error.message}</p>}<nav className="profile-tabs" aria-label="Sections du profil"><a href="#profil-a-propos">À propos</a><a href="#profil-coordonnees">Coordonnées</a><a href="#profil-activite">Activité</a></nav></article><div className="profile-detail-grid"><div className="profile-detail-main">{editingDetails ? <form className="profile-details-form" onSubmit={event => { event.preventDefault(); updateDetails.mutate(details); }}><div className="profile-section__heading"><div><p className="eyebrow eyebrow--dark">Personnaliser</p><h3>Présentez votre activité</h3></div></div><label>Présentation<textarea rows={4} maxLength={500} placeholder="Ex. Entrepreneur, spécialiste immobilier, vendeur de téléphones…" value={details.bio} onChange={event => setDetails({ ...details, bio: event.target.value })} /></label><div className="form-row"><label>Activité<input maxLength={100} placeholder="Ex. Immobilier" value={details.businessCategory} onChange={event => setDetails({ ...details, businessCategory: event.target.value })} /></label><label>Horaires<input maxLength={120} placeholder="Ex. Lun–Sam · 08h–18h" value={details.businessHours} onChange={event => setDetails({ ...details, businessHours: event.target.value })} /></label></div><label>Adresse ou zone d’activité<input maxLength={180} placeholder="Ex. Cocody, Abidjan" value={details.address} onChange={event => setDetails({ ...details, address: event.target.value })} /></label><div className="form-row"><label>Site web<input inputMode="url" placeholder="https://votre-site.com" value={details.website} onChange={event => setDetails({ ...details, website: event.target.value })} /></label><label>E-mail de contact<input inputMode="email" placeholder="contact@votre-activite.com" value={details.contactEmail} onChange={event => setDetails({ ...details, contactEmail: event.target.value })} /></label></div>{updateDetails.error && <p className="form-error">{updateDetails.error.message}</p>}<button className="button button--gold" disabled={updateDetails.isPending}><Save size={16} /> {updateDetails.isPending ? "Enregistrement…" : "Enregistrer les informations"}</button></form> : <><section className="profile-section" id="profil-a-propos"><div className="profile-section__heading"><div><p className="eyebrow eyebrow--dark">À propos</p><h3>Une présence claire et vérifiable.</h3></div><FileText size={22} /></div><p>{data.bio || "Cette présentation sera visible lorsque vous l’aurez ajoutée. Les informations d’identité restent protégées."}</p></section><section className="profile-section" id="profil-activite"><div className="profile-section__heading"><div><p className="eyebrow eyebrow--dark">Toutes les annonces</p><h3>{memberListings.isLoading ? "Chargement de vos publications…" : memberListings.data?.length ? `${memberListings.data.length} publication${memberListings.data.length > 1 ? "s" : ""} enregistrée${memberListings.data.length > 1 ? "s" : ""}.` : "Vos publications apparaîtront ici."}</h3></div><BriefcaseBusiness size={22} /></div>{memberListings.error ? <p className="form-error">Vos annonces ne peuvent pas être chargées pour le moment.</p> : memberListings.isLoading ? <div className="profile-listings-loading">Chargement sécurisé de vos annonces…</div> : memberListings.data?.length ? <div className="profile-listings-grid">{memberListings.data.map(listing => <Link key={listing.id} href={`/annonce/${listing.id}`} className="profile-listing-card"><div className="profile-listing-card__media">{listing.media[0]?.kind === "video" ? <video src={storageUrl(listing.media[0].key)} muted /> : listing.media[0] ? <img src={storageUrl(listing.media[0].key)} alt="Média de l’annonce" /> : <BriefcaseBusiness size={25} />}</div><div><span>{listing.status === "published" ? "Publié" : listing.status === "hidden" ? "Masqué" : "Retiré"}</span><strong>{listing.title}</strong><small>{listing.city} · {Number(listing.price).toLocaleString("fr-FR")} {listing.currency}</small></div></Link>)}</div> : <><p>Créez votre première annonce vérifiée pour présenter vos produits ou services à la communauté.</p><Link href="/vendre" className="button button--gold button--small">Publier une annonce <ChevronRight size={16} /></Link></>}</section></>}</div><aside className="profile-info-panel" id="profil-coordonnees"><p className="eyebrow eyebrow--dark">Informations</p><h3>Coordonnées</h3><div className="profile-info-row"><Clock3 size={19} /><span><strong>Disponibilité</strong><small>{data.businessHours || "À renseigner"}</small></span></div><div className="profile-info-row"><MapPin size={19} /><span><strong>Localisation</strong><small>{data.address || data.city}</small></span></div><div className="profile-info-row"><Phone size={19} /><span><strong>Téléphone</strong><small>{data.verificationStatus === "verified" ? data.phone : "Visible après vérification"}</small></span></div><div className="profile-info-row"><Mail size={19} /><span><strong>E-mail</strong><small>{data.contactEmail || "À renseigner"}</small></span></div>{data.website && <a className="profile-info-row profile-info-row--link" href={data.website} target="_blank" rel="noreferrer"><ExternalLink size={19} /><span><strong>Site web</strong><small>{data.website.replace(/^https?:\/\//, "")}</small></span></a>}<div className="profile-trust-note"><ShieldCheck size={19} /><span>Vos coordonnées ne sont jamais utilisées pour la connexion publique. Le contact par téléphone reste réservé aux profils vérifiés.</span></div></aside></div></div>}
    </section>
  </MarketplaceShell>;
}
