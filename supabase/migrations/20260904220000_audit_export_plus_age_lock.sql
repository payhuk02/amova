-- Audit remediations: GDPR export Plus parity + age lock when DOB set

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
  v_can_see_likers := v_plan IN ('plus', 'premium', 'vip')
    OR public.user_has_active_entitlement(v_user_id, 'likes_reveal_24h');

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

-- Strengthen identity locks: age must match DOB when DOB is set
CREATE OR REPLACE FUNCTION public.enforce_profile_identity_locks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
  v_age integer;
BEGIN
  BEGIN
    v_is_admin := COALESCE(public.is_user_admin(), false);
  EXCEPTION WHEN OTHERS THEN
    v_is_admin := false;
  END;

  IF NEW.date_of_birth IS NOT NULL THEN
    v_age := public.age_from_dob(NEW.date_of_birth);
    IF v_age IS NULL OR v_age < 18 THEN
      RAISE EXCEPTION 'must_be_18_or_older'
        USING ERRCODE = 'P0001',
              MESSAGE = 'must_be_18_or_older';
    END IF;
    IF v_age > 120 THEN
      RAISE EXCEPTION 'invalid_date_of_birth'
        USING ERRCODE = 'P0001',
              MESSAGE = 'invalid_date_of_birth';
    END IF;
    NEW.age := v_age;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT v_is_admin THEN
    IF OLD.gender IS NOT NULL
       AND btrim(OLD.gender) <> ''
       AND NEW.gender IS DISTINCT FROM OLD.gender THEN
      RAISE EXCEPTION 'gender_locked'
        USING ERRCODE = 'P0001',
              MESSAGE = 'gender_locked';
    END IF;

    IF OLD.date_of_birth IS NOT NULL
       AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
      RAISE EXCEPTION 'date_of_birth_locked'
        USING ERRCODE = 'P0001',
              MESSAGE = 'date_of_birth_locked';
    END IF;

    IF OLD.date_of_birth IS NOT NULL AND NEW.date_of_birth IS NULL THEN
      RAISE EXCEPTION 'date_of_birth_locked'
        USING ERRCODE = 'P0001',
              MESSAGE = 'date_of_birth_locked';
    END IF;

    -- Prevent manual age spoofing when DOB is locked in
    IF OLD.date_of_birth IS NOT NULL
       AND NEW.age IS DISTINCT FROM public.age_from_dob(OLD.date_of_birth) THEN
      NEW.age := public.age_from_dob(OLD.date_of_birth);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
