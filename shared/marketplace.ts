import { z } from "zod";

export const MARKETPLACE_CATEGORIES = [
  { id: "immobilier", label: "Immobilier", description: "Maisons, terrains et locations" },
  { id: "vehicules", label: "Véhicules", description: "Autos, motos et utilitaires" },
  { id: "telephones", label: "Téléphones", description: "Smartphones et accessoires" },
  { id: "electronique", label: "Électronique", description: "Ordinateurs, TV et son" },
  { id: "mode", label: "Mode", description: "Vêtements, beauté et luxe" },
  { id: "emploi", label: "Emploi", description: "Services et opportunités" },
] as const;

export const categoryIds = MARKETPLACE_CATEGORIES.map(category => category.id) as [
  (typeof MARKETPLACE_CATEGORIES)[number]["id"],
  ...(typeof MARKETPLACE_CATEGORIES)[number]["id"][],
];

export const registrationSchema = z.object({
  firstName: z.string().trim().min(2, "Indiquez votre prénom").max(80),
  lastName: z.string().trim().min(2, "Indiquez votre nom").max(80),
  phone: z.string().trim().regex(/^\+?[0-9\s().-]{8,20}$/, "Indiquez un numéro de téléphone valide"),
  city: z.string().trim().min(2, "Indiquez votre ville").max(100),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(128),
});

export const listingCreateSchema = z.object({
  title: z.string().trim().min(6, "Le titre doit contenir au moins 6 caractères").max(140),
  description: z.string().trim().min(20, "Décrivez davantage votre annonce").max(5000),
  category: z.enum(categoryIds),
  city: z.string().trim().min(2).max(100),
  price: z.coerce.number().min(0).max(999999999),
  currency: z.enum(["XOF", "XAF", "MAD", "CDF", "GNF", "USD"]).default("XOF"),
  condition: z.enum(["neuf", "comme_neuf", "bon_etat", "a_reparer"]),
  mediaData: z.array(z.string().max(3_000_000)).max(4).default([]),
});

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export function isKnownCategory(value: string): value is (typeof categoryIds)[number] {
  return categoryIds.includes(value as (typeof categoryIds)[number]);
}

export function canPublishWithVerification(status?: string | null) {
  return status === "verified";
}

export function profileUpdateForVerification(decision: "approved" | "rejected", selfieKey: string) {
  return decision === "approved"
    ? { verificationStatus: "verified" as const, profilePhotoKey: selfieKey }
    : { verificationStatus: "rejected" as const };
}

export function verificationNotification(decision: "approved" | "rejected", note: string) {
  return decision === "approved"
    ? { title: "Profil vérifié", body: "Votre badge vérifié est désormais actif." }
    : { title: "Vérification à compléter", body: note || "Votre dossier nécessite une nouvelle soumission." };
}

export function resolveVerificationDecision(decision: "approved" | "rejected", selfieKey: string, note: string) {
  return {
    profile: profileUpdateForVerification(decision, selfieKey),
    notification: verificationNotification(decision, note),
  };
}

export const moderationStatuses = ["published", "hidden", "removed"] as const;
