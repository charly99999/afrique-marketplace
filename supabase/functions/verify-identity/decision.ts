export type IdentityReview = {
  recommendation?: string;
  confidence?: number;
  documentReadable?: boolean | null;
  selfieFaceVisible?: boolean | null;
  profileInformationConsistent?: boolean | null;
  analysisAvailable?: boolean;
  reasons?: string[];
};

export type IdentityDecision = {
  verificationStatus: "pending" | "approved" | "rejected";
  profileStatus: "pending" | "verified" | "rejected";
  applySelfieAsProfilePhoto: boolean;
};

export function decideIdentityVerification(review: IdentityReview): IdentityDecision {
  const documentReadable = review.documentReadable === true;
  const selfieFaceVisible = review.selfieFaceVisible === true;
  const profileInformationConsistent = review.profileInformationConsistent === true;
  const approved = review.analysisAvailable === true
    && review.recommendation === "approve"
    && typeof review.confidence === "number"
    && review.confidence >= 85
    && documentReadable
    && selfieFaceVisible
    && profileInformationConsistent;
  const rejected = review.analysisAvailable === true
    && (review.recommendation === "reject" || review.recommendation === "resubmit")
    && (!documentReadable || !selfieFaceVisible);

  if (approved) return { verificationStatus: "approved", profileStatus: "verified", applySelfieAsProfilePhoto: true };
  if (rejected) return { verificationStatus: "rejected", profileStatus: "rejected", applySelfieAsProfilePhoto: false };
  return { verificationStatus: "pending", profileStatus: "pending", applySelfieAsProfilePhoto: false };
}

export function unavailableIdentityReview(reason: string): IdentityReview {
  return {
    recommendation: "manual_review",
    confidence: 0,
    documentReadable: null,
    selfieFaceVisible: null,
    profileInformationConsistent: null,
    analysisAvailable: false,
    reasons: [reason.slice(0, 240)],
  };
}
