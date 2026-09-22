import { lazy, Suspense } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import Atmosphere from "@/components/landing/Atmosphere";
import Seo, { OrganizationJsonLd, WebsiteJsonLd } from "@/components/Seo";
import { DEFAULT_DESCRIPTION } from "@/lib/seo";

const TrustKycSection = lazy(() => import("@/components/landing/TrustKycSection"));
const HowItWorksSection = lazy(() => import("@/components/landing/HowItWorksSection"));
const FeaturesSection = lazy(() => import("@/components/landing/FeaturesSection"));
const PricingSection = lazy(() => import("@/components/landing/PricingSection"));
const TestimonialsSection = lazy(() => import("@/components/landing/TestimonialsSection"));
const CTASection = lazy(() => import("@/components/landing/CTASection"));
const Footer = lazy(() => import("@/components/landing/Footer"));

const Index = () => {
  return (
    <div className="amova-canvas min-h-screen">
      <Atmosphere />
      <Seo
        title="Amova — Rencontres sincères, histoires vraies"
        description={DEFAULT_DESCRIPTION}
        path="/"
        jsonLd={[OrganizationJsonLd(), WebsiteJsonLd()]}
      />
      <Navbar />
      <HeroSection />
      <Suspense fallback={null}>
        <div className="section-depth">
          <TrustKycSection />
          <HowItWorksSection />
          <FeaturesSection />
          <PricingSection />
          <TestimonialsSection />
          <CTASection />
          <Footer />
        </div>
      </Suspense>
    </div>
  );
};

export default Index;
