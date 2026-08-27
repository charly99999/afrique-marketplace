import { describe, expect, it } from "vitest";
import { comparisonAllowsNoAutomaticApproval, type FaceComparisonResult } from "./faceComparison";

describe("comparaison visage-document", () => {
  const pass: FaceComparisonResult = { status: "pass", similarity: 0.82, reason: "ok", model: "mobilenetv2_mcp.onnx" };
  const unknown: FaceComparisonResult = { status: "unknown", similarity: null, reason: "indisponible", model: "mobilenetv2_mcp.onnx" };

  it("identifie le modèle utilisé dans le signal positif", () => {
    expect(pass.model).toBe("mobilenetv2_mcp.onnx");
    expect(comparisonAllowsNoAutomaticApproval(pass, { safeToSubmit: true })).toBe(true);
  });

  it("bloque toujours un résultat inconnu", () => {
    expect(comparisonAllowsNoAutomaticApproval(unknown, { safeToSubmit: true })).toBe(false);
  });

  it("bloque même un match local si un autre pré-contrôle échoue", () => {
    expect(comparisonAllowsNoAutomaticApproval(pass, { safeToSubmit: false })).toBe(false);
  });
});
