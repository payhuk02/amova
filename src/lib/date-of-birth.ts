/** Profile date-of-birth helpers (18+ dating platform). */

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function ageFromDateOfBirth(dob: Date | string, at: Date = new Date()): number {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  let age = at.getFullYear() - d.getFullYear();
  const m = at.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < d.getDate())) age -= 1;
  return age;
}

export function parseDobParts(
  year: string,
  month: string,
  day: string,
): { iso: string; age: number } | { error: string } {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (!y || !m || !d) return { error: "Indiquez le jour, le mois et l'année de naissance." };
  if (y < 1900 || y > new Date().getFullYear()) return { error: "Année de naissance invalide." };
  if (m < 1 || m > 12) return { error: "Mois invalide." };
  const maxDay = daysInMonth(y, m);
  if (d < 1 || d > maxDay) return { error: "Jour invalide pour ce mois." };

  const iso = `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d
    .toString()
    .padStart(2, "0")}`;
  const age = ageFromDateOfBirth(iso);
  if (age < 18) return { error: "Amova est réservé aux personnes majeures (18 ans et plus)." };
  if (age > 120) return { error: "Date de naissance invalide." };
  return { iso, age };
}

export function splitIsoDate(iso: string | null | undefined): {
  year: string;
  month: string;
  day: string;
} {
  if (!iso) return { year: "", month: "", day: "" };
  const [year, month, day] = iso.slice(0, 10).split("-");
  return { year: year || "", month: month || "", day: day || "" };
}

export function formatDobFr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const { year, month, day } = splitIsoDate(iso);
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
}

export const MONTH_LABELS_FR = [
  { value: "01", label: "Janvier" },
  { value: "02", label: "Février" },
  { value: "03", label: "Mars" },
  { value: "04", label: "Avril" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" },
  { value: "08", label: "Août" },
  { value: "09", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
] as const;
