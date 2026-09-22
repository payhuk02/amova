/** ISO country labels (FR) for admin visitor analytics. */
const COUNTRY_NAMES_FR: Record<string, string> = {
  CI: "Côte d'Ivoire",
  SN: "Sénégal",
  BJ: "Bénin",
  TG: "Togo",
  BF: "Burkina Faso",
  ML: "Mali",
  NE: "Niger",
  GN: "Guinée",
  GW: "Guinée-Bissau",
  MR: "Mauritanie",
  CM: "Cameroun",
  GA: "Gabon",
  CG: "Congo",
  CD: "RD Congo",
  CF: "Centrafrique",
  TD: "Tchad",
  GQ: "Guinée équatoriale",
  ST: "Sao Tomé",
  FR: "France",
  BE: "Belgique",
  CH: "Suisse",
  CA: "Canada",
  US: "États-Unis",
  GB: "Royaume-Uni",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
  PT: "Portugal",
  MA: "Maroc",
  DZ: "Algérie",
  TN: "Tunisie",
  NG: "Nigéria",
  GH: "Ghana",
  AE: "Émirats arabes unis",
  SA: "Arabie saoudite",
  "??": "Inconnu",
};

export function countryLabel(code: string | null | undefined): string {
  if (!code) return "Inconnu";
  const c = code.toUpperCase();
  return COUNTRY_NAMES_FR[c] ?? c;
}

export function countryFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2 || code === "??") return "🌍";
  const c = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  const a = 0x1f1e6 + (c.charCodeAt(0) - 65);
  const b = 0x1f1e6 + (c.charCodeAt(1) - 65);
  return String.fromCodePoint(a, b);
}
