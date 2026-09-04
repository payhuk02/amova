import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  MessageCircle,
  Video,
  Phone,
  ArrowLeft,
  Image as ImageIcon,
  Smile,
  Check,
  CheckCheck,
  Search,
  X,
  Reply,
  Trash2,
  Copy,
  ShieldAlert,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import BlockReportDialog from "@/components/BlockReportDialog";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import MessageReactions from "@/components/MessageReactions";
import VoiceRecorder from "@/components/VoiceRecorder";
import AudioPlayer from "@/components/AudioPlayer";
import IcebreakerButton from "@/components/IcebreakerButton";
import VideoCall from "@/components/VideoCall";
import AudioCall from "@/components/AudioCall";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { isOnline } from "@/hooks/useOnlineStatus";
import type { MessageInsert } from "@/lib/supabase-helpers";
import { getErrorMessage } from "@/lib/supabase-helpers";
import { getLimitErrorMessage } from "@/lib/limits";

interface Match {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  message_type: string;
  audio_url: string | null;
}

interface ConversationMeta {
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

type OutboundCallMode = "video" | "audio";

const EMOJI_CATEGORIES = {
  "❤️ Amour": ["❤️", "😍", "🥰", "😘", "💕", "💖", "💗", "💓", "💋", "🫶", "💘", "💝"],
  "😊 Visages": ["😊", "😂", "🤣", "😁", "😄", "🙃", "😉", "🤗", "🤭", "😇", "🥺", "😜"],
  "🔥 Fun": ["🔥", "✨", "🎉", "🥳", "🌹", "🦋", "🌈", "⭐", "🎶", "💫", "🙈", "🫣"],
  "👋 Gestes": ["👋", "🤝", "👍", "👎", "✌️", "🤞", "🫰", "👏", "🙏", "💪", "🤙", "👀"],
};

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedUserId = searchParams.get("with");

  const [matches, setMatches] = useState<Match[]>([]);
  const [mutualMatchIds, setMutualMatchIds] = useState<Set<string>>(new Set());
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [inCall, setInCall] = useState<OutboundCallMode | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [conversationMeta, setConversationMeta] = useState<Record<string, ConversationMeta>>({});
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [longPressMsg, setLongPressMsg] = useState<string | null>(null);
  const [showBlockReport, setShowBlockReport] = useState(false);
  const { blockedIds, reload: reloadBlocked } = useBlockedUsers();
  const messagesEnd = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();

