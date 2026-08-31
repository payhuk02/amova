import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Flag, Heart } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    usersCount: 0,
    reportsCount: 0,
    likesCount: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: reportsCount } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: likesCount } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true });

      setStats({
        usersCount: usersCount || 0,
        reportsCount: reportsCount || 0,
        likesCount: likesCount || 0,
      });
    }
    loadStats();
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-3xl font-display font-semibold mb-8">Tableau de bord</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Users size={28} />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">Utilisateurs inscrits</p>
            <p className="text-3xl font-bold">{stats.usersCount}</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
            <Flag size={28} />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">Signalements en attente</p>
            <p className="text-3xl font-bold">{stats.reportsCount}</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-copper/20 flex items-center justify-center text-copper">
            <Heart size={28} />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">Likes envoyés</p>
            <p className="text-3xl font-bold">{stats.likesCount}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
