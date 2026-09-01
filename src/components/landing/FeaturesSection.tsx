import { Shield, Eye, Heart, Lock, MessageCircle, Sparkles } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const features = [
  {
    icon: Shield,
    title: "Profils vérifiés",
    description: "Chaque membre peut faire vérifier son identité pour plus de confiance.",
  },
  {
    icon: Eye,
    title: "Modération active",
    description: "Notre équipe surveille les signalements et intervient sous 24h.",
  },
  {
    icon: Lock,
    title: "Données protégées",
    description: "Vos informations personnelles sont sécurisées et jamais revendues.",
  },
  {
    icon: Heart,
    title: "Matching intelligent",
    description: "Notre algorithme suggère des profils compatibles avec vos critères.",
  },
  {
    icon: MessageCircle,
    title: "Messagerie sécurisée",
    description: "Échangez en toute sérénité dans un espace privé et modéré.",
  },
  {
    icon: Sparkles,
    title: "Événements & communauté",
    description: "Participez à des rencontres organisées pour élargir votre cercle.",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 md:py-32 bg-secondary/20">
    <div className="container">
      <ScrollReveal className="text-center mb-16 md:mb-20">
        <p className="text-champagne-light text-sm uppercase tracking-[0.25em] mb-4">Ce qui nous distingue</p>
        <h2 className="font-display text-4xl md:text-5xl font-light">
          La confiance comme <span className="text-gradient-copper italic">fondation</span>
        </h2>
      </ScrollReveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {features.map((feature, i) => (
          <ScrollReveal key={feature.title} delay={i * 80}>
            <div className="glass-card rounded-2xl p-6 md:p-8 h-full hover:border-champagne/20 transition-all duration-300 group cursor-default">
              <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-champagne mb-5 group-hover:text-champagne-light transition-colors duration-300" strokeWidth={1.5} />
              <h3 className="font-display text-lg md:text-xl font-medium mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
