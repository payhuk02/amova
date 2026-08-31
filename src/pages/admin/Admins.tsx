import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout, { AdminPageHeader, AdminTable } from "@/components/AdminLayout";
import { Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AdminUser {
  user_id: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminAdmins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, is_admin, created_at")
      .order("created_at", { ascending: false });

    if (data) {
      setAdmins(data as AdminUser[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (userId: string, current: boolean) => {
    const action = current ? "retirer les droits admin" : "promouvoir admin";
    if (!confirm(`Voulez-vous ${action} pour cet utilisateur ?`)) return;

    const { error } = await supabase.rpc("admin_set_admin", {
      p_user_id: userId,
      p_is_admin: !current,
    });

    if (error) {
      toast.error(error.message.includes("own") ? "Impossible de retirer vos propres droits" : "Erreur");
      return;
    }

    toast.success(current ? "Droits admin retirés" : "Utilisateur promu admin");
    load();
  };

  const adminList = admins.filter((a) => a.is_admin);
  const regularUsers = admins.filter((a) => !a.is_admin);

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Administrateurs"
        description="Gérez les accès au panneau d'administration"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-4 rounded-xl">
          <p className="text-xs text-muted-foreground">Administrateurs actifs</p>
          <p className="text-2xl font-bold">{adminList.length}</p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <p className="text-xs text-muted-foreground">Utilisateurs standards</p>
          <p className="text-2xl font-bold">{regularUsers.length}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Administrateurs</h2>
      <AdminTable>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Inscription</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {adminList.map((a) => (
                <tr key={a.user_id} className="hover:bg-secondary/20">
                  <td className="px-6 py-4">
                    <span className="font-medium">{a.display_name || "Anonyme"}</span>
                    {a.user_id === user?.id && (
                      <span className="ml-2 text-xs text-primary">(vous)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">{new Date(a.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4 text-right">
                    {a.user_id !== user?.id && (
                      <button
                        onClick={() => handleToggle(a.user_id, true)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                        title="Retirer les droits admin"
                      >
                        <ShieldOff size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {adminList.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">Aucun admin</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </AdminTable>

      <h2 className="text-lg font-semibold mb-4 mt-8">Promouvoir un utilisateur</h2>
      <AdminTable>
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
            <tr>
              <th className="px-6 py-4">Utilisateur</th>
              <th className="px-6 py-4">Inscription</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {regularUsers.map((a) => (
              <tr key={a.user_id} className="hover:bg-secondary/20">
                <td className="px-6 py-4 font-medium">{a.display_name || "Anonyme"}</td>
                <td className="px-6 py-4">{new Date(a.created_at).toLocaleDateString("fr-FR")}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleToggle(a.user_id, false)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                    title="Promouvoir admin"
                  >
                    <Shield size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTable>
    </AdminLayout>
  );
}
