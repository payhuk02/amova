import { useLocation } from "react-router-dom";
import Seo from "@/components/Seo";
import { DEFAULT_DESCRIPTION } from "@/lib/seo";

const PUBLIC_SEO: Record<string, { title: string; description: string; noIndex?: boolean }> = {
  "/": {
    title: "Amova — Rencontres sincères, histoires vraies",
    description: DEFAULT_DESCRIPTION,
  },
  "/auth": {
    title: "Connexion & inscription",
    description:
      "Créez votre compte Amova ou connectez-vous pour rencontrer des profils vérifiés en Afrique.",
    noIndex: true,
  },
  "/faq": {
    title: "FAQ — Questions fréquentes",
    description:
      "Réponses sur les abonnements Amova, la vérification d'identité, les messages, la sécurité et Mobile Money.",
  },
  "/contact": {
    title: "Contact & support",
    description: "Contactez l'équipe Amova pour toute question sur votre compte, un paiement ou la sécurité.",
  },
  "/conditions": {
    title: "Conditions d'utilisation",
    description: "Conditions générales d'utilisation de la plateforme de rencontres Amova.",
  },
  "/confidentialite": {
    title: "Politique de confidentialité",
    description: "Comment Amova collecte, utilise et protège vos données personnelles (RGPD).",
  },
};

/** Applies SEO for known public routes; private app routes are noindex. */
export default function RouteSeo() {
  const { pathname } = useLocation();
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

  // Authenticated / admin surfaces should not be indexed
  return (
    <Seo
      title="Amova"
      description={DEFAULT_DESCRIPTION}
      path={pathname}
      noIndex
    />
  );
}
