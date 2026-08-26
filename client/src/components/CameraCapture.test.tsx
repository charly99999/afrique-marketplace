import { describe, expect, it } from "vitest";
import { hasActiveLivenessSignal } from "./CameraCapture";

describe("liveness actif", () => {
  it("refuse une séquence trop courte", () => {
    expect(hasActiveLivenessSignal([0.42, 0.58, 0.44])).toBe(false);
  });

  it("refuse une séquence stable", () => {
    expect(hasActiveLivenessSignal(Array.from({ length: 12 }, () => 0.5))).toBe(false);
  });

  it("accepte seulement une variation observée sur assez de frames", () => {
    expect(hasActiveLivenessSignal([0.40, 0.42, 0.43, 0.44, 0.45, 0.46, 0.47, 0.48, 0.50, 0.52, 0.56, 0.58])).toBe(true);
  });
});
