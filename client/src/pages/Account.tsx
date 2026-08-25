import { useAuth } from "@/_core/hooks/useAuth";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { isSupabaseMode } from "@/lib/backendMode";
import { signInWithPhoneAndPassword, signUpWithPhoneAndPassword } from "@/lib/marketplaceSupabase";
import { trpc } from "@/lib/trpc";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, KeyRound, Phone, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type AccountMode = "login" | "register";

export default function Account() {
  const [, navigate] = useLocation();
  const { refresh } = useAuth();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<AccountMode>("login");
  const [login, setLogin] = useState({ phone: "", password: "" });
  const [registration, setRegistration] = useState({ firstName: "", lastName: "", phone: "", city: "", password: "" });
  const onLegacySuccess = async () => { await utils.auth.me.invalidate(); navigate("/profil"); };
  const onPortableSuccess = async () => { await refresh(); navigate("/profil"); };
  const legacyLogin = trpc.auth.login.useMutation({ onSuccess: onLegacySuccess });
  const legacyRegister = trpc.auth.register.useMutation({ onSuccess: onLegacySuccess });
  const portableLogin = useMutation({ mutationFn: () => signInWithPhoneAndPassword(login.phone, login.password), onSuccess: onPortableSuccess });
  const portableRegister = useMutation({ mutationFn: () => signUpWithPhoneAndPassword(registration), onSuccess: onPortableSuccess });
  const activeError = isSupabaseMode
    ? (mode === "login" ? portableLogin.error : portableRegister.error)
    : (mode === "login" ? legacyLogin.error : legacyRegister.error);
  const isSubmitting = isSupabaseMode
    ? (mode === "login" ? portableLogin.isPending : portableRegister.isPending)
    : (mode === "login" ? legacyLogin.isPending : legacyRegister.isPending);

  const submitLogin = () => {
    if (isSupabaseMode) portableLogin.mutate();
    else legacyLogin.mutate(login);
  };
  const submitRegistration = () => {
    if (isSupabaseMode) portableRegister.mutate();
    else legacyRegister.mutate(registration);
  };

  return <MarketplaceShell title={mode === "login" ? "Accéder à mon espace" : "Créer mon compte"}><section className="page-wrap section-space account-layout"><div className="account-intro"><p className="eyebrow eyebrow--dark">Votre compte, dans l’application</p><h2>Une seule application, aucun détour.</h2><p>Inscrivez-vous et connectez-vous directement avec votre numéro de téléphone et votre mot de passe. Vous ne quitterez jamais Afrique Marketplace.</p><div className="privacy-note"><ShieldCheck size={20} /><span>Votre session est protégée et votre accès reste privé sur tous vos écrans.</span></div></div><div className="account-card"><div className="account-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}><KeyRound size={16} /> Connexion</button><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}><UserRoundPlus size={16} /> Inscription</button></div>{mode === "login" ? <form className="premium-form account-form" onSubmit={event => { event.preventDefault(); submitLogin(); }}><h3>Bon retour parmi nous.</h3><label>Numéro de téléphone<div className="field-with-icon"><Phone size={16} /><input required inputMode="tel" value={login.phone} onChange={event => setLogin({ ...login, phone: event.target.value })} placeholder="Ex. +221 77 000 00 00" /></div></label><label>Mot de passe<input required type="password" minLength={8} value={login.password} onChange={event => setLogin({ ...login, password: event.target.value })} /></label><button className="button button--gold button--wide" disabled={isSubmitting}>{isSubmitting ? "Connexion…" : <>Se connecter <ArrowRight size={17} /></>}</button></form> : <form className="premium-form account-form" onSubmit={event => { event.preventDefault(); submitRegistration(); }}><h3>Créez votre accès sécurisé.</h3><div className="form-row"><label>Prénom<input required minLength={2} value={registration.firstName} onChange={event => setRegistration({ ...registration, firstName: event.target.value })} /></label><label>Nom<input required minLength={2} value={registration.lastName} onChange={event => setRegistration({ ...registration, lastName: event.target.value })} /></label></div><label>Numéro de téléphone<div className="field-with-icon"><Phone size={16} /><input required inputMode="tel" value={registration.phone} onChange={event => setRegistration({ ...registration, phone: event.target.value })} placeholder="Ex. +221 77 000 00 00" /></div></label><label>Ville<input required value={registration.city} onChange={event => setRegistration({ ...registration, city: event.target.value })} /></label><label>Mot de passe<input required type="password" minLength={8} value={registration.password} onChange={event => setRegistration({ ...registration, password: event.target.value })} /><small>8 caractères minimum.</small></label><button className="button button--gold button--wide" disabled={isSubmitting}>{isSubmitting ? "Création…" : <>Créer mon compte <ArrowRight size={17} /></>}</button></form>}{activeError && <p className="form-error account-card__error">{activeError.message}</p>}<p className="account-card__footer">Aucune adresse e-mail n’est demandée.</p></div></section></MarketplaceShell>;
}
