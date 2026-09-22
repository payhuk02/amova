import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MarketingLayout from "@/components/MarketingLayout";
import Seo, { BreadcrumbJsonLd } from "@/components/Seo";
import { DEFAULT_KEYWORDS } from "@/lib/seo";

const steps = [
  {
    title: "Pièce d'identité",
    text: "Vous transmettez le recto et le verso d'une pièce officielle. Les documents restent confidentiels et accessibles uniquement à l'équipe de validation.",
  },
  {
    title: "Selfie en direct",
    text: "Une photo prise en direct confirme que le profil vous appartient réellement — pas une photo récupérée ailleurs.",
  },
  {
    title: "Validation humaine",
    text: "Un administrateur compare les éléments et valide le badge. Aucune validation automatique opaque.",
  },
];

export default function VerificationSeoPage() {
  return (
    <>
      <Seo
        title="Vérification d'identité manuelle — Profils authentiques | Amova"
        description="Comment Amova vérifie les profils : pièce d'identité, selfie live et validation humaine. Pourquoi les rencontres vérifiées réduisent les faux comptes en Afrique."
        path="/verification-identite"
        keywords={`${DEFAULT_KEYWORDS}, vérification identité, KYC dating, profils authentiques, badge vérifié`}
        jsonLd={BreadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Vérification d'identité", path: "/verification-identite" },
        ])}
      />
      <MarketingLayout
        title="Vérification d'identité"
        subtitle="Sur Amova, le badge « vérifié » n'est pas un algorithme opaque : un humain compare votre pièce, votre selfie live et votre profil."
        breadcrumbs={[
          { label: "Accueil", to: "/" },
          { label: "Vérification d'identité" },
        ]}
      >
        <p>
          Les sites de rencontres en Afrique souffrent souvent de faux profils et de photos
          usurpées. Amova a choisi une vérification manuelle pour les membres qui demandent le
          badge — un signal de confiance visible pour les autres utilisateurs.
        </p>

        <h2 className="font-display text-xl font-medium text-foreground pt-4">
          Les 3 étapes
        </h2>
        <ol className="space-y-5 list-none p-0 m-0">
          {steps.map((s, i) => (
            <li key={s.title} className="border-l-2 border-brand/40 pl-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Étape {i + 1}
              </p>
              <h3 className="font-display text-lg font-medium text-foreground mb-1">
                {s.title}
              </h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>

        <h2 className="font-display text-xl font-medium text-foreground pt-4">
          Ce que la vérification n&apos;est pas
        </h2>
        <p>
          Ce n&apos;est pas un scan Sumsub externalisé, ni une approbation automatique. Les
          documents ne sont pas revendus. Vous gardez le contrôle : export et suppression de
          compte restent disponibles dans les paramètres.
        </p>

        <h2 className="font-display text-xl font-medium text-foreground pt-4">
          Matching homme ↔ femme
        </h2>
        <p>
          Amova est réservé aux rencontres hétérosexuelles entre adultes (18+). Les hommes
          voient uniquement des femmes, et inversement — clairement annoncé avant inscription.
        </p>

        <div className="flex flex-wrap gap-3 pt-4 not-prose">
          <Button variant="hero" asChild>
            <Link to="/auth">Rejoindre Amova</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/tarifs">Voir les tarifs</Link>
          </Button>
        </div>
      </MarketingLayout>
    </>
  );
}
