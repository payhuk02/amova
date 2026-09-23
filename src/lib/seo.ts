/** Site SEO constants — Amova production domain */
export const SITE_URL = "https://www.amova.space";
export const SITE_NAME = "Amova";
export const TWITTER_HANDLE = "@Amova";

/** Primary SERP title — brand + high-intent keywords */
export const DEFAULT_TITLE =
  "Amova — Site de rencontres vérifiées en Afrique | Homme ↔ Femme";

export const DEFAULT_DESCRIPTION =
  "Amova, site de rencontres sérieuses homme ↔ femme en Afrique. Profils vérifiés à la main, matching H↔F, photos protégées et paiements Mobile Money.";

export const DEFAULT_KEYWORDS =
  "Amova, site de rencontres Afrique, rencontres vérifiées, dating Afrique, rencontres homme femme, profils vérifiés, Mobile Money, KYC, matching hétérosexuel";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

/** Official social profiles for Organization.sameAs (add URLs when accounts are live). */
export const SOCIAL_SAME_AS: string[] = [];

export type SeoPlace = {
  slug: string;
  name: string;
  /** Country name (same as name for country pages; parent country for city pages). */
  country: string;
  adjective: string;
  blurb: string;
  kind: "country" | "city";
};

function countryPlace(
  slug: string,
  name: string,
  adjective: string,
  blurb?: string,
): SeoPlace {
  return {
    slug,
    name,
    country: name,
    adjective,
    kind: "country",
    blurb:
      blurb ??
      `Rencontres vérifiées ${adjective} avec Amova. Matching homme ↔ femme, adultes 18+, vérification d'identité manuelle et abonnements adaptés à l'Afrique.`,
  };
}

/** All African countries — SEO landings + footer. */
export const SEO_COUNTRIES: SeoPlace[] = [
  countryPlace("algerie", "Algérie", "en Algérie"),
  countryPlace("angola", "Angola", "en Angola"),
  countryPlace("benin", "Bénin", "au Bénin", "Rencontres vérifiées au Bénin avec Amova. Matching H↔F, badge d'identité manuelle et paiements Mobile Money."),
  countryPlace("botswana", "Botswana", "au Botswana"),
  countryPlace("burkina-faso", "Burkina Faso", "au Burkina Faso", "Trouvez une rencontre sérieuse au Burkina Faso. Vérification d'identité humaine et matching homme ↔ femme."),
  countryPlace("burundi", "Burundi", "au Burundi"),
  countryPlace("cabo-verde", "Cap-Vert", "au Cap-Vert"),
  countryPlace("cameroun", "Cameroun", "au Cameroun"),
  countryPlace("centrafrique", "Centrafrique", "en Centrafrique"),
  countryPlace("comores", "Comores", "aux Comores"),
  countryPlace("congo", "Congo", "au Congo"),
  countryPlace("cote-divoire", "Côte d'Ivoire", "en Côte d'Ivoire", "Rencontres vérifiées en Côte d'Ivoire. Matching homme ↔ femme, Mobile Money et profils authentifiés à la main."),
  countryPlace("djibouti", "Djibouti", "à Djibouti"),
  countryPlace("egypte", "Égypte", "en Égypte"),
  countryPlace("erythree", "Érythrée", "en Érythrée"),
  countryPlace("eswatini", "Eswatini", "au Eswatini"),
  countryPlace("ethiopie", "Éthiopie", "en Éthiopie"),
  countryPlace("gabon", "Gabon", "au Gabon"),
  countryPlace("gambie", "Gambie", "en Gambie"),
  countryPlace("ghana", "Ghana", "au Ghana"),
  countryPlace("guinee", "Guinée", "en Guinée"),
  countryPlace("guinee-bissau", "Guinée-Bissau", "en Guinée-Bissau"),
  countryPlace("guinee-equatoriale", "Guinée équatoriale", "en Guinée équatoriale"),
  countryPlace("kenya", "Kenya", "au Kenya"),
  countryPlace("lesotho", "Lesotho", "au Lesotho"),
  countryPlace("liberia", "Libéria", "au Libéria"),
  countryPlace("libye", "Libye", "en Libye"),
  countryPlace("madagascar", "Madagascar", "à Madagascar"),
  countryPlace("malawi", "Malawi", "au Malawi"),
  countryPlace("mali", "Mali", "au Mali", "Amova au Mali : rencontres Afrique francophone, profils vérifiés et Mobile Money."),
  countryPlace("maroc", "Maroc", "au Maroc"),
  countryPlace("maurice", "Maurice", "à Maurice"),
  countryPlace("mauritanie", "Mauritanie", "en Mauritanie"),
  countryPlace("mozambique", "Mozambique", "au Mozambique"),
  countryPlace("namibie", "Namibie", "en Namibie"),
  countryPlace("niger", "Niger", "au Niger"),
  countryPlace("nigeria", "Nigéria", "au Nigéria"),
  countryPlace("ouganda", "Ouganda", "en Ouganda"),
  countryPlace("rd-congo", "RD Congo", "en RD Congo"),
  countryPlace("rwanda", "Rwanda", "au Rwanda"),
  countryPlace("sao-tome", "Sao Tomé-et-Principe", "à Sao Tomé-et-Principe"),
  countryPlace("senegal", "Sénégal", "au Sénégal", "Site de rencontres vérifiées au Sénégal. Profils 18+, vérification humaine et Mobile Money."),
  countryPlace("seychelles", "Seychelles", "aux Seychelles"),
  countryPlace("sierra-leone", "Sierra Leone", "en Sierra Leone"),
  countryPlace("somalie", "Somalie", "en Somalie"),
  countryPlace("soudan", "Soudan", "au Soudan"),
  countryPlace("soudan-du-sud", "Soudan du Sud", "au Soudan du Sud"),
  countryPlace("afrique-du-sud", "Afrique du Sud", "en Afrique du Sud"),
  countryPlace("tanzanie", "Tanzanie", "en Tanzanie"),
  countryPlace("tchad", "Tchad", "au Tchad"),
  countryPlace("togo", "Togo", "au Togo", "Amova au Togo : rencontres homme ↔ femme, badge de vérification manuelle et abonnements en FCFA."),
  countryPlace("tunisie", "Tunisie", "en Tunisie"),
  countryPlace("zambie", "Zambie", "en Zambie"),
  countryPlace("zimbabwe", "Zimbabwe", "au Zimbabwe"),
];

