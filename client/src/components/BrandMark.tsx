import React from "react";
import { Link } from "wouter";
import { embeddedLogoDataUri } from "./logoData";

const logoUrl = embeddedLogoDataUri;

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand-mark" aria-label="Afrique Marketplace, accueil">
      <span className="brand-mark__seal">
        <img src={logoUrl} alt="" />
      </span>
      {!compact && (
        <span className="brand-mark__words">
          <strong>Afrique</strong>
          <small>Marketplace</small>
        </span>
      )}
    </Link>
  );
}
