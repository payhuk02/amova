import { Link } from "react-router-dom";
import MarketingLayout from "@/components/MarketingLayout";
import Seo, { BreadcrumbJsonLd } from "@/components/Seo";
import { SEO_COUNTRIES, SEO_CITIES, DEFAULT_KEYWORDS, SITE_URL } from "@/lib/seo";

export default function RencontresHubPage() {
  return (
    <>
      <Seo
        title="Rencontres vérifiées en Afrique — tous les pays | Amova"
        description="Site de rencontres homme ↔ femme dans toute l'Afrique. Côte d'Ivoire, Sénégal, Cameroun, Maroc, RD Congo et 50+ pays. Profils vérifiés, Mobile Money."
        path="/rencontres"
        keywords={DEFAULT_KEYWORDS}
        jsonLd={[
          BreadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Rencontres", path: "/rencontres" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Pays Amova",
            numberOfItems: SEO_COUNTRIES.length,
            itemListElement: SEO_COUNTRIES.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `Rencontres ${c.name}`,
              url: `${SITE_URL}/rencontres/${c.slug}`,
            })),
          },
        ]}
      />
      <MarketingLayout
        title="Rencontres en Afrique"
        subtitle="Amova est ouvert à tous les pays d'Afrique. Choisissez le vôtre pour en savoir plus sur les rencontres vérifiées homme ↔ femme."
        breadcrumbs={[
          { label: "Accueil", to: "/" },
          { label: "Pays" },
        ]}
      >
        <h2 className="font-display text-xl font-medium text-foreground pt-1">
          Tous les pays ({SEO_COUNTRIES.length})
        </h2>
        <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 list-none p-0 m-0 not-prose">
          {SEO_COUNTRIES.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/rencontres/${c.slug}`}
                className="block rounded-lg border border-border bg-card px-3.5 py-3 hover:border-brand/40 transition-colors"
              >
                <span className="font-medium text-foreground text-sm">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="font-display text-xl font-medium text-foreground pt-6">
          Grandes villes
        </h2>
        <ul className="grid sm:grid-cols-2 gap-2 list-none p-0 m-0 not-prose">
          {SEO_CITIES.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/rencontres/${c.slug}`}
                className="block rounded-lg border border-border bg-card px-3.5 py-3 hover:border-brand/40 transition-colors"
              >
                <span className="font-medium text-foreground text-sm">{c.name}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {c.country}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingLayout>
    </>
  );
}
