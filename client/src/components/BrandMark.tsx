import React from "react";
import { Link } from "wouter";

const logoUrl = "https://pnyoanxxifswwwrljqce.supabase.co/storage/v1/object/public/am-public-assets/afrique-marketplace-icon-512.png";

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
