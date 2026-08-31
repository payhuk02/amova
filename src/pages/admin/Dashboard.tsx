import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Flag, Heart, MessageSquare, Crown, ShieldCheck,
  CreditCard, Calendar, Zap, TrendingUp,
} from "lucide-react";
import AdminLayout, { AdminPageHeader } from "@/components/AdminLayout";
import type { AdminStats } from "@/lib/admin";
import { formatFcfa } from "@/lib/admin";

const statCards = [
  { key: "users_count" as const, label: "Utilisateurs", icon: Users, color: "text-primary bg-primary/20" },
  { key: "premium_users" as const, label: "Abonnés Premium/VIP", icon: Crown, color: "text-amber-500 bg-amber-500/20" },
  { key: "reports_pending" as const, label: "Signalements en attente", icon: Flag, color: "text-red-500 bg-red-500/20" },
  { key: "verifications_pending" as const, label: "Vérifications en attente", icon: ShieldCheck, color: "text-blue-500 bg-blue-500/20" },
  { key: "likes_count" as const, label: "Likes envoyés", icon: Heart, color: "text-copper bg-copper/20" },
  { key: "matches_count" as const, label: "Matchs mutuels", icon: Heart, color: "text-pink-500 bg-pink-500/20" },
  { key: "messages_count" as const, label: "Messages", icon: MessageSquare, color: "text-indigo-500 bg-indigo-500/20" },
  { key: "events_count" as const, label: "Événements", icon: Calendar, color: "text-teal-500 bg-teal-500/20" },
  { key: "stories_active" as const, label: "Stories actives", icon: Zap, color: "text-purple-500 bg-purple-500/20" },
  { key: "payments_paid" as const, label: "Paiements réussis", icon: CreditCard, color: "text-emerald-500 bg-emerald-500/20" },
  { key: "speed_dating_active" as const, label: "Speed dating actif", icon: Users, color: "text-orange-500 bg-orange-500/20" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const { data, error } = await supabase.rpc("admin_get_stats");
      if (!error && data) {
        setStats(data as AdminStats);
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité de la plateforme"
      />

      {stats && (
        <div className="glass-card p-5 rounded-2xl mb-6 flex items-center gap-4 border border-emerald-500/20">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="text-emerald-500" size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Revenus totaux</p>
            <p className="text-2xl font-bold text-emerald-500">{formatFcfa(stats.revenue_total)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {statCards.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="glass-card p-5 rounded-2xl flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-medium truncate">{label}</p>
                <p className="text-2xl font-bold">{stats?.[key] ?? 0}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
