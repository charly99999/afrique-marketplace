import { z } from "zod";

export const aiVerificationReviewSchema = z.object({
  recommendation: z.enum(["approve", "resubmit", "manual_review"]),
  confidence: z.number().min(0).max(100),
  documentReadable: z.boolean(),
  selfieFaceVisible: z.boolean(),
  profileInformationConsistent: z.boolean(),
  reasons: z.array(z.string().trim().min(3).max(240)).min(1).max(5),
});

export type AiVerificationReview = z.infer<typeof aiVerificationReviewSchema>;

export function decideFromAiReview(review: AiVerificationReview) {
  const strongApproval = review.recommendation === "approve"
    && review.confidence >= 85
    && review.documentReadable
    && review.selfieFaceVisible
    && review.profileInformationConsistent;

  if (strongApproval) return { decision: "approved" as const, note: "Vérification automatisée : dossier cohérent." };
  if (review.recommendation === "resubmit" || !review.documentReadable || !review.selfieFaceVisible) {
    return { decision: "rejected" as const, note: review.reasons.join(" ") };
  }
  return { decision: "pending" as const, note: review.reasons.join(" ") };
}
