import { useLocation } from "react-router-dom";
import Seo from "@/components/Seo";
import { DEFAULT_DESCRIPTION, getSeoCity } from "@/lib/seo";

/** Routes whose page component mounts <Seo> (avoid double head updates). */
const PAGE_OWNED_SEO = new Set([
  "/",
  "/faq",
  "/tarifs",
  "/verification-identite",
  "/rencontres",
]);

const PUBLIC_SEO: Record<
  string,
  { title: string; description: string; noIndex?: boolean }
> = {
  "/auth": {
    title: "Connexion & inscription",
    description:
      "Créez votre compte Amova ou connectez-vous pour rencontrer des profils vérifiés homme ↔ femme en Afrique.",
    noIndex: true,
  },
  "/contact": {
    title: "Contact & support Amova",
    description:
      "Contactez l'équipe Amova pour votre compte, un paiement Mobile Money ou une question sécurité.",
  },
  "/conditions": {
    title: "Conditions d'utilisation",
    description:
      "Conditions générales d'utilisation du site de rencontres Amova (Afrique francophone).",
  },
  "/confidentialite": {
    title: "Politique de confidentialité",
    description:
      "Comment Amova collecte, utilise et protège vos données personnelles (RGPD / Afrique).",
  },
};

/** Applies SEO for known public routes; private app routes are noindex. */
export default function RouteSeo() {
  const { pathname } = useLocation();

  if (PAGE_OWNED_SEO.has(pathname)) {
    return null;
  }

  const cityMatch = pathname.match(/^\/rencontres\/([^/]+)\/?$/);
  if (cityMatch) {
    if (getSeoCity(cityMatch[1])) return null;
    return (
      <Seo title="Amova" description={DEFAULT_DESCRIPTION} path={pathname} noIndex />
    );
  }

  const entry = PUBLIC_SEO[pathname];
  if (entry) {
    return (
      <Seo
        title={entry.title}
        description={entry.description}
        path={pathname}
        noIndex={entry.noIndex}
      />
    );
  }

  return (
    <Seo title="Amova" description={DEFAULT_DESCRIPTION} path={pathname} noIndex />
  );
}
