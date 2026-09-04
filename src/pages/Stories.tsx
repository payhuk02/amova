import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Eye, Image, Trash2, Send, Heart, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import BlurredPhoto from "@/components/BlurredPhoto";
import { useSubscription } from "@/hooks/useSubscription";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
  view_count?: number;
}

interface StoryGroup {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  stories: Story[];
}

const Stories = () => {
  const { user } = useAuth();
  const { limits } = useSubscription();
  const blurPhotos = !limits.canViewFullGallery;
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<{ group: StoryGroup; index: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setTimeout>>();
  const startTimeRef = useRef<number>(0);
  const remainingTimeRef = useRef<number>(5000);

  const loadStories = async () => {
    if (!user) return;

    const { data: stories } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!stories) { setLoading(false); return; }

    const userIds = [...new Set(stories.map(s => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Load view counts for own stories
    const myStoryIds = stories.filter(s => s.user_id === user.id).map(s => s.id);
    if (myStoryIds.length > 0) {
      const { data: views } = await supabase
        .from("story_views")
        .select("story_id")
        .in("story_id", myStoryIds);
      
      const counts: Record<string, number> = {};
      (views || []).forEach(v => {
        counts[v.story_id] = (counts[v.story_id] || 0) + 1;
      });
      setViewCounts(counts);
    }

    const grouped: Record<string, StoryGroup> = {};
    for (const s of stories) {
      const p = profileMap.get(s.user_id);
      if (!grouped[s.user_id]) {
        grouped[s.user_id] = {
          user_id: s.user_id,
          display_name: p?.display_name || null,
          avatar_url: p?.avatar_url || null,
          stories: [],
        };
      }
      grouped[s.user_id].stories.push(s as Story);
    }

    const allGroups = Object.values(grouped);
    const mine = allGroups.filter(g => g.user_id === user.id);
    const others = allGroups.filter(g => g.user_id !== user.id);
    setMyStories(mine[0]?.stories || []);
    setGroups([...mine, ...others]);
    setLoading(false);
  };

  useEffect(() => { loadStories(); }, [user]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("stories").upload(path, file, {
      contentType: file.type,
    });

    if (upErr) {
      toast.error("Erreur lors de l'upload");
      setUploading(false);
      return;
    }

    const { data: url } = supabase.storage.from("stories").getPublicUrl(path);

    const { error } = await supabase.from("stories").insert({
      user_id: user.id,
      media_url: url.publicUrl,
      caption: caption || null,
    } as any);

    if (error) {
      toast.error("Erreur lors de la création");
    } else {
      toast.success("Story publiée !");
      setCaption("");
      loadStories();
    }
    setUploading(false);
  };

  const handleDeleteStory = async (storyId: string) => {
    await supabase.from("stories").delete().eq("id", storyId);
    toast.success("Story supprimée");
    loadStories();
    setViewing(null);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !user || !viewing) return;
    const story = viewing.group.stories[viewing.index];
    
    // Send as a message
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: story.user_id,
      content: `💬 Réponse à votre story: ${replyText.trim()}`,
      message_type: "text",
    } as any);

    if (!error) {
      toast.success("Réponse envoyée !");
      setReplyText("");
    } else {
      toast.error("Likez mutuellement ce profil pour répondre à la story");
    }
  };

  const handleLikeStory = async () => {
    if (!viewing || !user) return;
    const story = viewing.group.stories[viewing.index];
    if (liked.has(story.id)) return;
    
    setLiked(prev => new Set([...prev, story.id]));
    
    // Send like as notification via secured RPC
    await supabase.rpc("notify_story_like", { p_story_id: story.id });
    
    toast.success("❤️");
  };

  const viewStory = (group: StoryGroup, index = 0) => {
    setViewing({ group, index });
    setIsPaused(false);
    remainingTimeRef.current = 5000;
    const story = group.stories[index];
    if (story && user && story.user_id !== user.id) {
      supabase.from("story_views").insert({
        story_id: story.id,
        viewer_id: user.id,
      } as any).then(() => {});
    }
  };

  const nextStory = () => {
    if (!viewing) return;
    if (viewing.index < viewing.group.stories.length - 1) {
      const newIndex = viewing.index + 1;
      setViewing({ ...viewing, index: newIndex });
      remainingTimeRef.current = 5000;
      setIsPaused(false);
      const story = viewing.group.stories[newIndex];
      if (story && user && story.user_id !== user.id) {
        supabase.from("story_views").insert({ story_id: story.id, viewer_id: user.id } as any);
      }
    } else {
      const currentGroupIdx = groups.findIndex(g => g.user_id === viewing.group.user_id);
      if (currentGroupIdx < groups.length - 1) {
        viewStory(groups[currentGroupIdx + 1], 0);
      } else {
        setViewing(null);
      }
    }
  };

  const prevStory = () => {
    if (!viewing) return;
    if (viewing.index > 0) {
      setViewing({ ...viewing, index: viewing.index - 1 });
      remainingTimeRef.current = 5000;
      setIsPaused(false);
    }
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
    } else {
      setIsPaused(true);
      if (progressRef.current) clearTimeout(progressRef.current);
      remainingTimeRef.current = remainingTimeRef.current - (Date.now() - startTimeRef.current);
    }
  };

  useEffect(() => {
    if (!viewing || isPaused) return;
    startTimeRef.current = Date.now();
    progressRef.current = setTimeout(nextStory, remainingTimeRef.current);
    return () => { if (progressRef.current) clearTimeout(progressRef.current); };
  }, [viewing, isPaused]);

  return (
    <AppShell>
      {/* Fullscreen story viewer */}
      {viewing && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center safe-area-top safe-area-bottom">
          {/* Progress bars */}
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex gap-0.5 sm:gap-1 z-10">
            {viewing.group.stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-white ${
                    i < viewing.index ? "w-full" : i === viewing.index ? "" : "w-0"
                  }`}
                  style={
                    i === viewing.index
                      ? {
                          animation: isPaused ? "none" : `progress ${remainingTimeRef.current}ms linear forwards`,
                          animationPlayState: isPaused ? "paused" : "running",
                        }
                      : undefined
                  }
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-5 sm:top-8 left-2 sm:left-4 right-2 sm:right-4 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 overflow-hidden ring-2 ring-primary/50">
                {viewing.group.avatar_url ? (
                  <BlurredPhoto
                    src={viewing.group.avatar_url}
                    blurred={blurPhotos && viewing.group.user_id !== user?.id}
                    className="w-full h-full"
                    showLock={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-medium">
                    {viewing.group.display_name?.[0]}
                  </div>
                )}
              </div>
              <div>
                <span className="text-white text-xs sm:text-sm font-medium block">{viewing.group.display_name}</span>
                <span className="text-white/40 text-[10px]">
                  {formatDistanceToNow(new Date(viewing.group.stories[viewing.index].created_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Pause/Play */}
              <button onClick={togglePause} className="text-white/70 hover:text-white p-1.5 touch-manipulation">
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
              </button>
              {/* View count for own stories */}
              {viewing.group.user_id === user?.id && (
                <div className="flex items-center gap-1 text-white/60 text-xs px-2">
                  <Eye size={14} />
                  <span>{viewCounts[viewing.group.stories[viewing.index].id] || 0}</span>
                </div>
              )}
              {viewing.group.user_id === user?.id && (
                <button onClick={() => handleDeleteStory(viewing.group.stories[viewing.index].id)} className="text-white/70 hover:text-white p-1.5 touch-manipulation">
                  <Trash2 size={18} />
                </button>
              )}
              <button onClick={() => setViewing(null)} className="text-white/70 hover:text-white p-1.5 touch-manipulation">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Media */}
          <img
            src={viewing.group.stories[viewing.index].media_url}
            alt=""
            className="max-h-[70dvh] sm:max-h-[80vh] max-w-full object-contain rounded-lg"
          />

          {/* Caption */}
          {viewing.group.stories[viewing.index].caption && (
            <div className="absolute bottom-32 sm:bottom-24 left-3 sm:left-4 right-3 sm:right-4 text-center">
              <p className="text-white text-xs sm:text-sm bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2.5 inline-block max-w-full">
                {viewing.group.stories[viewing.index].caption}
              </p>
            </div>
          )}

          {/* Bottom actions - Reply & Like */}
          {viewing.group.user_id !== user?.id && (
            <div className="absolute bottom-4 sm:bottom-6 left-3 sm:left-4 right-3 sm:right-4 z-10 flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleReply()}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => !replyText && setIsPaused(false)}
                  placeholder="Répondre..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-10 pr-10 rounded-full text-sm"
                />
                {replyText && (
                  <button
                    onClick={handleReply}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                  >
                    <Send size={18} />
                  </button>
                )}
              </div>
              <button
                onClick={handleLikeStory}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  liked.has(viewing.group.stories[viewing.index].id)
                    ? "bg-accent/20 text-accent"
                    : "bg-white/10 text-white hover:text-accent"
                }`}
              >
                <Heart size={20} fill={liked.has(viewing.group.stories[viewing.index].id) ? "currentColor" : "none"} />
              </button>
            </div>
          )}

          {/* Navigation zones */}
          <button onClick={prevStory} className="absolute left-0 top-16 bottom-20 w-1/3 z-[5] touch-manipulation" />
          <button onClick={nextStory} className="absolute right-0 top-16 bottom-20 w-1/3 z-[5] touch-manipulation" />
          
          {/* Desktop nav arrows */}
          {viewing.index > 0 && (
            <button onClick={prevStory} className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 items-center justify-center hover:bg-white/20 z-10">
              <ChevronLeft size={20} className="text-white" />
            </button>
          )}
          <button onClick={nextStory} className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 items-center justify-center hover:bg-white/20 z-10">
            <ChevronRight size={20} className="text-white" />
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-2xl py-4 sm:py-6 px-3 sm:px-4">
          <h1 className="font-display text-xl sm:text-2xl font-light mb-4 sm:mb-6">Stories</h1>

          {/* Story circles */}
          <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x-mandatory pb-3 sm:pb-4 mb-6 sm:mb-8">
            {/* Add story button */}
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 snap-start">
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center hover:border-primary transition-colors touch-manipulation active:scale-95"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus size={20} className="text-primary" />
                )}
              </button>
              <span className="text-[10px] text-muted-foreground">Ajouter</span>
            </div>

            {groups.map(group => {
              const isMe = group.user_id === user?.id;
              const totalViews = isMe ? group.stories.reduce((sum, s) => sum + (viewCounts[s.id] || 0), 0) : 0;
              
              return (
                <div key={group.user_id} className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 snap-start">
                  <button
                    onClick={() => viewStory(group)}
                    className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full p-0.5 bg-gradient-to-tr from-primary to-accent touch-manipulation active:scale-95"
                  >
                    <div className="w-full h-full rounded-full bg-background p-0.5">
                      <div className="w-full h-full rounded-full bg-secondary overflow-hidden">
                        {group.avatar_url ? (
                          <BlurredPhoto
                            src={group.avatar_url}
                            blurred={blurPhotos && group.user_id !== user?.id}
                            className="w-full h-full"
                            showLock={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs sm:text-sm font-medium text-muted-foreground">
                            {group.display_name?.[0]}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Story count badge */}
                    {group.stories.length > 1 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {group.stories.length}
                      </span>
                    )}
                  </button>
                  <span className="text-[10px] text-muted-foreground truncate w-16 text-center">
                    {isMe ? "Vous" : group.display_name}
                  </span>
                  {/* View count for own stories */}
                  {isMe && totalViews > 0 && (
                    <span className="text-[9px] text-muted-foreground/60 flex items-center gap-0.5">
                      <Eye size={10} /> {totalViews}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* My stories list */}
          {myStories.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Mes stories actives</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {myStories.map(story => (
                  <div key={story.id} className="relative aspect-[3/4] rounded-xl overflow-hidden group cursor-pointer" onClick={() => viewStory({ user_id: story.user_id, display_name: "Vous", avatar_url: null, stories: [story] })}>
                    <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <span className="text-white/70 text-[10px] flex items-center gap-1">
                        <Eye size={10} /> {viewCounts[story.id] || 0}
                      </span>
                      <span className="text-white/50 text-[9px]">
                        {formatDistanceToNow(new Date(story.created_at), { addSuffix: false, locale: fr })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload area */}
          <div className="glass-card rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-medium">Publier une story</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Visible pendant 24h par vos matchs</p>
            <Input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Ajouter une légende..."
              className="bg-secondary/50 border-border/50 h-10 sm:h-11 text-base"
            />
            <Button
              variant="hero"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="w-full touch-manipulation"
            >
              <Image size={16} />
              Choisir une photo
            </Button>
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </div>
      </main>

      <style>{`
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
      `}</style>
    </AppShell>
  );
};

export default Stories;
