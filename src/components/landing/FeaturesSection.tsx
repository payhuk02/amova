import { Shield, Eye, Heart, Lock, MessageCircle, Sparkles } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const features = [
  {
    icon: Shield,
    title: "Anonymat garanti",
    description: "Votre identité reste protégée jusqu'à ce que vous décidiez de la révéler.",
  },
  {
    icon: Eye,
    title: "Profils vérifiés",
    description: "Chaque membre passe par un processus de vérification rigoureux.",
  },
  {
    icon: Lock,
    title: "Chiffrement total",
    description: "Messages protégés par un chiffrement de bout en bout.",
  },
  {
    icon: Heart,
    title: "Matching intelligent",
    description: "Notre algorithme apprend vos préférences pour des connexions profondes.",
  },
  {
    icon: MessageCircle,
    title: "Messages éphémères",
    description: "Mode éphémère — vos messages disparaissent après lecture.",
  },
  {
    icon: Sparkles,
    title: "Événements exclusifs",
    description: "Soirées privées dans des lieux d'exception pour nos membres.",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 md:py-32 bg-secondary/20">
    <div className="container">
      <ScrollReveal className="text-center mb-16 md:mb-20">
        <p className="text-copper-light text-sm uppercase tracking-[0.25em] mb-4">Ce qui nous distingue</p>
        <h2 className="font-display text-4xl md:text-5xl font-light">
          La discrétion comme <span className="text-gradient-copper italic">philosophie</span>
        </h2>
      </ScrollReveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {features.map((feature, i) => (
          <ScrollReveal key={feature.title} delay={i * 80}>
            <div className="glass-card rounded-xl p-6 md:p-8 h-full hover:border-primary/30 transition-all duration-300 group cursor-default">
              <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-copper mb-5 group-hover:text-copper-light transition-colors duration-300" strokeWidth={1.5} />
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
