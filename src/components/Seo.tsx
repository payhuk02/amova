import { useEffect } from "react";
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  pageTitle,
  SITE_NAME,
  SITE_URL,
  SOCIAL_SAME_AS,
  TWITTER_HANDLE,
  type SeoProps,
} from "@/lib/seo";
import { PLAN_PRICES, formatFcfa } from "@/lib/plans";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string, attrs?: Record<string, string>) {
  const selector = attrs?.hreflang
    ? `link[rel="${rel}"][hreflang="${attrs.hreflang}"]`
    : `link[rel="${rel}"]`;
  let el = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
  }
}

function upsertJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Per-route SEO (title, description, Open Graph, canonical, JSON-LD).
 * Place once at the top of each public page.
 */
export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
  type = "website",
  keywords = DEFAULT_KEYWORDS,
  jsonLd,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = pageTitle(title);
    const url = absoluteUrl(path);

    document.title = fullTitle;
    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", keywords);
    upsertMeta(
      "name",
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    );
    upsertMeta("name", "googlebot", noIndex ? "noindex, nofollow" : "index, follow");
    upsertLink("canonical", url);
    upsertLink("alternate", url, { hreflang: "fr" });
    upsertLink("alternate", url, { hreflang: "x-default" });

    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "fr_FR");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");
    upsertMeta("property", "og:image:alt", fullTitle);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:site", TWITTER_HANDLE);
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);

    if (jsonLd) {
      upsertJsonLd("amova-jsonld", jsonLd);
    }
  }, [title, description, path, image, noIndex, type, keywords, jsonLd]);

  return null;
}

export function OrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
    },
    description: DEFAULT_DESCRIPTION,
    foundingDate: "2025",
    areaServed: {
      "@type": "Place",
      name: "Afrique de l'Ouest francophone",
    },
    sameAs: SOCIAL_SAME_AS,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SITE_URL}/contact`,
      availableLanguage: ["French"],
    },
  };
}

export function WebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "fr-FR",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "RegisterAction",
      target: `${SITE_URL}/auth`,
      name: "Créer un compte Amova",
    },
  };
}

export function SoftwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "DatingApplication",
    operatingSystem: "Web, Android, iOS",
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    offers: [
      {
        "@type": "Offer",
        name: "Gratuit",
        price: "0",
        priceCurrency: "XOF",
      },
      {
        "@type": "Offer",
        name: "Plus",
        price: String(PLAN_PRICES.plus),
        priceCurrency: "XOF",
        description: `Galerie HD, Qui m'aime, messages illimités — ${formatFcfa(PLAN_PRICES.plus)}/mois`,
      },
      {
        "@type": "Offer",
        name: "Premium",
        price: String(PLAN_PRICES.premium),
        priceCurrency: "XOF",
      },
      {
        "@type": "Offer",
        name: "VIP",
        price: String(PLAN_PRICES.vip),
        priceCurrency: "XOF",
      },
    ],
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function BreadcrumbJsonLd(
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION, SITE_URL };
