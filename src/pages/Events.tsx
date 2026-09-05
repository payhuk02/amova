import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarDays, MapPin, Users, Plus, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import AppShell from "@/components/AppShell";

interface EventRow {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  city: string;
  event_date: string;
  max_attendees: number;
  image_url: string | null;
  created_at: string;
}

interface Attendee {
  event_id: string;
  user_id: string;
}

const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    city: "",
    event_date: "",
    max_attendees: "20",
  });

  const loadEvents = async () => {
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true });

    setEvents((eventsData as EventRow[]) || []);

    const { data: attendeesData } = await supabase
      .from("event_attendees")
      .select("event_id, user_id");

    setAttendees((attendeesData as Attendee[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreate = async () => {
    if (!user || !form.title.trim() || !form.city.trim() || !form.event_date) return;
    setCreating(true);

    const { error } = await supabase.from("events").insert({
      creator_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      city: form.city.trim(),
      event_date: new Date(form.event_date).toISOString(),
      max_attendees: parseInt(form.max_attendees) || 20,
    } as any);

    if (error) {
      toast.error("Erreur lors de la création");
    } else {
      toast.success("Événement créé !");
      setShowCreate(false);
      setForm({ title: "", description: "", city: "", event_date: "", max_attendees: "20" });
      loadEvents();
    }
    setCreating(false);
  };

  const handleJoin = async (eventId: string) => {
    if (!user) return;
    const { error } = await supabase.from("event_attendees").insert({
      event_id: eventId,
      user_id: user.id,
    } as any);

    if (error) {
      if (error.code === "23505") toast.info("Vous participez déjà");
      else toast.error("Erreur");
    } else {
      toast.success("Vous participez !");
      loadEvents();
    }
  };

  const handleLeave = async (eventId: string) => {
    if (!user) return;
    await supabase
      .from("event_attendees")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);
    toast.success("Participation annulée");
    loadEvents();
  };

  const getAttendeeCount = (eventId: string) =>
    attendees.filter((a) => a.event_id === eventId).length;

  const isJoined = (eventId: string) =>
    attendees.some((a) => a.event_id === eventId && a.user_id === user?.id);

  if (loading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="container max-w-2xl py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between mb-5 sm:mb-8">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-light">Événements</h1>
          <Button variant="default" size="sm" onClick={() => setShowCreate(!showCreate)} className="touch-manipulation text-xs sm:text-sm h-8 sm:h-9">
            {showCreate ? <X size={14} /> : <Plus size={14} />}
            {showCreate ? "Annuler" : "Créer"}
          </Button>
        </div>

        {showCreate && (
            <div className="glass-card rounded-xl p-4 sm:p-6 mb-5 sm:mb-8 space-y-3 sm:space-y-4">
              <h2 className="font-display text-lg sm:text-xl font-medium">Nouvel événement</h2>
              <div>
                <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Titre</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Soirée, randonnée, apéro..."
                  className="h-11 sm:h-12 bg-secondary/50 border-border/50 text-base"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez votre événement..."
                  rows={3}
                  className="w-full rounded-lg border border-border/50 bg-secondary/50 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Ville</label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Paris"
                    className="h-11 sm:h-12 bg-secondary/50 border-border/50 text-base"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Places max</label>
                  <Input
                    type="number"
                    min={2}
                    max={100}
                    value={form.max_attendees}
                    onChange={(e) => setForm((f) => ({ ...f, max_attendees: e.target.value }))}
                    className="h-11 sm:h-12 bg-secondary/50 border-border/50 tabular-nums text-base"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Date et heure</label>
                <Input
                  type="datetime-local"
                  value={form.event_date}
                  onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                  className="h-11 sm:h-12 bg-secondary/50 border-border/50 text-base"
                />
              </div>
              <Button
                variant="hero"
                size="xl"
                className="w-full touch-manipulation"
                onClick={handleCreate}
                disabled={creating || !form.title.trim() || !form.city.trim() || !form.event_date}
              >
                {creating ? "Création..." : "Créer l'événement"}
              </Button>
            </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <CalendarDays className="w-10 h-10 sm:w-12 sm:h-12 text-copper mx-auto mb-3 sm:mb-4" strokeWidth={1.5} />
            <h2 className="font-display text-lg sm:text-xl mb-2">Aucun événement à venir</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Créez le premier événement de votre communauté !
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {events.map((event) => {
              const count = getAttendeeCount(event.id);
              const joined = isJoined(event.id);
              const isFull = count >= (event.max_attendees || 20);
              const isCreator = event.creator_id === user?.id;

              return (
                  <div key={event.id} className="glass-card rounded-xl p-4 sm:p-5 space-y-2 sm:space-y-3">
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <h3 className="font-display text-base sm:text-lg font-medium">{event.title}</h3>
                      {isCreator && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary/15 text-[9px] sm:text-[10px] font-medium text-primary">
                          Organisateur
                        </span>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 sm:gap-1.5">
                        <CalendarDays size={13} />
                        {format(new Date(event.event_date), "d MMM yyyy", { locale: fr })}
                      </span>
                      <span className="flex items-center gap-1 sm:gap-1.5">
                        <Clock size={13} />
                        {format(new Date(event.event_date), "HH:mm")}
                      </span>
                      <span className="flex items-center gap-1 sm:gap-1.5">
                        <MapPin size={13} />
                        {event.city}
                      </span>
                      <span className="flex items-center gap-1 sm:gap-1.5">
                        <Users size={13} />
                        {count}/{event.max_attendees || 20}
                      </span>
                    </div>

                    {!isCreator && (
                      <div className="pt-1">
                        {joined ? (
                          <Button variant="outline" size="sm" onClick={() => handleLeave(event.id)} className="border-border/50 touch-manipulation text-xs h-8 sm:h-9">
                            Annuler ma participation
                          </Button>
                        ) : (
                          <Button variant="default" size="sm" onClick={() => handleJoin(event.id)} disabled={isFull} className="touch-manipulation text-xs h-8 sm:h-9">
                            {isFull ? "Complet" : "Participer"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
              );
            })}
          </div>
        )}
      </main>
    </AppShell>
  );
};

export default Events;
