import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import Seo, { OrganizationJsonLd, WebsiteJsonLd } from "@/components/Seo";
import { DEFAULT_DESCRIPTION } from "@/lib/seo";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Amova — Rencontres sincères, histoires vraies"
        description={DEFAULT_DESCRIPTION}
        path="/"
        jsonLd={[OrganizationJsonLd(), WebsiteJsonLd()]}
      />
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
