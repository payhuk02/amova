import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Eye,
  Users,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  RefreshCw,
  Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout, { AdminPageHeader, AdminTable } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { countryFlagEmoji, countryLabel } from "@/lib/countries";

type TopPage = { path: string; views: number; sessions: number };
type TopReferrer = { referrer: string; views: number };
type TopCountry = { country_code: string; views: number; sessions: number };
type DayRow = { day: string; views: number; sessions: number };
type RecentRow = {
  path: string;
  referrer_host: string | null;
  is_authed: boolean;
  device: string;
  country_code: string | null;
  created_at: string;
};

type VisitorStats = {
  period_days: number;
  visits_today: number;
  unique_sessions_today: number;
  visits_period: number;
  unique_sessions_period: number;
  authed_visits_period: number;
  devices: Record<string, number>;
  top_countries: TopCountry[];
  top_pages: TopPage[];
  top_referrers: TopReferrer[];
  by_day: DayRow[];
  recent: RecentRow[];
};

const PERIODS = [
  { days: 1, label: "24 h" },
  { days: 7, label: "7 j" },
  { days: 30, label: "30 j" },
  { days: 90, label: "90 j" },
] as const;

function deviceIcon(device: string) {
  if (device === "mobile") return Smartphone;
  if (device === "tablet") return Tablet;
  if (device === "desktop") return Monitor;
  return Eye;
}

