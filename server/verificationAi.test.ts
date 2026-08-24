import { describe, expect, it } from "vitest";
import { decideFromAiReview } from "../shared/verificationAi";
import { parseAiReviewResponse } from "./verificationAi";

describe("décision de vérification assistée par IA", () => {
  it("approuve uniquement un dossier très cohérent et lisible", () => {
    expect(decideFromAiReview({ recommendation: "approve", confidence: 92, documentReadable: true, selfieFaceVisible: true, profileInformationConsistent: true, reasons: ["Document lisible et éléments déclarés cohérents."] })).toMatchObject({ decision: "approved" });
  });

  it("demande une nouvelle soumission lorsque le document ou le selfie est inutilisable", () => {
    expect(decideFromAiReview({ recommendation: "resubmit", confidence: 91, documentReadable: false, selfieFaceVisible: true, profileInformationConsistent: false, reasons: ["Le document est flou et les informations ne sont pas lisibles."] })).toMatchObject({ decision: "rejected" });
  });

  it("conserve le dossier en attente lorsque l’IA ne peut pas conclure", () => {
    expect(decideFromAiReview({ recommendation: "manual_review", confidence: 55, documentReadable: true, selfieFaceVisible: true, profileInformationConsistent: false, reasons: ["La cohérence des informations ne peut pas être établie automatiquement."] })).toMatchObject({ decision: "pending" });
  });

  it("extrait le JSON valide même si le modèle ajoute un court préambule", () => {
    const review = parseAiReviewResponse('Résultat : {"recommendation":"approve","confidence":91,"documentReadable":true,"selfieFaceVisible":true,"profileInformationConsistent":true,"reasons":["Images exploitables et informations cohérentes."]}');
    expect(review).toMatchObject({ recommendation: "approve", confidence: 91, documentReadable: true, selfieFaceVisible: true, profileInformationConsistent: true });
  });

  it("refuse une réponse IA incomplète sans prendre de décision", () => {
    expect(() => parseAiReviewResponse('{"recommendation":"approve"')).toThrow("format incomplet");
  });
});
