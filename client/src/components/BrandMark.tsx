import { Link } from "wouter";

const logoUrl = "/manus-storage/afrique-marketplace-logo_c13e817c.png";

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
