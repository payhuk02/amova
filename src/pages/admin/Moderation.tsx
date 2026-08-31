import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout, { AdminPageHeader, AdminTable } from "@/components/AdminLayout";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

type Tab = "messages" | "stories";

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

interface StoryRow {
  id: string;
  user_id: string;
  media_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  author_name?: string;
}

export default function AdminModeration() {
  const [tab, setTab] = useState<Tab>("messages");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadMessages() {
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!data) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.flatMap((m) => [m.sender_id, m.receiver_id]))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.display_name]));

    setMessages(
      data.map((m) => ({
        ...m,
        sender_name: nameMap[m.sender_id] || "Anonyme",
      })),
    );
    setLoading(false);
  }

  async function loadStories() {
    setLoading(true);
    const { data } = await supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) {
      setStories([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.display_name]));

    setStories(
      data.map((s) => ({
        ...s,
        author_name: nameMap[s.user_id] || "Anonyme",
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (tab === "messages") loadMessages();
    else loadStories();
  }, [tab]);

  const handleDeleteMessage = async (id: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Message supprimé");
    loadMessages();
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm("Supprimer cette story ?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Story supprimée");
    loadStories();
  };

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Modération"
        description="Surveillez et modérez les contenus de la plateforme"
      />

      <div className="flex gap-2 mb-6">
        {([
          { key: "messages" as const, label: "Messages" },
          { key: "stories" as const, label: "Stories" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === key ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <AdminTable>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : tab === "messages" ? (
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Expéditeur</th>
                <th className="px-6 py-4">Contenu</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {messages.map((m) => (
                <tr key={m.id} className="hover:bg-secondary/20">
                  <td className="px-6 py-4 font-medium">{m.sender_name}</td>
                  <td className="px-6 py-4 max-w-md truncate">{m.content}</td>
                  <td className="px-6 py-4">{new Date(m.created_at).toLocaleString("fr-FR")}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteMessage(m.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Aucun message</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Auteur</th>
                <th className="px-6 py-4">Média</th>
                <th className="px-6 py-4">Légende</th>
                <th className="px-6 py-4">Expire</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stories.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/20">
                  <td className="px-6 py-4 font-medium">{s.author_name}</td>
                  <td className="px-6 py-4">
                    <a href={s.media_url} target="_blank" rel="noopener noreferrer">
                      <img src={s.media_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    </a>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate">{s.caption || "-"}</td>
                  <td className="px-6 py-4">{new Date(s.expires_at).toLocaleString("fr-FR")}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteStory(s.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {stories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Aucune story</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </AdminTable>
    </AdminLayout>
  );
}
