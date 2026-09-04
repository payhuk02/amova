import LegalLayout from "@/components/legal/LegalLayout";

const TermsPage = () => (
  <LegalLayout title="Conditions d'utilisation">
    <p>
      En utilisant Amova, vous acceptez les présentes conditions. Amova est une plateforme de
      rencontres réservée aux personnes majeures (18 ans et plus).
    </p>
    <h2 className="font-display text-xl text-foreground mt-8 mb-3">Comportement attendu</h2>
    <ul className="list-disc pl-5 space-y-2">
      <li>Respecter les autres membres et la modération</li>
      <li>Ne pas publier de contenu illégal, haineux, explicite non consenti ou frauduleux</li>
      <li>Utiliser votre véritable identité et des photos récentes vous représentant</li>
      <li>Ne pas solliciter d&apos;argent ou promouvoir des services externes</li>
    </ul>
    <h2 className="font-display text-xl text-foreground mt-8 mb-3">Abonnements</h2>
    <p>
      Les formules Plus, Premium et VIP sont facturées via Moneyfusion (mensuel, trimestriel ou
      annuel). Un essai Premium payant de courte durée peut être proposé une seule fois. Des
      passes ponctuelles (likes, boost, spotlight) sont également disponibles. Les avantages sont
      détaillés sur la page Abonnements. Aucun remboursement n&apos;est dû pour une période déjà
      entamée, sauf disposition légale contraire.
    </p>
    <h2 className="font-display text-xl text-foreground mt-8 mb-3">Suspension et résiliation</h2>
    <p>
      Nous pouvons suspendre ou supprimer un compte en cas de violation des règles, de signalements
      avérés ou de comportement mettant en danger la communauté. Vous pouvez supprimer votre
      compte à tout moment depuis les Paramètres.
    </p>
    <h2 className="font-display text-xl text-foreground mt-8 mb-3">Limitation de responsabilité</h2>
    <p>
      Amova facilite les rencontres mais ne garantit pas de résultat. Les interactions hors
      plateforme relèvent de votre responsabilité. Signalez tout comportement suspect via
      l&apos;outil intégré.
    </p>
    <p className="text-xs text-muted-foreground/60 pt-4">Dernière mise à jour : septembre 2026</p>
  </LegalLayout>
);

export default TermsPage;
