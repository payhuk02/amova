import LegalLayout from "@/components/legal/LegalLayout";
import { Link } from "react-router-dom";

const faqs = [
  {
    q: "Comment fonctionne la vérification des profils ?",
    a: "Vous pouvez soumettre une demande de vérification depuis votre profil. Notre équipe examine votre photo et vous attribue le badge « Vérifié » une fois validé.",
  },
  {
    q: "Quelle est la différence entre Premium et VIP ?",
    a: "Premium débloque les swipes illimités, les filtres avancés et la liste « Qui m'aime ». VIP ajoute le mode incognito, le matching prioritaire et plus de boosts quotidiens.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui. Nous utilisons le chiffrement, des politiques d'accès strictes (RLS) et une modération active. Vous pouvez exporter ou supprimer vos données à tout moment.",
  },
  {
    q: "Comment signaler un profil ?",
    a: "Depuis un profil ou une conversation, utilisez le bouton « Signaler ». Notre équipe traite chaque signalement sous 24 h.",
  },
  {
    q: "Puis-je utiliser Amova sans partager ma position ?",
    a: "Oui. La géolocalisation est optionnelle et activée uniquement si vous l'autorisez dans les Paramètres.",
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
