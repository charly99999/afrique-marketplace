const INTERNAL_LOGIN_DOMAIN = "accounts.afrique-marketplace.internal";

/**
 * Normalise les numéros saisis dans l’interface sans conserver les espaces,
 * parenthèses ou tirets. Les numéros ivoiriens locaux à 10 chiffres reçoivent
 * l’indicatif +225 ; les autres numéros doivent déjà contenir leur indicatif.
 */
export function normalizePhoneNumber(value: string): string {
  const raw = value.trim();
  const hasInternationalPrefix = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) throw new Error("Saisissez un numéro de téléphone valide.");

  if (!hasInternationalPrefix && digits.length === 10 && digits.startsWith("0")) {
    return `+225${digits}`;
  }

  if (hasInternationalPrefix) return `+${digits}`;
  if (digits.length >= 11) return `+${digits}`;
  throw new Error("Ajoutez l’indicatif pays, par exemple +225 pour la Côte d’Ivoire.");
}

/**
 * Supabase Auth email/password est utilisé comme mécanisme interne, car le
 * fournisseur Phone hosted exige un service SMS. Cette adresse n’est jamais
 * affichée ni demandée à l’utilisateur ; le numéro canonique reste dans
 * am_profiles.phone via les métadonnées Auth.
 */
export function internalLoginEmail(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  return `phone-${normalized.slice(1)}@${INTERNAL_LOGIN_DOMAIN}`;
}
