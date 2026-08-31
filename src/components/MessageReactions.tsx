import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const REACTION_EMOJIS = ["❤️", "😂", "🔥", "😮", "😢", "👍"];

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
}

interface MessageReactionsProps {
  messageId: string;
  isSender: boolean;
}

const MessageReactions = ({ messageId, isSender }: MessageReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("message_reactions")
        .select("id, emoji, user_id")
        .eq("message_id", messageId);
      setReactions((data as Reaction[]) || []);
    };
    load();

    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions", filter: `message_id=eq.${messageId}` },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messageId]);

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    const existing = reactions.find((r) => r.user_id === user.id);

    if (existing) {
      if (existing.emoji === emoji) {
        await supabase.from("message_reactions").delete().eq("id", existing.id);
        setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      } else {
        await supabase.from("message_reactions").update({ emoji } as any).eq("id", existing.id);
        setReactions((prev) => prev.map((r) => (r.id === existing.id ? { ...r, emoji } : r)));
      }
    } else {
      const { data } = await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji } as any)
        .select("id, emoji, user_id")
        .single();
      if (data) setReactions((prev) => [...prev, data as Reaction]);
    }
    setShowPicker(false);
  };

  // Group reactions by emoji
  const grouped = reactions.reduce<Record<string, { count: number; mine: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
    acc[r.emoji].count++;
    if (r.user_id === user?.id) acc[r.emoji].mine = true;
    return acc;
  }, {});

  return (
    <div className={`relative flex items-center gap-1 ${isSender ? "justify-end" : "justify-start"}`}>
      {/* Displayed reactions */}
      {Object.entries(grouped).map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          onClick={() => toggleReaction(emoji)}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all active:scale-90 ${
            mine
              ? "bg-primary/15 border border-primary/30"
              : "bg-secondary/50 border border-border/30 hover:bg-secondary/80"
          }`}
        >
          <span className="text-sm">{emoji}</span>
          {count > 1 && <span className="text-[10px] tabular-nums text-muted-foreground">{count}</span>}
        </button>
      ))}

      {/* Add reaction button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground hover:bg-secondary/50 transition-all active:scale-90 text-xs opacity-0 group-hover:opacity-100"
      >
        +
      </button>

      {/* Picker popover */}
      {showPicker && (
        <div
          className={`absolute ${isSender ? "right-0" : "left-0"} bottom-full mb-1 z-20 flex gap-0.5 p-1.5 rounded-xl bg-card border border-border/50 shadow-xl animate-in zoom-in-95 duration-150`}
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-secondary/80 transition-colors active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;