  const buildConversationMeta = useCallback(
    async (partnerIds: string[]) => {
      if (!user || partnerIds.length === 0) return {} as Record<string, ConversationMeta>;

      const meta: Record<string, ConversationMeta> = {};
      await Promise.all(
        partnerIds.map(async (partnerId) => {
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at, message_type")
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`,
            )
            .order("created_at", { ascending: false })
            .limit(1);

          const { count: unread } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("sender_id", partnerId)
            .eq("receiver_id", user.id)
            .eq("read", false);

          meta[partnerId] = {
            lastMessage: lastMsg?.[0]
              ? lastMsg[0].message_type === "audio"
                ? "🎤 Message vocal"
                : lastMsg[0].message_type === "image"
                  ? "📷 Photo"
                  : lastMsg[0].content
              : "",
            lastMessageTime: lastMsg?.[0]?.created_at || "",
            unreadCount: unread || 0,
          };
        }),
      );
      return meta;
    },
    [user],
  );

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingMatches(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (profile) setMyProfile(profile);

    const { data: myLikes } = await supabase
      .from("likes")
      .select("to_user_id")
      .eq("from_user_id", user.id);

    const likedIds = myLikes?.map((l) => l.to_user_id) ?? [];
    let matchedIds: string[] = [];

    if (likedIds.length > 0) {
      const { data: mutualIds } = await supabase.rpc("get_mutual_match_user_ids");
      matchedIds = (mutualIds as string[] | null) ?? [];
    }

    setMutualMatchIds(new Set(matchedIds));

    const { data: sentMsgs } = await supabase
      .from("messages")
      .select("receiver_id")
      .eq("sender_id", user.id);

    const { data: receivedMsgs } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", user.id);

    const partnerIds = Array.from(
      new Set([
        ...matchedIds,
        ...(sentMsgs?.map((m) => m.receiver_id) ?? []),
        ...(receivedMsgs?.map((m) => m.sender_id) ?? []),
      ]),
    );

    if (partnerIds.length === 0) {
      setMatches([]);
      setConversationMeta({});
      setLoadingMatches(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, last_seen")
      .in("user_id", partnerIds);

    const meta = await buildConversationMeta(partnerIds);
    setConversationMeta(meta);

    const sorted = (profiles || [])
      .filter((p) => !blockedIds.has(p.user_id))
      .sort((a, b) => {
      const tA = meta[a.user_id]?.lastMessageTime || "";
      const tB = meta[b.user_id]?.lastMessageTime || "";
      return tB.localeCompare(tA);
    });

    setMatches(sorted as Match[]);
    setLoadingMatches(false);
  }, [user, buildConversationMeta, blockedIds]);

  // Load conversations list
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Open chat from ?with= even if not yet in sidebar list
  useEffect(() => {
    if (!user || !selectedUserId) return;
    let cancelled = false;

    const ensurePartner = async () => {
      const { data: partner } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, last_seen")
        .eq("user_id", selectedUserId)
        .maybeSingle();

      if (!partner || cancelled) return;

      const meta = await buildConversationMeta([selectedUserId]);
      setConversationMeta((prev) => ({ ...prev, ...meta }));
      setMatches((prev) =>
        prev.some((m) => m.user_id === selectedUserId) ? prev : [partner as Match, ...prev],
      );
    };

    void ensurePartner();
    return () => {
      cancelled = true;
    };
  }, [user, selectedUserId, buildConversationMeta]);

  // Refresh sidebar when new messages arrive
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages-sidebar")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id !== user.id && msg.receiver_id !== user.id) return;
          void loadConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadConversations]);

  // Load messages + realtime
  useEffect(() => {
    if (!user || !selectedUserId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      setMessages((data as Message[]) || []);

      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", selectedUserId)
        .eq("receiver_id", user.id)
        .eq("read", false);

      setConversationMeta((prev) => ({
        ...prev,
        [selectedUserId]: { ...prev[selectedUserId], unreadCount: 0 },
      }));
    };

    loadMessages();

    const channel = supabase
      .channel(`msgs-${selectedUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id && msg.receiver_id === selectedUserId) ||
            (msg.sender_id === selectedUserId && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id === selectedUserId) {
              supabase.from("messages").update({ read: true }).eq("id", msg.id);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    const presenceChannel = supabase.channel(
      `typing-${[user.id, selectedUserId].sort().join("-")}`,
      { config: { presence: { key: user.id } } },
    );
    typingChannelRef.current = presenceChannel;

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const otherPresence = state[selectedUserId];
        setIsTyping(
          Array.isArray(otherPresence) && otherPresence.some((p: { typing?: boolean }) => p.typing === true),
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
      typingChannelRef.current = null;
    };
  }, [user, selectedUserId]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const updateConversationPreview = useCallback(
    (partnerId: string, content: string, messageType: string) => {
      const preview =
        messageType === "audio" ? "🎤 Message vocal" : messageType === "image" ? "📷 Photo" : content;
      setConversationMeta((prev) => ({
        ...prev,
        [partnerId]: {
          lastMessage: preview,
          lastMessageTime: new Date().toISOString(),
          unreadCount: prev[partnerId]?.unreadCount ?? 0,
        },
      }));
    },
    [],
  );

  const broadcastTyping = useCallback(() => {
    const channel = typingChannelRef.current;
    if (!channel) return;
    void channel.track({ typing: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      void channel.track({ typing: false });
    }, 2000);
  }, []);

  const handleMessagingError = (error: unknown) => {
    const limitMsg = getLimitErrorMessage(error as { message?: string });
    if (limitMsg) {
      toast.error(limitMsg, {
        action: {
          label: "Plus",
          onClick: () => navigate("/premium"),
        },
      });
      return;
    }
    const message = getErrorMessage(error);
    if (message.includes("blocked_user")) {
      toast.error("Vous ne pouvez pas envoyer de message à cet utilisateur");
      return;
    }
    if (message.includes("row-level security") || message.includes("matches")) {
      toast.error("Vous devez matcher pour envoyer un message");
      return;
    }
    toast.error("Impossible d'envoyer le message");
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedUserId || sending) return;
    if (blockedIds.has(selectedUserId)) {
      toast.error("Cette conversation est bloquée");
      return;
    }
    if (!mutualMatchIds.has(selectedUserId)) {
      toast.error("Vous devez matcher pour envoyer un message");
      return;
    }

    setSending(true);

    let content = newMessage.trim();
    if (replyTo) {
      const replyPreview = replyTo.content.length > 40 ? replyTo.content.slice(0, 40) + "…" : replyTo.content;
      content = `↩️ ${replyPreview}\n\n${content}`;
    }

    const payload: MessageInsert = {
      sender_id: user.id,
      receiver_id: selectedUserId,
      content,
      message_type: "text",
    };

    const { error } = await supabase.from("messages").insert(payload);
    if (error) {
      handleMessagingError(error);
    } else {
      setNewMessage("");
      setReplyTo(null);
      updateConversationPreview(selectedUserId, content, "text");
    }
    setShowEmoji(false);
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedUserId) return;

    if (blockedIds.has(selectedUserId)) {
      toast.error("Cette conversation est bloquée");
      return;
    }

    if (!mutualMatchIds.has(selectedUserId)) {
      toast.error("Vous devez matcher pour envoyer un message");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5 Mo)");
      return;
    }

    setUploadingImage(true);
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("voice-messages")
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      toast.error("Erreur lors de l'envoi de l'image");
      setUploadingImage(false);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("voice-messages").getPublicUrl(fileName);

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedUserId,
      content: "📷 Photo",
      message_type: "image",
      audio_url: publicUrl.publicUrl,
    } satisfies MessageInsert);

    if (error) handleMessagingError(error);
    else updateConversationPreview(selectedUserId, "📷 Photo", "image");

    setUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVoiceRecorded = async (blob: Blob, durationMs: number) => {
    if (!user || !selectedUserId) return;

    if (blockedIds.has(selectedUserId)) {
      toast.error("Cette conversation est bloquée");
      return;
    }

    if (!mutualMatchIds.has(selectedUserId)) {
      toast.error("Vous devez matcher pour envoyer un message");
      return;
    }

    setUploadingVoice(true);

    const fileName = `${user.id}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("voice-messages")
      .upload(fileName, blob, { contentType: "audio/webm" });

    if (uploadError) {
      toast.error("Erreur lors de l'envoi du vocal");
      setUploadingVoice(false);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("voice-messages").getPublicUrl(fileName);
    const durationSec = Math.ceil(durationMs / 1000);
    const label = `🎤 Message vocal (${durationSec}s)`;

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedUserId,
      content: label,
      message_type: "audio",
      audio_url: publicUrl.publicUrl,
    } satisfies MessageInsert);

    if (error) handleMessagingError(error);
    else updateConversationPreview(selectedUserId, label, "audio");

    setUploadingVoice(false);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copié");
    setLongPressMsg(null);
  };

  const handleReplyMessage = (msg: Message) => {
    setReplyTo(msg);
    setLongPressMsg(null);
    inputRef.current?.focus();
  };

  const handleLongPressStart = (msgId: string) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressMsg(msgId);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const selectedMatch = matches.find((m) => m.user_id === selectedUserId);
  const isBlockedSelected = selectedUserId ? blockedIds.has(selectedUserId) : false;
  const canMessageSelected =
    selectedUserId ? mutualMatchIds.has(selectedUserId) && !isBlockedSelected : false;

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return "Aujourd'hui";
    if (isYesterday(date)) return "Hier";
    return format(date, "d MMMM yyyy", { locale: fr });
  };

  const formatSidebarTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Hier";
    return format(date, "dd/MM");
  };

  const filteredMatches = useMemo(() => {
    const visible = matches.filter((m) => !blockedIds.has(m.user_id));
    if (!searchQuery.trim() || selectedUserId) return visible;
    return visible.filter((m) =>
      m.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [matches, searchQuery, selectedUserId, blockedIds]);

  const messagesWithSeparators = useMemo(() => {
    const result: Array<{ type: "separator"; date: string } | { type: "message"; message: Message }> = [];
    let lastDate = "";

    for (const msg of messages) {
      const msgDate = new Date(msg.created_at);
      const dateKey = format(msgDate, "yyyy-MM-dd");
      if (dateKey !== lastDate) {
        result.push({ type: "separator", date: formatDateSeparator(msgDate) });
        lastDate = dateKey;
      }
      result.push({ type: "message", message: msg });
    }

    return result;
  }, [messages]);

  const searchFilteredMessages = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return messagesWithSeparators;
    return messagesWithSeparators.filter(
      (item) =>
        item.type === "separator" ||
        (item.type === "message" &&
          item.message.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [messagesWithSeparators, showSearch, searchQuery]);

  return (
    <AppShell>
      {inCall === "video" && selectedUserId && selectedMatch && (
        <VideoCall
          remoteUserId={selectedUserId}
          remoteName={selectedMatch.display_name || "Utilisateur"}
          onEnd={() => setInCall(null)}
          isIncoming={false}
        />
      )}
      {inCall === "audio" && selectedUserId && selectedMatch && (
        <AudioCall
          remoteUserId={selectedUserId}
          remoteName={selectedMatch.display_name || "Utilisateur"}
          onEnd={() => setInCall(null)}
          isIncoming={false}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`w-full md:w-80 border-r border-border/30 flex flex-col bg-card/30 ${
            selectedUserId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-border/30">
            <h2 className="font-display text-lg font-medium mb-3">Messages</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={!selectedUserId ? searchQuery : ""}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un match..."
                className="pl-9 h-9 bg-secondary/50 border-border/50 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingMatches ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Chargement...</div>
            ) : filteredMatches.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {matches.length === 0 ? (
                  <div>
                    <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p>Pas encore de matchs</p>
                    <p className="text-xs mt-1 text-muted-foreground/60">Likez des profils pour commencer à discuter !</p>
                  </div>
                ) : "Aucun résultat"}
              </div>
            ) : (
              filteredMatches.map((m) => {
                const meta = conversationMeta[m.user_id];
                const online = isOnline(m.last_seen);

                return (
                  <button
                    key={m.user_id}
                    onClick={() => navigate(`/messages?with=${m.user_id}`)}
                    className={`w-full p-3 sm:p-4 text-left flex items-center gap-3 hover:bg-secondary/50 transition-colors border-b border-border/10 touch-manipulation active:bg-secondary/70 ${
                      selectedUserId === m.user_id ? "bg-secondary/70" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-copper">
                            {m.display_name?.[0]}
                          </span>
                        )}
                      </div>
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                          online ? "bg-emerald-500" : "bg-muted-foreground/30"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`text-sm truncate ${
                            meta?.unreadCount ? "font-semibold text-foreground" : "font-medium"
                          }`}
                        >
                          {m.display_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0 ml-2">
                          {formatSidebarTime(meta?.lastMessageTime || "")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-xs truncate ${
                            meta?.unreadCount
                              ? "text-foreground/80 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {meta?.lastMessage || "Commencez la conversation !"}
                        </p>
                        {meta?.unreadCount > 0 && (
                          <span className="ml-2 shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                            {meta.unreadCount > 9 ? "9+" : meta.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat area */}
        <main className={`flex-1 flex flex-col ${!selectedUserId ? "hidden md:flex" : "flex"}`}>
          {!selectedUserId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-copper mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="font-display text-xl mb-2">Vos conversations</h3>
                <p className="text-muted-foreground text-sm">
                  Sélectionnez un match pour commencer à discuter.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              {selectedMatch ? (
                <div className="p-3 border-b border-border/30 flex items-center gap-3 bg-background/80 backdrop-blur-sm">
                  <button
                    onClick={() => navigate("/messages")}
                    className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                      {selectedMatch.avatar_url ? (
                        <img
                          src={selectedMatch.avatar_url}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-copper">
                          {selectedMatch.display_name?.[0]}
                        </span>
                      )}
                    </div>
                    {isOnline(selectedMatch.last_seen) && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate">
                      {selectedMatch.display_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {isOnline(selectedMatch.last_seen) ? "En ligne" : "Hors ligne"}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors active:scale-95"
                  >
                    <Search size={16} />
                  </button>
                  <button
                    onClick={() => setShowBlockReport(true)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors active:scale-95"
                    title="Bloquer ou signaler"
                  >
                    <ShieldAlert size={16} />
                  </button>
                  <button
                    onClick={() => setInCall("audio")}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors active:scale-95"
                    title="Appel audio"
                    disabled={isBlockedSelected || !canMessageSelected}
                  >
                    <Phone size={16} />
                  </button>
                  <button
                    onClick={() => setInCall("video")}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors active:scale-95"
                    title="Appel vidéo"
                    disabled={isBlockedSelected || !canMessageSelected}
                  >
                    <Video size={16} />
                  </button>
                </div>
              ) : (
                <div className="p-3 border-b border-border/30 text-sm text-muted-foreground">
                  Chargement du profil...
                </div>
              )}

              {isBlockedSelected && selectedMatch && (
                <div className="px-3 py-2 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
                  Cette conversation est bloquée. Vous ne pouvez plus échanger de messages.
                </div>
              )}

              {!canMessageSelected && selectedMatch && !isBlockedSelected && (
                <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-200">
                  Likez mutuellement ce profil pour débloquer la messagerie.
                </div>
              )}

              {/* Search bar in chat */}
              {showSearch && (
                <div className="p-2 border-b border-border/30 flex items-center gap-2 bg-secondary/30">
                  <Search size={14} className="text-muted-foreground shrink-0" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher dans la conversation..."
                    className="h-8 bg-background/50 border-border/50 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1">
                {searchFilteredMessages.map((item, idx) => {
                  if (item.type === "separator") {
                    return (
                      <div key={`sep-${idx}`} className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-border/30" />
                        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                          {item.date}
                        </span>
                        <div className="flex-1 h-px bg-border/30" />
                      </div>
                    );
                  }

                  const msg = item.message;
                  const isSender = msg.sender_id === user?.id;
                  const isAudio = msg.message_type === "audio" && msg.audio_url;
                  const isImage = msg.message_type === "image" && msg.audio_url;
                  const isReply = msg.content.startsWith("↩️ ");
                  const showContextMenu = longPressMsg === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`group flex ${isSender ? "justify-end" : "justify-start"} mb-1 relative`}
                      onPointerDown={() => handleLongPressStart(msg.id)}
                      onPointerUp={handleLongPressEnd}
                      onPointerLeave={handleLongPressEnd}
                    >
                      <div className="max-w-[80%] sm:max-w-[70%]">
                        {/* Reply preview in message */}
                        {isReply && !isAudio && !isImage && (
                          <div className={`text-[10px] px-3 py-1 mb-0.5 rounded-t-xl border-l-2 ${
                            isSender ? "border-primary-foreground/30 bg-primary/80 text-primary-foreground/60" : "border-foreground/20 bg-secondary/50 text-muted-foreground"
                          }`}>
                            {msg.content.split("\n\n")[0].replace("↩️ ", "")}
                          </div>
                        )}

                        <div
                          className={`rounded-2xl text-sm leading-relaxed ${
                            isImage
                              ? "overflow-hidden"
                              : `px-3.5 py-2.5 ${
                                  isSender
                                    ? `bg-primary text-primary-foreground ${isReply ? "rounded-t-none rounded-br-md" : "rounded-br-md"}`
                                    : `bg-secondary/70 text-foreground ${isReply ? "rounded-t-none rounded-bl-md" : "rounded-bl-md"}`
                                }`
                          }`}
                        >
                          {isImage ? (
                            <img
                              src={msg.audio_url!}
                              alt="Photo"
                              className="max-w-full rounded-2xl max-h-72 sm:max-h-80 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(msg.audio_url!, "_blank")}
                            />
                          ) : isAudio ? (
                            <AudioPlayer src={msg.audio_url!} isSender={isSender} />
                          ) : (
                            <span className="whitespace-pre-wrap break-words">
                              {isReply ? msg.content.split("\n\n").slice(1).join("\n\n") : msg.content}
                            </span>
                          )}
                        </div>

                        {/* Context menu */}
                        {showContextMenu && (
                          <div className={`absolute z-50 ${isSender ? "right-0" : "left-0"} mt-1 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150`}>
                            <button
                              onClick={() => handleReplyMessage(msg)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary/70 w-full text-left transition-colors"
                            >
                              <Reply size={14} /> Répondre
                            </button>
                            <button
                              onClick={() => handleCopyMessage(msg.content)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary/70 w-full text-left transition-colors"
                            >
                              <Copy size={14} /> Copier
                            </button>
                          </div>
                        )}

                        {/* Reactions */}
                        <MessageReactions messageId={msg.id} isSender={isSender} />

                        <div
                          className={`flex items-center gap-1 mt-0.5 ${
                            isSender ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                            {format(new Date(msg.created_at), "HH:mm")}
                          </span>
                          {isSender && (
                            <span className="text-muted-foreground/40">
                              {msg.read ? (
                                <CheckCheck size={12} className="text-primary/70" />
                              ) : (
                                <Check size={12} />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick reply button on hover (desktop) */}
                      <button
                        onClick={() => handleReplyMessage(msg)}
                        className={`hidden group-hover:flex items-center justify-center w-7 h-7 rounded-full bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all self-center mx-1 ${
                          isSender ? "order-first" : "order-last"
                        }`}
                      >
                        <Reply size={12} />
                      </button>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex justify-start mb-1">
                    <div className="bg-secondary/70 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEnd} />
              </div>

              {/* Close context menu on tap outside */}
              {longPressMsg && (
                <div className="fixed inset-0 z-40" onClick={() => setLongPressMsg(null)} />
              )}

              {/* Reply preview bar */}
              {replyTo && (
                <div className="px-3 py-2 border-t border-border/20 bg-secondary/20 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150">
                  <Reply size={14} className="text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {replyTo.sender_id === user?.id ? "Vous" : selectedMatch?.display_name} : {replyTo.content}
                  </p>
                  <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Emoji picker */}
              {showEmoji && (
                <div className="border-t border-border/20 bg-card/80 backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-200">
                  {/* Category tabs */}
                  <div className="flex gap-0.5 px-2 pt-2 overflow-x-auto no-scrollbar">
                    {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setEmojiCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                          emojiCategory === cat ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-2 flex flex-wrap gap-1">
                    {(EMOJI_CATEGORIES as any)[emojiCategory]?.map((emoji: string) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setNewMessage((prev) => prev + emoji);
                        }}
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-secondary/80 transition-colors active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-2 sm:p-3 border-t border-border/30 bg-background/80 safe-area-bottom">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-1 sm:gap-1.5 items-center"
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage || sending || !canMessageSelected}
                    className="h-10 w-10 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all active:scale-95 disabled:opacity-50 shrink-0 touch-manipulation"
                  >
                    {uploadingImage ? (
                      <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ImageIcon size={16} />
                    )}
                  </button>

                  <VoiceRecorder
                    onRecorded={handleVoiceRecorded}
                    disabled={uploadingVoice || sending || !canMessageSelected}
                    onError={() => toast.error("Autorisez le micro pour envoyer un vocal")}
                  />

                  <button
                    type="button"
                    onClick={() => setShowEmoji(!showEmoji)}
                    className={`h-10 w-10 rounded-xl border border-border/50 flex items-center justify-center transition-all active:scale-95 shrink-0 touch-manipulation ${
                      showEmoji ? "bg-primary/10 text-foreground border-primary/30" : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                    }`}
                  >
                    <Smile size={16} />
                  </button>

                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      broadcastTyping();
                    }}
                    placeholder={replyTo ? "Répondre..." : "Message..."}
                    className="flex-1 h-10 bg-secondary/50 border-border/50 text-sm"
                    disabled={!canMessageSelected}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    disabled={sending || !newMessage.trim() || !canMessageSelected}
                  >
                    <Send size={16} />
                  </Button>
                </form>

                {messages.length === 0 && myProfile && selectedMatch && (
                  <div className="mt-2">
                    <IcebreakerButton
                      userProfile={myProfile}
                      targetProfile={selectedMatch}
                      onSelect={(text) => setNewMessage(text)}
                    />
                  </div>
                )}
                {uploadingVoice && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                    <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Envoi du vocal en cours...
                  </p>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {selectedMatch && (
        <BlockReportDialog
          open={showBlockReport}
          onClose={() => setShowBlockReport(false)}
          targetUserId={selectedMatch.user_id}
          targetName={selectedMatch.display_name || "Utilisateur"}
          onBlocked={() => {
            void reloadBlocked();
            void loadConversations();
            navigate("/messages");
          }}
        />
      )}
    </AppShell>
  );
};

export default Messages;
