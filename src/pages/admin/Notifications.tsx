import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout, { AdminPageHeader } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Users } from "lucide-react";

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState("");
  const [broadcast, setBroadcast] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    setSending(true);
    const { data, error } = await supabase.rpc("admin_send_notification", {
      p_title: title.trim(),
      p_body: body.trim(),
      p_user_id: broadcast ? null : userId.trim() || null,
    });

    if (error) {
      toast.error("Erreur lors de l'envoi");
      console.error(error);
      setSending(false);
      return;
    }

    toast.success(
      broadcast
        ? `Notification envoyée à ${data} utilisateur(s)`
        : "Notification envoyée",
    );
    setTitle("");
    setBody("");
    setUserId("");
    setSending(false);
  };

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Notifications"
        description="Envoyez des annonces à tous les utilisateurs ou à un utilisateur spécifique"
      />

      <div className="max-w-xl">
        <div className="glass-card p-6 rounded-2xl space-y-5">
          <div className="flex gap-3">
            <button
              onClick={() => setBroadcast(true)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                broadcast ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              <Users size={18} />
              Tous les utilisateurs
            </button>
            <button
              onClick={() => setBroadcast(false)}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                !broadcast ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              Utilisateur spécifique
            </button>
          </div>

          {!broadcast && (
            <div className="space-y-2">
              <Label htmlFor="userId">ID utilisateur (UUID)</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="971506a0-d83e-45ad-ba47-6dcbe9ed73a4"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nouvelle fonctionnalité disponible !"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Contenu de la notification..."
              rows={4}
            />
          </div>

          <Button onClick={handleSend} disabled={sending} className="w-full gap-2">
            <Send size={16} />
            {sending ? "Envoi..." : "Envoyer la notification"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
