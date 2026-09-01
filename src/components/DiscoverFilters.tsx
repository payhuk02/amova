import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Search, ShieldCheck, Sparkles, Wifi, Heart } from "lucide-react";

export interface DiscoverFiltersState {
  city: string;
  ageMin: string;
  ageMax: string;
  gender: string;
  verifiedOnly: boolean;
  onlineOnly: boolean;
  lookingFor: string;
  hasInterests: string[];
}

interface DiscoverFiltersProps {
  filters: DiscoverFiltersState;
  onChange: (filters: DiscoverFiltersState) => void;
  availableInterests: string[];
  canUseAdvancedFilters?: boolean;
  onPremiumRequired?: () => void;
}

const DiscoverFilters = ({
  filters,
  onChange,
  availableInterests,
  canUseAdvancedFilters = false,
  onPremiumRequired,
}: DiscoverFiltersProps) => {
  const update = (partial: Partial<DiscoverFiltersState>) => onChange({ ...filters, ...partial });

  const requirePremium = (action: () => void) => {
    if (canUseAdvancedFilters) {
      action();
      return;
    }
    onPremiumRequired?.();
  };

  const toggleInterest = (interest: string) => {
    const current = filters.hasInterests;
    if (current.includes(interest)) {
      update({ hasInterests: current.filter((i) => i !== interest) });
    } else {
      update({ hasInterests: [...current, interest] });
    }
  };

  const ageMin = parseInt(filters.ageMin) || 18;
  const ageMax = parseInt(filters.ageMax) || 60;

  return (
    <div className="w-full max-w-sm glass-card rounded-xl p-4 mb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
      {/* City search */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Ville</label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="Rechercher une ville..."
            className="pl-9 h-9 bg-secondary/50 border-border/50 text-sm"
          />
        </div>
      </div>

      {/* Age range slider */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block flex items-center justify-between">
          <span>Tranche d'âge</span>
          <span className="text-foreground/70 tabular-nums font-medium">{ageMin} – {ageMax} ans</span>
        </label>
        <div className="px-1">
          <Slider
            value={[ageMin, ageMax]}
            min={18}
            max={80}
            step={1}
            onValueChange={([min, max]) => update({ ageMin: String(min), ageMax: String(max) })}
            className="w-full"
          />
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Genre</label>
        <div className="flex gap-2">
          {[
            { v: "", l: "Tous" },
            { v: "homme", l: "Homme" },
            { v: "femme", l: "Femme" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => update({ gender: opt.v })}
              className={`flex-1 h-9 rounded-lg border text-xs font-medium transition-all active:scale-[0.97] ${
                filters.gender === opt.v
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/50 bg-secondary/30 text-muted-foreground"
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Looking for */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
          <Heart size={12} /> Recherche
        </label>
        <div className="flex gap-2">
          {[
            { v: "", l: "Tout" },
            { v: "homme", l: "Hommes" },
            { v: "femme", l: "Femmes" },
            { v: "les deux", l: "Les deux" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => update({ lookingFor: opt.v })}
              className={`flex-1 h-8 rounded-lg border text-[11px] font-medium transition-all active:scale-[0.97] ${
                filters.lookingFor === opt.v
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border/50 bg-secondary/30 text-muted-foreground"
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced filters — Premium */}
      <div className="space-y-2 pt-2 border-t border-border/30">
        <p className="text-[10px] uppercase tracking-wider text-champagne/80 font-medium">
          Filtres avancés {!canUseAdvancedFilters && "· Premium"}
        </p>
        <div className="flex items-center justify-between py-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500" />
            Profils vérifiés uniquement
          </label>
          <Switch
            checked={filters.verifiedOnly}
            onCheckedChange={(v) => requirePremium(() => update({ verifiedOnly: v }))}
          />
        </div>
        <div className="flex items-center justify-between py-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Wifi size={13} className="text-emerald-400" />
            En ligne maintenant
          </label>
          <Switch
            checked={filters.onlineOnly}
            onCheckedChange={(v) => requirePremium(() => update({ onlineOnly: v }))}
          />
        </div>
      </div>

      {/* Interest tags */}
      {availableInterests.length > 0 && (
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
            <Sparkles size={12} /> Centres d&apos;intérêt
            {!canUseAdvancedFilters && (
              <span className="text-[10px] text-champagne/70 ml-1">Premium</span>
            )}
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
            {availableInterests.slice(0, 20).map((interest) => (
              <button
                key={interest}
                onClick={() => requirePremium(() => toggleInterest(interest))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-[0.97] ${
                  filters.hasInterests.includes(interest)
                    ? "bg-primary/20 text-foreground border border-primary/30"
                    : "bg-secondary/50 text-muted-foreground border border-border/30 hover:bg-primary/10"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active filters count */}
      {(filters.verifiedOnly || filters.onlineOnly || filters.hasInterests.length > 0 || filters.city || filters.gender || filters.lookingFor) && (
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground">
            {[
              filters.city && "Ville",
              filters.gender && "Genre",
              filters.lookingFor && "Recherche",
              filters.verifiedOnly && "Vérifié",
              filters.onlineOnly && "En ligne",
              filters.hasInterests.length > 0 && `${filters.hasInterests.length} intérêt(s)`,
            ].filter(Boolean).join(" · ")}
          </span>
          <button
            onClick={() => onChange({
              city: "", ageMin: "18", ageMax: "60", gender: "",
              verifiedOnly: false, onlineOnly: false, lookingFor: "", hasInterests: [],
            })}
            className="text-[10px] text-accent hover:text-accent/80 font-medium"
          >
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
};

export default DiscoverFilters;
