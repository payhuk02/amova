/** Site SEO constants — Amova production domain */
export const SITE_URL = "https://www.amova.space";
export const SITE_NAME = "Amova";
export const DEFAULT_TITLE = "Amova — Rencontres sincères, histoires vraies";
export const DEFAULT_DESCRIPTION =
  "Amova : rencontres homme ↔ femme en Afrique, vérification d'identité manuelle et paiements Mobile Money.";

export type SeoProps = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
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