/** Major city landings (kept for SEO + redirects from old URLs). */
export const SEO_CITIES: SeoPlace[] = [
  {
    slug: "abidjan",
    name: "Abidjan",
    country: "Côte d'Ivoire",
    adjective: "à Abidjan",
    kind: "city",
    blurb:
      "Rencontrez des adultes sérieux à Abidjan et en Côte d'Ivoire. Identité contrôlée manuellement, matching homme ↔ femme, paiements Mobile Money locaux.",
  },
  {
    slug: "dakar",
    name: "Dakar",
    country: "Sénégal",
    adjective: "à Dakar",
    kind: "city",
    blurb:
      "Site de rencontres vérifiées à Dakar et au Sénégal. Profils 18+, vérification d'identité humaine, conversations sincères et paiement Mobile Money.",
  },
  {
    slug: "lome",
    name: "Lomé",
    country: "Togo",
    adjective: "à Lomé",
    kind: "city",
    blurb:
      "Amova à Lomé : rencontres homme ↔ femme entre adultes sérieux au Togo, avec badge de vérification manuelle et abonnements en FCFA.",
  },
  {
    slug: "cotonou",
    name: "Cotonou",
    country: "Bénin",
    adjective: "à Cotonou",
    kind: "city",
    blurb:
      "Rencontres vérifiées à Cotonou et au Bénin. Matching H↔F strict, photos protégées sur le plan gratuit, support et paiements en Afrique de l'Ouest.",
  },
  {
    slug: "ouagadougou",
    name: "Ouagadougou",
    country: "Burkina Faso",
    adjective: "à Ouagadougou",
    kind: "city",
    blurb:
      "Trouvez une rencontre sérieuse à Ouagadougou. Amova combine vérification d'identité manuelle et matching homme ↔ femme pour le Burkina Faso.",
  },
  {
    slug: "bamako",
    name: "Bamako",
    country: "Mali",
    adjective: "à Bamako",
    kind: "city",
    blurb:
      "Amova à Bamako : plateforme de rencontres Afrique francophone, profils vérifiés, respect et Mobile Money pour les membres maliens.",
  },
];

/** All SEO places (countries + cities). */
export const SEO_PLACES: SeoPlace[] = [...SEO_COUNTRIES, ...SEO_CITIES];

/** How many country links to show in the footer before « Suite ». */
export const FOOTER_COUNTRIES_PREVIEW = 10;

export function getSeoPlace(slug: string | undefined): SeoPlace | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  return SEO_PLACES.find((c) => c.slug === s);
}

/** @deprecated use getSeoPlace */
export function getSeoCity(slug: string | undefined): SeoPlace | undefined {
  return getSeoPlace(slug);
}

export type SeoCity = SeoPlace;

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

export function cityPageTitle(place: SeoPlace): string {
  if (place.kind === "country") {
    return `Rencontres vérifiées ${place.adjective} | Amova`;
  }
  return `Rencontres vérifiées ${place.adjective} (${place.country}) | Amova`;
}

export function cityPageDescription(place: SeoPlace): string {
  return place.blurb;
}
