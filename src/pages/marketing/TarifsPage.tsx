import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MarketingLayout from "@/components/MarketingLayout";
import Seo, { BreadcrumbJsonLd, SoftwareApplicationJsonLd } from "@/components/Seo";
import { PLAN_PRICES, formatFcfa, PAID_TRIAL } from "@/lib/plans";
import { DEFAULT_KEYWORDS } from "@/lib/seo";

const plans = [
  {
    name: "Gratuit",
    price: "0 FCFA",
    points: [
      "50 swipes / jour",
      "1 Super Like / jour",
      "15 messages / jour",
      "Photos floutées (nettes après match ou Plus)",
    ],
  },
  {
    name: "Plus",
    price: `${formatFcfa(PLAN_PRICES.plus)} / mois`,
    points: [
      "Photos nettes + galerie HD",
      "Voir qui vous aime",
      "Messages illimités",
      "Filtres avancés · 100 swipes / jour",
      "Coach dating IA",
    ],
  },
  {
    name: "Premium",
    price: `${formatFcfa(PLAN_PRICES.premium)} / mois`,
    points: ["Tout Plus", "Swipes illimités", "1 boost / jour"],
  },
  {
    name: "VIP",
    price: `${formatFcfa(PLAN_PRICES.vip)} / mois`,
    points: [
      "Tout Premium",
      "Mode incognito",
      "Matching prioritaire",
      "3 boosts / jour · Spotlight hebdo",
    ],
  },
];

export default function TarifsPage() {
  return (
    <>
      <Seo
        title="Tarifs & abonnements Amova — FCFA / Mobile Money"
        description={`Tarifs Amova en FCFA : Gratuit, Plus ${formatFcfa(PLAN_PRICES.plus)}, Premium ${formatFcfa(PLAN_PRICES.premium)}, VIP ${formatFcfa(PLAN_PRICES.vip)}. Essai Premium ${formatFcfa(PAID_TRIAL.price)}. Paiement Mobile Money.`}
        path="/tarifs"
        keywords={`${DEFAULT_KEYWORDS}, tarifs Amova, abonnement rencontres, Plus Premium VIP, FCFA`}
        jsonLd={[
          BreadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Tarifs", path: "/tarifs" },
          ]),
          SoftwareApplicationJsonLd(),
        ]}
      />
      <MarketingLayout
        title="Tarifs Amova"
        subtitle="Des abonnements clairs en FCFA, payables en Mobile Money. Commencez gratuitement, passez Plus quand vous voulez voir les photos et qui vous aime."
        breadcrumbs={[
          { label: "Accueil", to: "/" },
          { label: "Tarifs" },
        ]}
      >
        <p>
          Amova est un site de rencontres vérifiées homme ↔ femme en Afrique francophone.
          Le plan Gratuit permet de découvrir la plateforme ; les abonnements Plus, Premium et VIP
          débloquent les photos nettes, « Qui m&apos;aime », les messages illimités et plus encore.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 not-prose my-8">
          {plans.map((p) => (
            <article
              key={p.name}
              className="rounded-xl border border-border bg-card p-5 space-y-3"
            >
              <h2 className="font-display text-xl font-medium text-foreground">{p.name}</h2>
              <p className="text-brand font-medium text-sm">{p.price}</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {p.points.map((pt) => (
                  <li key={pt}>· {pt}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <h2 className="font-display text-xl font-medium text-foreground pt-2">
          Essai &amp; passes 24 h
        </h2>
        <p>
          Essai Premium {PAID_TRIAL.days} jours à {formatFcfa(PAID_TRIAL.price)} (une fois par
          compte). Passes à l&apos;unité : Voir qui m&apos;aime, Boost, Spotlight — sans
          engagement mensuel.
        </p>
        <p>
          Réductions : −15&nbsp;% sur le trimestriel, −30&nbsp;% sur l&apos;annuel, depuis
          l&apos;espace Abonnements une fois connecté.
        </p>

        <div className="flex flex-wrap gap-3 pt-4 not-prose">
          <Button variant="hero" asChild>
            <Link to="/auth">Créer mon compte</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/faq">Lire la FAQ</Link>
          </Button>
        </div>
      </MarketingLayout>
    </>
  );
}
