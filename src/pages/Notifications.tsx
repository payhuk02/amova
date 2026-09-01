import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/AppShell";
import ScrollReveal from "@/components/ScrollReveal";
import EmptyState from "@/components/ui/empty-state";
import { Heart, MessageCircle, Sparkles, Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const typeIcons: Record<string, typeof Heart> = {
  match: Heart,
  like: Sparkles,
  message: MessageCircle,
};

const typeColors: Record<string, string> = {
  match: "bg-accent/15 text-accent",
  like: "bg-primary/15 text-copper",
  message: "bg-secondary text-foreground",
};

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  const handleClick = (n: (typeof notifications)[0]) => {
    if (!n.read) markAsRead(n.id);
    if (n.type === "message" && n.related_user_id) {
      navigate(`/messages?with=${n.related_user_id}`);
    } else if ((n.type === "match" || n.type === "like") && n.related_user_id) {
      navigate(`/messages?with=${n.related_user_id}`);
    }
  };

  return (
    <AppShell>
      <main className="container py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6 max-w-2xl">
        <div className="flex items-center justify-between mb-5 sm:mb-8">
          <div>
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-light mb-0.5 sm:mb-1">Activité</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">Vos dernières interactions</p>
          </div>
          {notifications.some((n) => !n.read) && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-muted-foreground touch-manipulation text-xs sm:text-sm h-8 sm:h-9">
              <CheckCheck size={14} />
              <span className="hidden sm:inline">Tout lire</span>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <ScrollReveal>
            <EmptyState
              icon={Bell}
              title="Aucune activité"
              description="Vos likes, matchs et messages apparaîtront ici dès qu'une interaction aura lieu."
            />
          </ScrollReveal>
        ) : (
          <div className="space-y-1.5 sm:space-y-2">
            {notifications.map((n, i) => {
              const Icon = typeIcons[n.type] || Bell;
              const colorClass = typeColors[n.type] || "bg-secondary text-foreground";

              return (
                <ScrollReveal key={n.id} delay={i * 40}>
                  <button
                    onClick={() => handleClick(n)}
                    className={`w-full text-left flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200 touch-manipulation active:scale-[0.98] ${
                      n.read
                        ? "hover:bg-secondary/30"
                        : "bg-primary/[0.04] hover:bg-primary/[0.08] border border-primary/10"
                    }`}
                  >
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs sm:text-sm font-medium ${n.read ? "text-foreground/70" : "text-foreground"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>
                      )}
                      <p className="text-[10px] sm:text-xs text-muted-foreground/60 mt-0.5 sm:mt-1 tabular-nums">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </button>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </main>
    </AppShell>
  );
};

export default Notifications;
