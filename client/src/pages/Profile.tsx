import { useAuth } from "@/_core/hooks/useAuth";
import { fileToDataUrl, mediaErrorMessage, storageUrl } from "@/lib/media";
import { trpc } from "@/lib/trpc";
import { Camera, CheckCircle2, ChevronRight, ImagePlus, Loader2, LockKeyhole, MapPin, ShieldAlert, ShieldCheck, UploadCloud } from "lucide-react";
import { type ChangeEvent, useState } from "react";
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
  const profile = trpc.marketplace.profile.mine.useQuery(undefined, { enabled: isAuthenticated });
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", city: "", password: "" });
  const [coverIssue, setCoverIssue] = useState<string>();
  const register = trpc.marketplace.profile.register.useMutation({ onSuccess: () => utils.marketplace.profile.mine.invalidate() });
  const cover = trpc.marketplace.profile.uploadCover.useMutation({ onSuccess: () => utils.marketplace.profile.mine.invalidate() });

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

  const data = profile.data;
  return <MarketplaceShell title="Mon profil" action={data ? <VerificationState state={data.verificationStatus} /> : undefined}>
    <section className="page-wrap section-space">
      {profile.error ? <QueryErrorState message="Votre profil n’a pas pu être chargé. Vérifiez votre connexion puis réessayez." onRetry={() => profile.refetch()} /> : profile.isLoading ? <div className="empty-state">Chargement de votre profil…</div> : !data ? <div className="onboarding-layout"><div className="onboarding-intro"><p className="eyebrow eyebrow--dark">Étape 1 sur 3</p><h2>Créez votre identité sur Afrique Marketplace.</h2><p>Nous utilisons votre numéro de téléphone et votre ville pour vous accompagner. Votre adresse e-mail n’est pas demandée.</p><div className="privacy-note"><ShieldCheck size={20} /><span>Vos informations restent protégées et votre profil ne sera visible qu’après le parcours de vérification.</span></div></div><form className="premium-form" onSubmit={submitProfile}><div className="form-row"><label>Prénom<input required minLength={2} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></label><label>Nom<input required minLength={2} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></label></div><label>Numéro de téléphone<input required inputMode="tel" placeholder="Ex. +221 77 000 00 00" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label><label>Ville<input required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></label><label>Mot de passe<input required type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><small>8 caractères minimum. Il est chiffré avant enregistrement.</small></label>{register.error && <p className="form-error">{register.error.message}</p>}<button className="button button--gold button--wide" disabled={register.isPending}>{register.isPending ? "Création…" : "Créer mon profil"} <ChevronRight size={17} /></button></form></div> : <div className="profile-layout"><article className="profile-card"><div className="profile-cover">{data.coverPhotoKey ? <img src={storageUrl(data.coverPhotoKey)} alt="Photo de couverture" /> : <div className="profile-cover__empty" />}</div><div className="profile-card__main"><div className="profile-avatar">{data.profilePhotoKey ? <img src={storageUrl(data.profilePhotoKey)} alt="Photo de profil" /> : <span>{data.firstName.charAt(0)}{data.lastName.charAt(0)}</span>}</div><div><h2>{data.firstName} {data.lastName}</h2><p><MapPin size={15} /> {data.city}</p><VerificationState state={data.verificationStatus} /></div></div><div className="cover-actions"><label className="button button--outline button--small"><ImagePlus size={16} /> Galerie<input type="file" accept="image/*" onChange={uploadCover} hidden /></label><label className="button button--outline button--small"><Camera size={16} /> Appareil photo<input type="file" accept="image/*" capture="environment" onChange={uploadCover} hidden /></label></div>{coverIssue && <p className="form-error">{coverIssue}</p>}{cover.error && <p className="form-error">{cover.error.message.includes("too_big") ? "La couverture est trop lourde. Reprenez une image plus simple." : cover.error.message}</p>}</article><aside className="profile-steps"><p className="eyebrow eyebrow--dark">Parcours de confiance</p><h3>Votre profil se construit en trois gestes.</h3><div className="step-item step-item--complete"><CheckCircle2 /><span><strong>Profil renseigné</strong><small>Identité et ville ajoutées</small></span></div><div className={data.verificationStatus === "verified" ? "step-item step-item--complete" : "step-item"}><ShieldCheck /><span><strong>Vérification d’identité</strong><small>Document + selfie pris en direct</small></span>{data.verificationStatus !== "verified" && <Link href="/verification" className="text-link">Continuer <ChevronRight size={15} /></Link>}</div><div className={data.coverPhotoKey ? "step-item step-item--complete" : "step-item"}><UploadCloud /><span><strong>Couverture personnelle</strong><small>Depuis votre galerie ou caméra</small></span></div></aside></div>}
    </section>
  </MarketplaceShell>;
}
