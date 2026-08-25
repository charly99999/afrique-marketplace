const CANONICAL_ORIGIN = "https://afrique-marketplace.vercel.app";

export type SeoMetadata = {
  title: string;
  description: string;
  canonical: string;
  robots: "index,follow" | "noindex,nofollow,noarchive";
};

function cleanPath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  return path === "/" ? path : path.replace(/\/+$/, "");
}

export function getSeoMetadata(pathname: string): SeoMetadata {
  const path = cleanPath(pathname);
  const privateRoute = ["/compte", "/profil", "/suivis", "/verification", "/vendre", "/messages", "/administration"].some(route => path === route || path.startsWith(`${route}/`));

  if (privateRoute || path === "/404") {
    return {
      title: "Espace privé | Afrique Marketplace",
      description: "Espace réservé aux membres d’Afrique Marketplace.",
      canonical: `${CANONICAL_ORIGIN}${path}`,
      robots: "noindex,nofollow,noarchive",
    };
  }

  if (path === "/annonces") {
    return {
      title: "Annonces | Afrique Marketplace",
      description: "Explorez des annonces publiées par des vendeurs sur Afrique Marketplace.",
      canonical: `${CANONICAL_ORIGIN}${path}`,
      robots: "index,follow",
    };
  }

  if (path.startsWith("/annonce/")) {
    return {
      title: "Annonce | Afrique Marketplace",
      description: "Consultez une annonce publique sur Afrique Marketplace.",
      canonical: `${CANONICAL_ORIGIN}${path}`,
      robots: "index,follow",
    };
  }

  if (path.startsWith("/vendeur/")) {
    return {
      title: "Vendeur vérifié | Afrique Marketplace",
      description: "Découvrez le profil public et les annonces d’un vendeur vérifié sur Afrique Marketplace.",
      canonical: `${CANONICAL_ORIGIN}${path}`,
      robots: "index,follow",
    };
  }

  return {
    title: "Afrique Marketplace | Acheter et vendre en Afrique",
    description: "Afrique Marketplace, la marketplace francophone de confiance pour acheter et vendre en Afrique.",
    canonical: `${CANONICAL_ORIGIN}/`,
    robots: "index,follow",
  };
}
