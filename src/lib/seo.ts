/** Site SEO constants — Amova production domain */
export const SITE_URL = "https://www.amova.space";
export const SITE_NAME = "Amova";
export const TWITTER_HANDLE = "@Amova";

/** Primary SERP title — brand + high-intent keywords */
export const DEFAULT_TITLE =
  "Amova — Site de rencontres vérifiées en Afrique | Homme ↔ Femme";

export const DEFAULT_DESCRIPTION =
  "Amova, site de rencontres sérieuses homme ↔ femme en Afrique francophone. Profils vérifiés à la main, matching H↔F, photos protégées et paiements Mobile Money (FCFA).";

export const DEFAULT_KEYWORDS =
  "Amova, site de rencontres Afrique, rencontres vérifiées, dating Abidjan, dating Dakar, rencontres homme femme, profils vérifiés, Mobile Money, KYC, matching hétérosexuel, Côte d'Ivoire, Sénégal";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

/** Official social profiles for Organization.sameAs (add URLs when accounts are live). */
export const SOCIAL_SAME_AS: string[] = [
  // "https://www.instagram.com/amova.space",
  // "https://www.facebook.com/amova.space",
  // "https://x.com/Amova",
];

export type SeoCity = {
  slug: string;
  name: string;
  country: string;
  adjective: string;
  blurb: string;
};

/** Local SEO landing pages — unique copy per city */
export const SEO_CITIES: SeoCity[] = [
  {
    slug: "abidjan",
    name: "Abidjan",
    country: "Côte d'Ivoire",
    adjective: "à Abidjan",
    blurb:
      "Rencontrez des adultes sérieux à Abidjan et en Côte d'Ivoire. Identité contrôlée manuellement, matching homme ↔ femme, paiements Mobile Money locaux.",
  },
  {
    slug: "dakar",
    name: "Dakar",
    country: "Sénégal",
    adjective: "à Dakar",
    blurb:
      "Site de rencontres vérifiées à Dakar et au Sénégal. Profils 18+, vérification d'identité humaine, conversations sincères et paiement Mobile Money.",
  },
  {
    slug: "lome",
    name: "Lomé",
    country: "Togo",
    adjective: "à Lomé",
    blurb:
      "Amova à Lomé : rencontres homme ↔ femme entre adultes sérieux au Togo, avec badge de vérification manuelle et abonnements en FCFA.",
  },
  {
    slug: "cotonou",
    name: "Cotonou",
    country: "Bénin",
    adjective: "à Cotonou",
    blurb:
      "Rencontres vérifiées à Cotonou et au Bénin. Matching H↔F strict, photos protégées sur le plan gratuit, support et paiements en Afrique de l'Ouest.",
  },
  {
    slug: "ouagadougou",
    name: "Ouagadougou",
    country: "Burkina Faso",
    adjective: "à Ouagadougou",
    blurb:
      "Trouvez une rencontre sérieuse à Ouagadougou. Amova combine vérification d'identité manuelle et matching homme ↔ femme pour le Burkina Faso.",
  },
  {
    slug: "bamako",
    name: "Bamako",
    country: "Mali",
    adjective: "à Bamako",
    blurb:
      "Amova à Bamako : plateforme de rencontres Afrique francophone, profils vérifiés, respect et Mobile Money pour les membres maliens.",
  },
];

export function getSeoCity(slug: string | undefined): SeoCity | undefined {
  if (!slug) return undefined;
  return SEO_CITIES.find((c) => c.slug === slug.toLowerCase());
}

export type SeoProps = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
  keywords?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageTitle(title?: string): string {
  if (!title || title === DEFAULT_TITLE) return DEFAULT_TITLE;
  if (title.includes("Amova")) return title;
  return `${title} | Amova`;
}

export function cityPageTitle(city: SeoCity): string {
  return `Rencontres vérifiées ${city.adjective} (${city.country}) | Amova`;
}

export function cityPageDescription(city: SeoCity): string {
  return city.blurb;
}
