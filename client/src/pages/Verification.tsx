import { useAuth } from "@/_core/hooks/useAuth";
import { CameraCapture } from "@/components/CameraCapture";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { QueryErrorState } from "@/components/QueryErrorState";
import { fileToDataUrl, mediaErrorMessage } from "@/lib/media";
import { trpc } from "@/lib/trpc";
import { FileCheck2, LockKeyhole, ScanFace, ShieldCheck, Upload } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Verification() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const profile = trpc.marketplace.profile.mine.useQuery(undefined, { enabled: isAuthenticated });
  const existing = trpc.marketplace.verification.mine.useQuery(undefined, { enabled: isAuthenticated });
  const [documentType, setDocumentType] = useState<"cni" | "passeport" | "permis" | "carte_scolaire">("cni");
  const [documentData, setDocumentData] = useState<string>();
  const [selfieData, setSelfieData] = useState<string>();
  const [mediaIssue, setMediaIssue] = useState<string>();
  const submit = trpc.marketplace.verification.submit.useMutation({ onSuccess: () => { utils.marketplace.verification.mine.invalidate(); utils.marketplace.profile.mine.invalidate(); } });

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
    if (documentData && selfieData) submit.mutate({ documentType, documentData, selfieData });
  };
  const submitMessage = submit.error?.message.includes("too_big") || submit.error?.message.includes("3000000")
    ? "Une photo est encore trop lourde. Reprenez le document ou le selfie : ils seront compressés automatiquement."
    : submit.error?.message;

  if (profile.error || existing.error) return <MarketplaceShell title="Vérification"><section className="page-wrap section-space"><QueryErrorState message="Le statut de votre vérification est indisponible pour le moment." onRetry={() => { profile.refetch(); existing.refetch(); }} /></section></MarketplaceShell>;
  if (!isAuthenticated || !profile.data) return <MarketplaceShell title="Vérification"><section className="page-wrap section-space"><div className="gate-card"><LockKeyhole size={28} /><h2>Créez d’abord votre profil.</h2><p>La vérification est réservée aux profils ayant renseigné leur identité de base.</p><Link href="/profil" className="button button--gold">Créer mon profil</Link></div></section></MarketplaceShell>;
  if (existing.data?.status === "approved" || profile.data.verificationStatus === "verified") return <MarketplaceShell title="Vérification"><section className="page-wrap section-space"><div className="gate-card gate-card--success"><ShieldCheck size={32} /><h2>Votre identité est vérifiée.</h2><p>Votre selfie validé est désormais votre photo de profil et votre badge de confiance est actif.</p><Link href="/vendre" className="button button--gold">Publier une annonce</Link></div></section></MarketplaceShell>;
  if (existing.data?.status === "pending") return <MarketplaceShell title="Vérification"><section className="page-wrap section-space"><div className="gate-card"><FileCheck2 size={31} /><h2>Votre dossier est en cours d’examen.</h2><p>Vous recevrez une alerte dès qu’une décision aura été prise. Vos documents ne sont jamais affichés publiquement.</p><Link href="/profil" className="button button--outline">Revenir au profil</Link></div></section></MarketplaceShell>;

  return <MarketplaceShell title="Vérification d’identité"><section className="page-wrap section-space verification-layout"><div className="verification-intro"><p className="eyebrow eyebrow--dark">Étape 2 sur 3</p><h2>Un visage, un document, une communauté plus sûre.</h2><p>La vérification est obligatoire pour publier et échanger avec confiance. Votre selfie doit être pris maintenant via la caméra : il devient votre photo de profil après validation.</p><div className="privacy-note"><LockKeyhole size={20} /><span>Les pièces sont stockées de façon sécurisée ; seule leur référence est conservée dans notre base de données.</span></div></div><form className="verification-form" onSubmit={handleSubmit}><div className="verification-block"><span className="step-number">01</span><div><h3>Votre document</h3><p>Choisissez une CNI, un passeport, un permis ou une carte scolaire lisible. L’image est réduite automatiquement avant envoi.</p><select value={documentType} onChange={e => setDocumentType(e.target.value as typeof documentType)}><option value="cni">Carte nationale d’identité</option><option value="passeport">Passeport</option><option value="permis">Permis de conduire</option><option value="carte_scolaire">Carte scolaire</option></select><label className="document-drop"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={pickDocument} hidden />{documentData ? <img src={documentData} alt="Document sélectionné" /> : <><Upload size={26} /><strong>Ajouter la photo du document</strong><span>Photo lisible, recto ou page d’identité</span></>}</label></div></div><div className="verification-block"><span className="step-number">02</span><div><h3>Votre selfie en direct</h3><p>Alignez votre visage, gardez une lumière suffisante et ne portez pas de lunettes de soleil.</p><CameraCapture title="Prise directe uniquement" hint="L’import depuis la galerie est volontairement désactivé pour ce selfie." onCapture={data => { setMediaIssue(undefined); setSelfieData(data); }} /></div></div>{mediaIssue && <p className="form-error">{mediaIssue}</p>}{submitMessage && <p className="form-error">{submitMessage}</p>}<button disabled={!documentData || !selfieData || submit.isPending} className="button button--gold button--wide">{submit.isPending ? "Transmission sécurisée…" : <><ScanFace size={17} /> Soumettre ma vérification</>}</button></form></section></MarketplaceShell>;
}
