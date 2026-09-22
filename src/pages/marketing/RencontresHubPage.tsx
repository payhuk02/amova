import { Link } from "react-router-dom";
import MarketingLayout from "@/components/MarketingLayout";
import Seo, { BreadcrumbJsonLd } from "@/components/Seo";
import { SEO_CITIES, DEFAULT_KEYWORDS, SITE_URL } from "@/lib/seo";

export default function RencontresHubPage() {
  return (
    <>
      <Seo
        title="Rencontres vérifiées en Afrique — villes Amova"
        description="Site de rencontres homme ↔ femme en Afrique francophone : Abidjan, Dakar, Lomé, Cotonou, Ouagadougou, Bamako. Profils vérifiés, Mobile Money."
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
            name: "Villes Amova",
            itemListElement: SEO_CITIES.map((c, i) => ({
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
        subtitle="Amova couvre les grandes villes d'Afrique de l'Ouest francophone. Choisissez votre ville pour en savoir plus."
        breadcrumbs={[
          { label: "Accueil", to: "/" },
          { label: "Rencontres" },
        ]}
      >
        <ul className="grid sm:grid-cols-2 gap-3 list-none p-0 m-0 not-prose">
          {SEO_CITIES.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/rencontres/${c.slug}`}
                className="block rounded-xl border border-border bg-card p-4 hover:border-brand/40 transition-colors"
              >
                <span className="font-display text-lg font-medium text-foreground">
                  {c.name}
                </span>
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
