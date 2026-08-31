import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout, { AdminPageHeader, AdminTable } from "@/components/AdminLayout";
import { Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface EventRow {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  city: string | null;
  event_date: string;
  max_attendees: number;
  created_at: string;
  creator_name?: string;
  attendees_count?: number;
}

export default function AdminEvents() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });

    if (!data) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const creatorIds = [...new Set(data.map((e) => e.creator_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", creatorIds);

    const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.display_name]));

    const eventIds = data.map((e) => e.id);
    const { data: attendees } = await supabase
      .from("event_attendees")
      .select("event_id")
      .in("event_id", eventIds);

    const countMap: Record<string, number> = {};
    attendees?.forEach((a) => {
      countMap[a.event_id] = (countMap[a.event_id] || 0) + 1;
    });

    setEvents(
      data.map((e) => ({
        ...e,
        creator_name: nameMap[e.creator_id] || "Anonyme",
        attendees_count: countMap[e.id] || 0,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet événement ?")) return;

    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Événement supprimé");
    load();
  };

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Événements"
        description="Gérez les événements créés par les utilisateurs"
      />

      <AdminTable>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Titre</th>
                <th className="px-6 py-4">Créateur</th>
                <th className="px-6 py-4">Ville</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Participants</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-secondary/20">
                  <td className="px-6 py-4">
                    <p className="font-medium">{e.title}</p>
                    {e.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{e.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">{e.creator_name}</td>
                  <td className="px-6 py-4">{e.city || "-"}</td>
                  <td className="px-6 py-4">{new Date(e.event_date).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {e.attendees_count}/{e.max_attendees}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Aucun événement
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </AdminTable>
    </AdminLayout>
  );
}
