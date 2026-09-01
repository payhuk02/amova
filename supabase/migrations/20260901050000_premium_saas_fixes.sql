-- Premium SaaS fixes: server-side gating, notification prefs, GDPR export

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_matches boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_likes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_events boolean NOT NULL DEFAULT true;

-- Who liked me — masks identity for free users
CREATE OR REPLACE FUNCTION public.get_incoming_likers()
RETURNS TABLE(
  like_id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  age integer,
  city text,
  bio text,
  interests text[],
  is_verified boolean,
  last_seen timestamptz,
  liked_at timestamptz,
  is_super boolean,
  is_revealed boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan text;
  v_can_see boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_plan := COALESCE(public.get_user_plan(v_user_id), 'free');
  v_can_see := v_plan IN ('premium', 'vip');

  RETURN QUERY
  SELECT
    l.id AS like_id,
    CASE WHEN v_can_see THEN l.from_user_id ELSE NULL END AS user_id,
    CASE WHEN v_can_see THEN p.display_name ELSE NULL END,
    CASE WHEN v_can_see THEN p.avatar_url ELSE NULL END,
    CASE WHEN v_can_see THEN p.age ELSE NULL END,
    CASE WHEN v_can_see THEN p.city ELSE NULL END,
    CASE WHEN v_can_see THEN p.bio ELSE NULL END,
    CASE WHEN v_can_see THEN p.interests ELSE NULL END,
    CASE WHEN v_can_see THEN p.is_verified ELSE false END,
    CASE WHEN v_can_see THEN p.last_seen ELSE NULL END,
    l.created_at AS liked_at,
    l.is_super,
    v_can_see AS is_revealed
  FROM public.likes l
  JOIN public.profiles p ON p.user_id = l.from_user_id
  WHERE l.to_user_id = v_user_id
  ORDER BY l.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_incoming_likers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_incoming_likers() TO authenticated;

-- GDPR data export
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

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
        'from_user_id', l.from_user_id,
        'created_at', l.created_at,
        'is_super', l.is_super
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
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;
