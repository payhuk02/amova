import MarketingLayout from "@/components/MarketingLayout";
import Seo, { BreadcrumbJsonLd } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { SITE_URL } from "@/lib/seo";

const MP4 = "/promo/amova-30s.mp4";
const WEBM = "/promo/amova-30s.webm";

export default function PromoVideoPage() {
  return (
    <>
      <Seo
        title="Vidéo promo Amova (30 s)"
        description="Téléchargez la vidéo de présentation Amova — rencontres vérifiées homme ↔ femme en Afrique."
        path="/video"
        jsonLd={BreadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Vidéo", path: "/video" },
        ])}
      />
      <MarketingLayout
        title="Vidéo promo"
        subtitle="Présentation Amova en 30 secondes — à regarder ou télécharger pour vos réseaux."
        breadcrumbs={[
          { label: "Accueil", to: "/" },
          { label: "Vidéo" },
        ]}
      >
        <div className="not-prose space-y-6">
          <video
            className="w-full rounded-xl border border-border bg-black aspect-video object-contain"
            controls
            playsInline
            preload="metadata"
            poster="/og-image.jpg"
          >
            <source src={MP4} type="video/mp4" />
            <source src={WEBM} type="video/webm" />
            Votre navigateur ne lit pas la vidéo.
          </video>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Button variant="hero" asChild>
              <a href={MP4} download="amova-promo-30s.mp4">
                <Download className="h-4 w-4 mr-2" aria-hidden />
                Télécharger MP4
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={WEBM} download="amova-promo-30s.webm">
                <Download className="h-4 w-4 mr-2" aria-hidden />
                Télécharger WebM
              </a>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Fichier sans audio · 1920×1080 · ~30 s · Lien direct :{" "}
            <a
              className="text-brand hover:underline break-all"
              href={`${SITE_URL}${MP4}`}
            >
              {SITE_URL}
              {MP4}
            </a>
          </p>
        </div>
      </MarketingLayout>
    </>
  );
}
