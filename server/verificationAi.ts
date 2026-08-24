import { invokeLLM } from "./_core/llm";
import { storageGetSignedUrl } from "./storage";
import { aiVerificationReviewSchema, type AiVerificationReview } from "../shared/verificationAi";

type VerificationAiInput = {
  firstName: string;
  lastName: string;
  city: string;
  documentType: string;
  documentKey: string;
  selfieKey: string;
};

export function parseAiReviewResponse(content: string): AiVerificationReview {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("L’analyse IA a retourné un format incomplet.");
  }
  try {
    return aiVerificationReviewSchema.parse(JSON.parse(content.slice(start, end + 1)));
  } catch (error) {
    console.error("[Verification AI] Invalid structured response:", content.slice(0, 500));
    throw error;
  }
}

export async function analyzeVerificationWithAi(input: VerificationAiInput): Promise<AiVerificationReview> {
  const [documentUrl, selfieUrl] = await Promise.all([
    storageGetSignedUrl(input.documentKey),
    storageGetSignedUrl(input.selfieKey),
  ]);
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    maxTokens: 1600,
    messages: [
      {
        role: "system",
        content: "Vous analysez un dossier de vérification d’identité pour une marketplace. Ne déduisez ni origine, ni religion, ni santé, ni autre attribut sensible. Évaluez uniquement la lisibilité du document, la présence nette d’un visage sur le selfie, et la cohérence apparente avec les informations déclarées. Ne prétendez jamais identifier une personne. Répondez strictement avec le JSON du schéma, sans texte ni balise supplémentaire. Gardez chaque motif sous 120 caractères.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Informations déclarées : prénom ${input.firstName}, nom ${input.lastName}, ville ${input.city}. Type de document : ${input.documentType}. Image 1 : document. Image 2 : selfie pris en direct. Recommandez approve uniquement si tout est net et cohérent ; resubmit si une image est inutilisable ; manual_review si vous ne pouvez pas conclure.` },
          { type: "image_url", image_url: { url: documentUrl, detail: "high" } },
          { type: "image_url", image_url: { url: selfieUrl, detail: "high" } },
        ],
      },
    ],
    outputSchema: {
      name: "verification_review",
      strict: true,
      schema: {
        type: "object",
        properties: {
          recommendation: { type: "string", enum: ["approve", "resubmit", "manual_review"] },
          confidence: { type: "number", minimum: 0, maximum: 100 },
          documentReadable: { type: "boolean" },
          selfieFaceVisible: { type: "boolean" },
          profileInformationConsistent: { type: "boolean" },
          reasons: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
        },
        required: ["recommendation", "confidence", "documentReadable", "selfieFaceVisible", "profileInformationConsistent", "reasons"],
        additionalProperties: false,
      },
    },
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("L’analyse IA n’a retourné aucun résultat exploitable.");
  return parseAiReviewResponse(content);
}
