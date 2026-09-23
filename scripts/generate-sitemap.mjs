import { writeFileSync } from "node:fs";

/** Mirror of SEO_COUNTRIES + SEO_CITIES slugs from src/lib/seo.ts */
const countries = [
  "algerie", "angola", "benin", "botswana", "burkina-faso", "burundi",
  "cabo-verde", "cameroun", "centrafrique", "comores", "congo", "cote-divoire",
  "djibouti", "egypte", "erythree", "eswatini", "ethiopie", "gabon", "gambie",
  "ghana", "guinee", "guinee-bissau", "guinee-equatoriale", "kenya", "lesotho",
  "liberia", "libye", "madagascar", "malawi", "mali", "maroc", "maurice",
  "mauritanie", "mozambique", "namibie", "niger", "nigeria", "ouganda",
  "rd-congo", "rwanda", "sao-tome", "senegal", "seychelles", "sierra-leone",
  "somalie", "soudan", "soudan-du-sud", "afrique-du-sud", "tanzanie", "tchad",
  "togo", "tunisie", "zambie", "zimbabwe",
];

const cities = ["abidjan", "dakar", "lome", "cotonou", "ouagadougou", "bamako"];

const today = "2026-09-23";
const urls = [
  { loc: "https://www.amova.space/", priority: "1.0", freq: "weekly" },
  { loc: "https://www.amova.space/tarifs", priority: "0.95", freq: "weekly" },
  { loc: "https://www.amova.space/verification-identite", priority: "0.9", freq: "monthly" },
  { loc: "https://www.amova.space/rencontres", priority: "0.95", freq: "weekly" },
  ...countries.map((slug) => ({
    loc: `https://www.amova.space/rencontres/${slug}`,
    priority: "0.8",
    freq: "monthly",
  })),
  ...cities.map((slug) => ({
    loc: `https://www.amova.space/rencontres/${slug}`,
    priority: "0.85",
    freq: "monthly",
  })),
  { loc: "https://www.amova.space/faq", priority: "0.85", freq: "weekly" },
  { loc: "https://www.amova.space/contact", priority: "0.7", freq: "monthly" },
  { loc: "https://www.amova.space/conditions", priority: "0.4", freq: "yearly" },
  { loc: "https://www.amova.space/confidentialite", priority: "0.4", freq: "yearly" },
  { loc: "https://www.amova.space/llms.txt", priority: "0.3", freq: "monthly" },
];

const body = urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n");

writeFileSync(
  "public/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`,
);

console.log(`Wrote ${urls.length} URLs (${countries.length} countries, ${cities.length} cities)`);
