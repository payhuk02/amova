
-- Badges table
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  badge_type text NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert badges" ON public.badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime for badges
ALTER PUBLICATION supabase_realtime ADD TABLE public.badges;
