import LegalLayout from "@/components/legal/LegalLayout";

const PrivacyPage = () => (
  <LegalLayout title="Politique de confidentialité">
    <p>
      Amova (« nous ») s&apos;engage à protéger vos données personnelles. Cette politique décrit
      comment nous collectons, utilisons et sécurisons vos informations dans le cadre de notre
      service de rencontres homme ↔ femme.
    </p>
    <h2 className="font-display text-xl text-foreground mt-8 mb-3">Données collectées</h2>
    <ul className="list-disc pl-5 space-y-2">
      <li>Informations de compte : email, mot de passe (chiffré), identifiant utilisateur</li>
      <li>Profil : prénom, âge, ville, bio, photos, centres d&apos;intérêt, préférences</li>
      <li>Activité : likes, matchs, messages, participation aux événements</li>
      <li>Localisation : uniquement si vous l&apos;activez explicitement</li>
      <li>Paiements : transactions via notre prestataire Moneyfusion (nous ne stockons pas vos données bancaires)</li>
    </ul>
    <h2 className="font-display text-xl text-foreground mt-8 mb-3">Utilisation des données</h2>
    <p>
      Vos données servent à vous proposer des matchs pertinents, assurer la modération, la sécurité
      de la plateforme, le support client et l&apos;amélioration du service. Nous ne vendons pas vos
      données à des tiers.
    </p>
    <h2 className="font-display text-xl text-foreground mt-8 mb-3">Vos droits (RGPD)</h2>
    <p>
      Vous pouvez accéder, rectifier, exporter ou supprimer vos données depuis les Paramètres de
      l&apos;application. Pour toute demande : <a href="mailto:contact@amova.space" className="text-champagne hover:underline">contact@amova.space</a>.
    </p>
    <h2 className="font-display text-xl text-foreground mt-8 mb-3">Conservation</h2>
    <p>
      Les données sont conservées tant que votre compte est actif. Après suppression, elles sont
      effacées sous 30 jours, sauf obligations légales de conservation.
    </p>
    <p className="text-xs text-muted-foreground/60 pt-4">Dernière mise à jour : septembre 2026</p>
  </LegalLayout>
);

export default PrivacyPage;
