import { Link, Navigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MarketingLayout from "@/components/MarketingLayout";
import Seo, { BreadcrumbJsonLd } from "@/components/Seo";
import {
  SEO_COUNTRIES,
  SEO_CITIES,
  cityPageDescription,
  cityPageTitle,
  DEFAULT_KEYWORDS,
  getSeoPlace,
  SITE_URL,
} from "@/lib/seo";

export default function CitySeoPage() {
  const { citySlug } = useParams<{ citySlug: string }>();
  const place = getSeoPlace(citySlug);

  if (!place) {
    return <Navigate to="/rencontres" replace />;
  }

  const path = `/rencontres/${place.slug}`;
  const title = cityPageTitle(place);
  const description = cityPageDescription(place);
  const relatedCountries = SEO_COUNTRIES.filter((c) => c.slug !== place.slug).slice(0, 12);
  const relatedCities = SEO_CITIES.filter(
    (c) => c.slug !== place.slug && (place.kind === "country" ? c.country === place.name : true),
  );

  return (
    <>
      <Seo
        title={title}
        description={description}
        path={path}
        keywords={`${DEFAULT_KEYWORDS}, rencontres ${place.name}, dating ${place.name}, ${place.country}`}
        jsonLd={[
          BreadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Pays", path: "/rencontres" },
            { name: place.name, path },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title,
            description,
            url: `${SITE_URL}${path}`,
            about:
              place.kind === "country"
                ? { "@type": "Country", name: place.name }
                : {
                    "@type": "City",
                    name: place.name,
                    containedInPlace: { "@type": "Country", name: place.country },
                  },
            isPartOf: { "@type": "WebSite", name: "Amova", url: SITE_URL },
          },
        ]}
      />
      <MarketingLayout
        title={`Rencontres vérifiées ${place.adjective}`}
        subtitle={place.blurb}
        breadcrumbs={[
          { label: "Accueil", to: "/" },
          { label: "Pays", to: "/rencontres" },
          { label: place.name },
        ]}
      >
        <p>
          Amova est un site de rencontres sérieuses homme ↔ femme pour les adultes{" "}
          {place.adjective}
          {place.kind === "city" ? ` (${place.country})` : ""}. L&apos;inscription est
          gratuite ; les profils peuvent demander une vérification d&apos;identité manuelle
          pour afficher un badge de confiance.
        </p>

        <h2 className="font-display text-xl font-medium text-foreground pt-2">
          Pourquoi Amova {place.adjective} ?
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Matching hétérosexuel strict (H↔F uniquement)</li>
          <li>Vérification d&apos;identité humaine, pas un robot opaque</li>
          <li>Photos floutées sur le plan Gratuit — nettes avec Plus ou après match</li>
          <li>Paiements Mobile Money</li>
          <li>Signalements et blocages traités par l&apos;équipe</li>
        </ul>

        {relatedCities.length > 0 && (
          <>
            <h2 className="font-display text-xl font-medium text-foreground pt-4">
              Villes
            </h2>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              {relatedCities.map((c) => (
                <Link
                  key={c.slug}
                  to={`/rencontres/${c.slug}`}
                  className="text-brand hover:underline"
                >
                  {c.name}
                </Link>
              ))}
            </p>
          </>
        )}

        <h2 className="font-display text-xl font-medium text-foreground pt-4">
          Autres pays
        </h2>
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          {relatedCountries.map((c) => (
            <Link
              key={c.slug}
              to={`/rencontres/${c.slug}`}
              className="text-brand hover:underline"
            >
              {c.name}
            </Link>
          ))}
          <Link to="/rencontres" className="font-semibold text-brand hover:underline">
            Suite
          </Link>
        </p>

        <div className="flex flex-wrap gap-3 pt-6 not-prose">
          <Button variant="hero" asChild>
            <Link to="/auth">Créer mon compte</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/verification-identite">Comment on vérifie</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/tarifs">Tarifs</Link>
          </Button>
        </div>
      </MarketingLayout>
    </>
  );
}
