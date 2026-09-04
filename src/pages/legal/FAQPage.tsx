import LegalLayout from "@/components/legal/LegalLayout";
import { Link } from "react-router-dom";
import { PLAN_PRICES, CONSUMABLE_PRICES, PAID_TRIAL, formatFcfa } from "@/lib/plans";

const faqs = [
  {
    q: "Qu’est-ce qui est gratuit sur Amova ?",
    a: "Le plan Gratuit permet de découvrir la plateforme : 50 swipes/jour, 1 Super Like/jour, 15 messages/jour. Les photos de profil sont floutées ; la galerie HD et « Qui m’aime » sont réservés aux abonnés Plus (ou débloqués après un match).",
  },
  {
    q: "Puis-je essayer Premium avant de m’abonner ?",
    a: `Oui : un essai Premium payant de ${PAID_TRIAL.days} jours à ${formatFcfa(PAID_TRIAL.price)}, une seule fois par compte (si vous n’avez jamais eu d’abonnement payant).`,
  },
  {
    q: "Quelle est la différence entre Plus, Premium et VIP ?",
    a: `Plus (${formatFcfa(PLAN_PRICES.plus)}/mois) : galerie photos, voir qui vous aime, messages illimités, filtres avancés, 100 swipes/jour. Premium (${formatFcfa(PLAN_PRICES.premium)}/mois) : swipes illimités + 1 boost/jour. VIP (${formatFcfa(PLAN_PRICES.vip)}/mois) : mode incognito, matching prioritaire et 3 boosts/jour.`,
  },
  {
    q: "Puis-je payer sans m’abonner ?",
    a: `Oui. Des passes 24h sont disponibles : Voir qui m’aime (${formatFcfa(CONSUMABLE_PRICES.likes_reveal_24h)}), Boost (${formatFcfa(CONSUMABLE_PRICES.boost_24h)}), Spotlight (${formatFcfa(CONSUMABLE_PRICES.spotlight_24h)}).`,
  },
  {
    q: "Y a-t-il des réductions sur les abonnements longs ?",
    a: "Oui : −15 % sur le trimestriel et −30 % sur l’annuel, depuis la page Abonnements.",
  },
  {
    q: "Comment fonctionne la vérification des profils ?",
    a: "Depuis Vérification, vous envoyez une pièce d’identité (recto/verso), un selfie caméra en direct et des photos récentes. Un administrateur valide manuellement — pas d’approbation automatique.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui. Nous utilisons le chiffrement, des politiques d’accès strictes (RLS) et une modération active. Vous pouvez exporter ou supprimer vos données à tout moment.",
  },
  {
    q: "Comment signaler un profil ?",
    a: "Depuis un profil ou une conversation, utilisez le bouton « Signaler ». Notre équipe traite chaque signalement sous 24 h.",
  },
  {
    q: "Puis-je utiliser Amova sans partager ma position ?",
    a: "Oui. La géolocalisation est optionnelle et activée uniquement si vous l’autorisez dans les Paramètres.",
  },
];

const FAQPage = () => (
  <LegalLayout title="Foire aux questions">
    <div className="space-y-8">
      {faqs.map((item) => (
        <div key={item.q}>
          <h2 className="font-display text-lg text-foreground mb-2">{item.q}</h2>
          <p>{item.a}</p>
        </div>
      ))}
    </div>
    <p className="mt-10">
      Une autre question ?{" "}
      <Link to="/contact" className="text-champagne hover:underline">
        Contactez-nous
      </Link>
      .
    </p>
  </LegalLayout>
);

export default FAQPage;
