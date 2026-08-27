import { aiVerificationReviewSchema, type AiVerificationReview } from "../shared/verificationAi";

/**
 * Compatibilité de parsing pour les anciennes données de revue.
 * Ce module ne contacte aucun fournisseur externe et ne prend aucune décision.
 */
export function parseAiReviewResponse(content: string): AiVerificationReview {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("L’analyse IA a retourné un format incomplet.");
  const parsed: unknown = JSON.parse(content.slice(start, end + 1));
  return aiVerificationReviewSchema.parse(parsed);
}
