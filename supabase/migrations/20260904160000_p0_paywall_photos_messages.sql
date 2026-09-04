-- P0 paywall: gate profile gallery + free daily message quota + GDPR export fix

-- 1) Profile photos: own / premium-vip / mutual match / admin
DROP POLICY IF EXISTS "Users can view all profile photos" ON public.profile_photos;
CREATE POLICY "Users can view own or unlocked profile photos"
ON public.profile_photos
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_user_admin()
  OR public.get_user_plan(auth.uid()) IN ('premium', 'vip')
  OR public.are_mutual_matches(auth.uid(), user_id)
);

-- 2) Free users: 15 outbound messages / UTC day
CREATE OR REPLACE FUNCTION public.enforce_message_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_messages_today integer;
BEGIN
  v_plan := COALESCE(public.get_user_plan(NEW.sender_id), 'free');

  IF v_plan = 'free' THEN
    SELECT COUNT(*) INTO v_messages_today
    FROM public.messages
    WHERE sender_id = NEW.sender_id
      AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

    IF v_messages_today >= 15 THEN
      RAISE EXCEPTION 'daily_message_limit_reached'
        USING ERRCODE = 'P0001',
              MESSAGE = 'daily_message_limit_reached';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_message_limits_trigger ON public.messages;
CREATE TRIGGER enforce_message_limits_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_limits();

-- 3) GDPR export: mask incoming liker IDs for free users
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan text;
  v_can_see_likers boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_plan := COALESCE(public.get_user_plan(v_user_id), 'free');
  v_can_see_likers := v_plan IN ('premium', 'vip');

  RETURN jsonb_build_object(
    'exported_at', now(),
    'user_id', v_user_id,
    'profile', (
      SELECT to_jsonb(p) - 'verification_photo_url'
      FROM public.profiles p
      WHERE p.user_id = v_user_id
    ),
    'photos', COALESCE((
      SELECT jsonb_agg(to_jsonb(pp) ORDER BY pp.position)
      FROM public.profile_photos pp
      WHERE pp.user_id = v_user_id
    ), '[]'::jsonb),
    'likes_sent', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'to_user_id', l.to_user_id,
        'created_at', l.created_at,
        'is_super', l.is_super
      ) ORDER BY l.created_at DESC)
      FROM public.likes l
      WHERE l.from_user_id = v_user_id
    ), '[]'::jsonb),
    'likes_received', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'from_user_id', CASE WHEN v_can_see_likers THEN l.from_user_id ELSE NULL END,
        'created_at', l.created_at,
        'is_super', l.is_super,
        'identity_masked', NOT v_can_see_likers
      ) ORDER BY l.created_at DESC)
      FROM public.likes l
      WHERE l.to_user_id = v_user_id
    ), '[]'::jsonb),
    'messages', COALESCE((
      SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC)
      FROM public.messages m
      WHERE m.sender_id = v_user_id OR m.receiver_id = v_user_id
    ), '[]'::jsonb),
    'subscription', (
      SELECT to_jsonb(s)
      FROM public.subscriptions s
      WHERE s.user_id = v_user_id
      LIMIT 1
    ),
    'badges', COALESCE((
      SELECT jsonb_agg(to_jsonb(b))
      FROM public.badges b
      WHERE b.user_id = v_user_id
    ), '[]'::jsonb),
    'reports_filed', COALESCE((
      SELECT jsonb_agg(to_jsonb(r))
      FROM public.reports r
      WHERE r.reporter_id = v_user_id
    ), '[]'::jsonb),
    'blocked_users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('blocked_id', b.blocked_id, 'created_at', b.created_at))
      FROM public.blocked_users b
      WHERE b.blocker_id = v_user_id
    ), '[]'::jsonb),
    'stories', COALESCE((
      SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC)
      FROM public.stories s
      WHERE s.user_id = v_user_id
    ), '[]'::jsonb),
    'story_views', COALESCE((
      SELECT jsonb_agg(to_jsonb(sv) ORDER BY sv.viewed_at DESC)
      FROM public.story_views sv
      WHERE sv.viewer_id = v_user_id
    ), '[]'::jsonb),
    'events_created', COALESCE((
      SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC)
      FROM public.events e
      WHERE e.creator_id = v_user_id
    ), '[]'::jsonb),
    'event_attendance', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'event_id', ea.event_id,
        'joined_at', ea.joined_at
      ) ORDER BY ea.joined_at DESC)
      FROM public.event_attendees ea
      WHERE ea.user_id = v_user_id
    ), '[]'::jsonb),
    'notifications', COALESCE((
      SELECT jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC)
      FROM public.notifications n
      WHERE n.user_id = v_user_id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;
