
-- Message reactions
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions on their messages" ON public.message_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can add reactions" ON public.message_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions" ON public.message_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their reactions" ON public.message_reactions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Speed dating sessions
CREATE TABLE public.speed_dating_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  matched_with uuid,
  session_started_at timestamp with time zone,
  status text NOT NULL DEFAULT 'waiting'
);

ALTER TABLE public.speed_dating_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own queue entries" ON public.speed_dating_queue
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view matched entries" ON public.speed_dating_queue
  FOR SELECT TO authenticated USING (matched_with = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.speed_dating_queue;
