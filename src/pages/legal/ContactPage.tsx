import LegalLayout from "@/components/legal/LegalLayout";
import { Mail, MessageCircle, Shield } from "lucide-react";

const ContactPage = () => (
  <LegalLayout title="Contact">
    <p>
      Notre équipe est disponible pour vous accompagner sur Amova. Choisissez le canal adapté à
      votre demande.
    </p>
    <div className="grid gap-4 mt-8 not-prose">
      <a
        href="mailto:contact@amova.space"
        className="glass-card rounded-xl p-5 flex items-start gap-4 hover:border-champagne/30 transition-colors"
      >
        <Mail className="text-champagne shrink-0 mt-0.5" size={22} />
        <div>
          <p className="font-medium text-foreground">Support général</p>
          <p className="text-sm text-muted-foreground mt-1">contact@amova.space</p>
        </div>
      </a>
      <a
        href="mailto:moderation@amova.space"
        className="glass-card rounded-xl p-5 flex items-start gap-4 hover:border-champagne/30 transition-colors"
      >
        <Shield className="text-champagne shrink-0 mt-0.5" size={22} />
        <div>
          <p className="font-medium text-foreground">Modération & signalements</p>
          <p className="text-sm text-muted-foreground mt-1">moderation@amova.space</p>
        </div>
      </a>
      <a
        href="mailto:partenaires@amova.space"
        className="glass-card rounded-xl p-5 flex items-start gap-4 hover:border-champagne/30 transition-colors"
      >
        <MessageCircle className="text-champagne shrink-0 mt-0.5" size={22} />
        <div>
          <p className="font-medium text-foreground">Partenariats & presse</p>
          <p className="text-sm text-muted-foreground mt-1">partenaires@amova.space</p>
        </div>
      </a>
    </div>
    <p className="text-sm mt-8">Délai de réponse moyen : 24 à 48 heures ouvrées.</p>
  </LegalLayout>
);

export default ContactPage;
