import { lazy, Suspense } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import Seo, { OrganizationJsonLd, WebsiteJsonLd } from "@/components/Seo";
import { DEFAULT_DESCRIPTION } from "@/lib/seo";

const HowItWorksSection = lazy(() => import("@/components/landing/HowItWorksSection"));
const FeaturesSection = lazy(() => import("@/components/landing/FeaturesSection"));
const PricingSection = lazy(() => import("@/components/landing/PricingSection"));
const TestimonialsSection = lazy(() => import("@/components/landing/TestimonialsSection"));
const CTASection = lazy(() => import("@/components/landing/CTASection"));
const Footer = lazy(() => import("@/components/landing/Footer"));

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
      <Suspense fallback={null}>
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
