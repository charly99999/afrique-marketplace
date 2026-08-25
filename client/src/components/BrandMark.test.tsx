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

    expect(image.props.src).toBe("https://pnyoanxxifswwwrljqce.supabase.co/storage/v1/object/public/am-public-assets/afrique-marketplace-icon-512.png");
    expect(image.props.src).not.toContain("afrique-marketplace-logo_c13e817c");
  });
});
