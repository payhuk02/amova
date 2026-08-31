import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Trash2, User, Search } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  age: number;
  city: string;
  created_at: string;
  avatar_url: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    
    if (search) {
      query = query.ilike("display_name", `%${search}%`);
    }

    const { data } = await query;
    if (data) {
      setUsers(data as any[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, [search]);

  const handleDelete = async (userId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible.")) return;

    // Delete from profiles
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    
    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    } else {
      toast.success("Utilisateur supprimé");
      setUsers(users.filter(u => u.user_id !== userId));
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-semibold mb-2">Utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les membres de la plateforme</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un nom..." 
            className="pl-10 pr-4 py-2 bg-secondary/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-secondary/30 rounded-2xl border border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Âge</th>
                <th className="px-6 py-4">Ville</th>
                <th className="px-6 py-4">Inscription</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users.map((u) => (
                <tr key={u.user_id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground"><User size={18}/></div>
                      )}
                    </div>
                    <span className="font-medium text-foreground">{u.display_name || 'Anonyme'}</span>
                  </td>
                  <td className="px-6 py-4">{u.age || '-'}</td>
                  <td className="px-6 py-4">{u.city || '-'}</td>
                  <td className="px-6 py-4">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(u.user_id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
