/** Heterosexual matching helpers (homme ↔ femme). */

export type BinaryGender = "homme" | "femme";

export function oppositeGender(gender: string | null | undefined): BinaryGender | null {
  const g = (gender || "").trim().toLowerCase();
  if (g === "homme") return "femme";
  if (g === "femme") return "homme";
  return null;
}

export function lookingForLabel(lookingFor: string | null | undefined): string {
  const g = (lookingFor || "").trim().toLowerCase();
  if (g === "homme") return "Hommes";
  if (g === "femme") return "Femmes";
  return "—";
}

export function genderLabel(gender: string | null | undefined): string {
  const g = (gender || "").trim().toLowerCase();
  if (g === "homme") return "Homme";
  if (g === "femme") return "Femme";
  return "—";
}
