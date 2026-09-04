import { useMemo } from "react";
import { daysInMonth, MONTH_LABELS_FR } from "@/lib/date-of-birth";
import { cn } from "@/lib/utils";

interface DateOfBirthFieldsProps {
  day: string;
  month: string;
  year: string;
  onChange: (parts: { day: string; month: string; year: string }) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const selectClass =
  "h-11 sm:h-12 w-full rounded-lg border border-border/50 bg-secondary/50 px-2 sm:px-3 text-sm text-foreground focus:outline-none focus:border-primary/50";

export default function DateOfBirthFields({
  day,
  month,
  year,
  onChange,
  disabled,
  required,
  className,
}: DateOfBirthFieldsProps) {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 18;
  const minYear = currentYear - 100;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) list.push(y);
    return list;
  }, [maxYear, minYear]);

  const maxDay = month && year ? daysInMonth(parseInt(year, 10), parseInt(month, 10)) : 31;
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

  const set = (partial: Partial<{ day: string; month: string; year: string }>) => {
    const next = { day, month, year, ...partial };
    if (next.day && next.month && next.year) {
      const md = daysInMonth(parseInt(next.year, 10), parseInt(next.month, 10));
      if (parseInt(next.day, 10) > md) next.day = String(md).padStart(2, "0");
    }
    onChange(next);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs sm:text-sm text-muted-foreground block">
        Date de naissance {required ? "" : "(optionnel)"}
      </label>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div>
          <span className="sr-only">Jour</span>
          <select
            value={day}
            disabled={disabled}
            required={required}
            onChange={(e) => set({ day: e.target.value.padStart(2, "0") })}
            className={selectClass}
          >
            <option value="">Jour</option>
            {days.map((d) => (
              <option key={d} value={String(d).padStart(2, "0")}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="sr-only">Mois</span>
          <select
            value={month}
            disabled={disabled}
            required={required}
            onChange={(e) => set({ month: e.target.value })}
            className={selectClass}
          >
            <option value="">Mois</option>
            {MONTH_LABELS_FR.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="sr-only">Année</span>
          <select
            value={year}
            disabled={disabled}
            required={required}
            onChange={(e) => set({ year: e.target.value })}
            className={selectClass}
          >
            <option value="">Année</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-[10px] sm:text-xs text-muted-foreground">
        Réservé aux majeurs (18+). Cette date ne pourra plus être modifiée après validation.
      </p>
    </div>
  );
}