export default function AdminVisitors() {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_visitor_stats", {
      p_days: days,
    });
    if (error) {
      toast.error(error.message || "Impossible de charger les visiteurs");
      setStats(null);
    } else {
      setStats(data as VisitorStats);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const authedPct =
    stats && stats.visits_period > 0
      ? Math.round((stats.authed_visits_period / stats.visits_period) * 100)
      : 0;

  const maxDayViews = Math.max(1, ...(stats?.by_day.map((d) => d.views) ?? [1]));

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <AdminPageHeader
          title="Visiteurs"
          description="Trafic sur la plateforme (pages vues, sessions, pays). Données first-party, sans adresse IP."
        />
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {PERIODS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={days === p.days ? "default" : "outline"}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="text-center text-muted-foreground py-12">Chargement...</div>
      ) : !stats ? (
        <div className="text-center text-muted-foreground py-12">
          Aucune donnée pour le moment. Les visites s&apos;accumulent dès que des utilisateurs
          naviguent sur le site.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Eye}
              color="text-primary bg-primary/20"
              label="Pages vues (aujourd'hui)"
              value={stats.visits_today}
            />
            <StatCard
              icon={Users}
              color="text-emerald-500 bg-emerald-500/20"
              label="Sessions uniques (aujourd'hui)"
              value={stats.unique_sessions_today}
            />
            <StatCard
              icon={Eye}
              color="text-indigo-500 bg-indigo-500/20"
              label={`Pages vues (${stats.period_days} j)`}
              value={stats.visits_period}
            />
            <StatCard
              icon={Users}
              color="text-amber-500 bg-amber-500/20"
              label={`Sessions (${stats.period_days} j)`}
              value={stats.unique_sessions_period}
              hint={`${authedPct}% connectés`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-5 lg:col-span-2">
              <h2 className="font-display text-lg font-medium mb-4">Activité par jour</h2>
              {stats.by_day.length === 0 ? (
                <p className="text-sm text-muted-foreground">Pas encore de données.</p>
              ) : (
                <div className="flex items-end gap-1.5 h-36">
                  {stats.by_day.map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <span className="text-[9px] text-muted-foreground tabular-nums">
                        {d.views}
                      </span>
                      <div
                        className="w-full rounded-t bg-primary/80 min-h-[4px] transition-all"
                        style={{ height: `${Math.max(8, (d.views / maxDayViews) * 100)}%` }}
                        title={`${d.day}: ${d.views} vues, ${d.sessions} sessions`}
                      />
                      <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                        {String(d.day).slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-5">
              <h2 className="font-display text-lg font-medium mb-4">Appareils</h2>
              <ul className="space-y-3">
                {(["desktop", "mobile", "tablet", "unknown"] as const).map((key) => {
                  const Icon = deviceIcon(key);
                  const n = stats.devices[key] ?? 0;
                  const pct =
                    stats.visits_period > 0 ? Math.round((n / stats.visits_period) * 100) : 0;
                  return (
                    <li key={key} className="flex items-center gap-3 text-sm">
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                        <Icon size={16} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="capitalize font-medium">{key === "unknown" ? "Autre" : key}</p>
                        <div className="h-1.5 rounded-full bg-secondary mt-1 overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="tabular-nums text-muted-foreground">{n}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h2 className="font-display text-lg font-medium mb-3 flex items-center gap-2">
                <Globe size={18} className="text-muted-foreground" />
                Pays de provenance
              </h2>
              <AdminTable>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Pays</th>
                      <th className="px-4 py-3 font-medium text-right">Vues</th>
                      <th className="px-4 py-3 font-medium text-right">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.top_countries?.length ?? 0) === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                          Les pays apparaîtront sur les prochaines visites.
                        </td>
                      </tr>
                    )}
                    {(stats.top_countries ?? []).map((c) => (
                      <tr key={c.country_code} className="border-b border-border/30 last:border-0">
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-2">
                            <span aria-hidden>{countryFlagEmoji(c.country_code)}</span>
                            <span className="font-medium">{countryLabel(c.country_code)}</span>
                            {c.country_code !== "??" && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {c.country_code}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{c.views}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {c.sessions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTable>
            </div>

            <div>
              <h2 className="font-display text-lg font-medium mb-3">Sources (referrers)</h2>
              <AdminTable>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium text-right">Vues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_referrers.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                          —
                        </td>
                      </tr>
                    )}
                    {stats.top_referrers.map((r) => (
                      <tr key={r.referrer} className="border-b border-border/30 last:border-0">
                        <td className="px-4 py-2.5 flex items-center gap-1.5 truncate max-w-[260px]">
                          {r.referrer !== "(direct)" && (
                            <ExternalLink size={12} className="text-muted-foreground shrink-0" />
                          )}
                          {r.referrer}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.views}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTable>
            </div>
          </div>

          <div>
            <h2 className="font-display text-lg font-medium mb-3">Pages les plus vues</h2>
            <AdminTable>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Page</th>
                    <th className="px-4 py-3 font-medium text-right">Vues</th>
                    <th className="px-4 py-3 font-medium text-right">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_pages.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                        —
                      </td>
                    </tr>
                  )}
                  {stats.top_pages.map((p) => (
                    <tr key={p.path} className="border-b border-border/30 last:border-0">
                      <td className="px-4 py-2.5 font-mono text-xs truncate max-w-[220px]">
                        {p.path}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{p.views}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {p.sessions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTable>
          </div>

          <div>
            <h2 className="font-display text-lg font-medium mb-3">Activité récente</h2>
            <AdminTable>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Quand</th>
                    <th className="px-4 py-3 font-medium">Page</th>
                    <th className="px-4 py-3 font-medium">Pays</th>
                    <th className="px-4 py-3 font-medium">Appareil</th>
                    <th className="px-4 py-3 font-medium">Compte</th>
                    <th className="px-4 py-3 font-medium">Referrer</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((r, i) => (
                    <tr key={`${r.created_at}-${i}`} className="border-b border-border/30 last:border-0">
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(r.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">{r.path}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden>{countryFlagEmoji(r.country_code)}</span>
                          <span className="text-xs">{countryLabel(r.country_code)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 capitalize">{r.device}</td>
                      <td className="px-4 py-2.5">
                        {r.is_authed ? (
                          <span className="text-emerald-600 text-xs font-medium">Connecté</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Visiteur</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[160px]">
                        {r.referrer_host || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTable>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  hint,
}: {
  icon: typeof Eye;
  color: string;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium truncate">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value.toLocaleString("fr-FR")}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
