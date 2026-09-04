/** Shared onboarding / profile preference options (Amova FR). */

export const RELATIONSHIP_TYPES = [
  { value: "monogamie", label: "Monogamie" },
  { value: "polygamie", label: "Polygamie" },
  { value: "a_decider", label: "À décider ensemble" },
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]["value"];

export const OCCUPATION_SECTORS = [
  { value: "fonctionnaire", label: "Fonctionnaire" },
  { value: "prive", label: "Secteur privé" },
  { value: "independant", label: "Indépendant / Entrepreneur" },
  { value: "etudiant", label: "Étudiant(e)" },
  { value: "autre", label: "Autre" },
] as const;

export type OccupationSector = (typeof OCCUPATION_SECTORS)[number]["value"];

export const RELIGIONS = [
  { value: "islam", label: "Islam" },
  { value: "christianisme", label: "Christianisme" },
  { value: "autre", label: "Autre" },
  { value: "non_precise", label: "Préfère ne pas dire" },
] as const;

export const COUNTRIES_FR = [
  "Burkina Faso",
  "Côte d'Ivoire",
  "Sénégal",
  "Mali",
  "Niger",
  "Togo",
  "Bénin",
  "Guinée",
  "Cameroun",
  "Gabon",
  "Congo",
  "RDC",
  "Maroc",
  "France",
  "Autre",
] as const;

export const PARTNER_PREFERENCE_OPTIONS = [
  "Respectueux/se",
  "Fidèle",
  "Croyant(e)",
  "Ambitieux/se",
  "Familial(e)",
  "Travailleur/se",
  "Souriant(e)",
  "Éduqué(e)",
  "Sportif/ve",
  "Discret/ète",
  "Généreux/se",
  "Sérieux/se",
] as const;

export function labelForRelationship(value: string | null | undefined): string {
  return RELATIONSHIP_TYPES.find((o) => o.value === value)?.label ?? "—";
}

export function labelForSector(value: string | null | undefined): string {
  return OCCUPATION_SECTORS.find((o) => o.value === value)?.label ?? "—";
}

export function labelForReligion(value: string | null | undefined): string {
  return RELIGIONS.find((o) => o.value === value)?.label ?? value ?? "—";
}
