import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Atmosphere from "@/components/landing/Atmosphere";

interface MarketingLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  breadcrumbs?: { label: string; to?: string }[];
}

/** Public marketing / SEO pages — brand shell without app chrome. */
export default function MarketingLayout({
  title,
  subtitle,
  children,
  breadcrumbs,
}: MarketingLayoutProps) {
  return (
    <div className="amova-canvas min-h-screen relative">
      <Atmosphere />
      <Navbar />
      <main className="container max-w-3xl py-24 md:py-28 px-4 relative z-10">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Fil d'Ariane" className="mb-6 text-xs text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1.5">
              {breadcrumbs.map((crumb, i) => (
                <li key={crumb.label} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden>/</span>}
                  {crumb.to ? (
                    <Link to={crumb.to} className="hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Retour à l&apos;accueil
        </Link>
        <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-foreground mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base md:text-lg text-muted-foreground mb-10 leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
        <div className="space-y-6 text-muted-foreground leading-relaxed text-sm md:text-base">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
