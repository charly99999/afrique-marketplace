import { useAuth } from "@/_core/hooks/useAuth";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { isSupabaseMode } from "@/lib/backendMode";
import { fileToDataUrl, mediaErrorMessage } from "@/lib/media";
import { createPortableListingWithMedia, getMyPortableProfile } from "@/lib/marketplaceSupabase";
import { trpc } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ImagePlus, LockKeyhole, Video, X } from "lucide-react";
import React, { useState } from "react";
import { Link } from "wouter";

const categories = ["immobilier", "vehicules", "telephones", "electronique", "mode", "emploi"] as const;
type MediaDraft = { dataUrl: string; fileName: string };

export default function Sell() {
  const { isAuthenticated } = useAuth();
  const legacyProfile = trpc.marketplace.profile.mine.useQuery(undefined, { enabled: !isSupabaseMode && isAuthenticated });
  const portableProfile = useQuery({ queryKey: ["portable-my-profile"], queryFn: getMyPortableProfile, enabled: isSupabaseMode && isAuthenticated });
  const profile = isSupabaseMode ? portableProfile : legacyProfile;
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [mediaIssue, setMediaIssue] = useState<string>();
  const [form, setForm] = useState({ title: "", description: "", category: "immobilier" as typeof categories[number], city: "", price: "", currency: "XOF" as "XOF" | "XAF" | "MAD" | "CDF" | "GNF" | "USD", condition: "bon_etat" as "neuf" | "comme_neuf" | "bon_etat" | "a_reparer" });
  const resetAfterPublish = () => { setForm(current => ({ ...current, title: "", description: "", price: "" })); setMedia([]); };
  const legacyCreate = trpc.marketplace.listings.create.useMutation({ onSuccess: resetAfterPublish });
  const portableCreate = useMutation({ mutationFn: ({ preparedMedia, ...payload }: { preparedMedia: MediaDraft[]; title: string; description: string; category: typeof categories[number]; city: string; price: number; currency: typeof form.currency; condition: typeof form.condition }) => createPortableListingWithMedia(payload, preparedMedia), onSuccess: resetAfterPublish });

  const chooseMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 4 - media.length);
    try {
      setMediaIssue(undefined);
      const prepared = await Promise.all(files.map(async file => ({ dataUrl: await fileToDataUrl(file), fileName: file.name })));
      setMedia(current => [...current, ...prepared]);
    } catch (error) {
      setMediaIssue(mediaErrorMessage(error));
    }
    event.target.value = "";
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { ...form, price: Number(form.price) };
    if (isSupabaseMode) portableCreate.mutate({ ...payload, preparedMedia: media });
    else legacyCreate.mutate({ ...payload, mediaData: media.map(item => item.dataUrl) });
  };

  const createError = isSupabaseMode ? portableCreate.error : legacyCreate.error;
  const createPending = isSupabaseMode ? portableCreate.isPending : legacyCreate.isPending;
  const createSuccess = isSupabaseMode ? portableCreate.isSuccess : legacyCreate.isSuccess;

  if (!isAuthenticated || !profile.data) return <MarketplaceShell title="Publier"><section className="page-wrap section-space"><div className="gate-card"><LockKeyhole size={28} /><h2>Votre profil est nécessaire pour publier.</h2><p>Inscrivez-vous sans e-mail puis vérifiez votre identité avant de diffuser une annonce.</p><Link href="/profil" className="button button--gold">Créer mon profil</Link></div></section></MarketplaceShell>;
  if (profile.data.verificationStatus !== "verified") return <MarketplaceShell title="Publier"><section className="page-wrap section-space"><div className="gate-card"><LockKeyhole size={28} /><h2>La publication attend votre vérification.</h2><p>Votre profil doit être vérifié afin de protéger les acheteurs et vendeurs.</p><Link href="/verification" className="button button--gold">Vérifier mon identité</Link></div></section></MarketplaceShell>;

  return <MarketplaceShell title="Créer une annonce"><section className="page-wrap section-space sell-layout"><div className="sell-side"><p className="eyebrow eyebrow--dark">Une publication de qualité</p><h2>Présentez l’essentiel, avec clarté.</h2><p>Votre profil vérifié rassure les personnes intéressées. Décrivez honnêtement l’état, la localisation et le prix de votre annonce.</p></div><form className="premium-form listing-form" onSubmit={submit}><div className="form-row"><label>Titre<input required minLength={6} maxLength={140} value={form.title} onChange={e => setForm(current => ({ ...current, title: e.target.value }))} placeholder="Ex. Appartement lumineux à louer" /></label><label>Catégorie<select value={form.category} onChange={e => setForm(current => ({ ...current, category: e.target.value as typeof current.category }))}>{categories.map(category => <option key={category}>{category}</option>)}</select></label></div><label>Description<textarea required minLength={20} value={form.description} onChange={e => setForm(current => ({ ...current, description: e.target.value }))} placeholder="Décrivez l’offre, ses atouts et les conditions importantes…" rows={5} /></label><div className="form-row"><label>Ville<input required value={form.city} onChange={e => setForm(current => ({ ...current, city: e.target.value }))} placeholder="Ex. Dakar" /></label><label>État<select value={form.condition} onChange={e => setForm(current => ({ ...current, condition: e.target.value as typeof current.condition }))}><option value="neuf">Neuf</option><option value="comme_neuf">Comme neuf</option><option value="bon_etat">Bon état</option><option value="a_reparer">À réparer</option></select></label></div><div className="form-row"><label>Prix<input required min="0" type="number" value={form.price} onChange={e => setForm(current => ({ ...current, price: e.target.value }))} /></label><label>Devise<select value={form.currency} onChange={e => setForm(current => ({ ...current, currency: e.target.value as typeof current.currency }))}><option value="XOF">XOF</option><option value="XAF">XAF</option><option value="MAD">MAD</option><option value="CDF">CDF</option><option value="GNF">GNF</option><option value="USD">USD</option></select></label></div><div className="media-picker"><div><strong>Photos ou courte vidéo</strong><span>Jusqu’à 4 médias. Les photos sont réduites automatiquement ; limitez une vidéo à 1,8 Mo.</span></div><label className="button button--outline button--small"><ImagePlus size={16} /> Photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseMedia} hidden /></label><label className="button button--outline button--small"><Video size={16} /> Vidéo<input type="file" accept="video/mp4,video/webm" onChange={chooseMedia} hidden /></label></div>{mediaIssue && <p className="form-error">{mediaIssue}</p>}{media.length > 0 && <div className="media-preview-grid">{media.map((item, index) => <div key={`${item.dataUrl.slice(0, 25)}-${index}`}><button type="button" onClick={() => setMedia(current => current.filter((_, position) => position !== index))}><X size={15} /></button>{item.dataUrl.startsWith("data:video") ? <video src={item.dataUrl} /> : <img src={item.dataUrl} alt="Prévisualisation de l’annonce" />}</div>)}</div>}{createError && <p className="form-error">{createError.message.includes("too_big") ? "Un média est trop lourd. Choisissez une image ou une vidéo plus légère." : createError.message}</p>}{createSuccess && <p className="form-success">Votre annonce est publiée et visible dans la marketplace.</p>}<button disabled={createPending} className="button button--gold button--wide">{createPending ? "Publication…" : "Publier mon annonce"}</button></form></section></MarketplaceShell>;
}
