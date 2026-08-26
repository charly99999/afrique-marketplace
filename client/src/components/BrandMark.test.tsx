import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

import { BrandMark } from "./BrandMark";

describe("BrandMark", () => {
  it("utilise l’icône Afrique Marketplace persistante dans l’en-tête", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<BrandMark />);
    });
    const image = renderer!.root.findByType("img");

    expect(image.props.src).toMatch(/^data:image\/png;base64,/);
    expect(image.props.src).not.toContain("afrique-marketplace-logo_c13e817c");
  });
});
