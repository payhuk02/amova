-- Strict heterosexual discovery (homme ↔ femme) + normalize looking_for

CREATE OR REPLACE FUNCTION public.opposite_gender(p_gender text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(btrim(COALESCE(p_gender, '')))
    WHEN 'homme' THEN 'femme'
    WHEN 'femme' THEN 'homme'
    ELSE NULL
  END;
$$;

-- Normalize existing preferences to opposite gender when gender is set
UPDATE public.profiles p
SET looking_for = public.opposite_gender(p.gender)
WHERE p.gender IN ('homme', 'femme')
  AND (
    p.looking_for IS NULL
    OR p.looking_for = 'les deux'
    OR p.looking_for = p.gender
  );

CREATE OR REPLACE FUNCTION public.get_discover_profiles(
  p_limit integer DEFAULT 50,
  p_city text DEFAULT NULL,
  p_age_min integer DEFAULT NULL,
  p_age_max integer DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_looking_for text DEFAULT NULL,
  p_verified_only boolean DEFAULT false,
  p_online_only boolean DEFAULT false,
  p_interests text[] DEFAULT NULL
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan public.subscription_plan;
  my_gender text;
  target_gender text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT public.get_user_plan(v_user_id) INTO v_plan;

  IF v_plan::text NOT IN ('plus', 'premium', 'vip') THEN
    p_verified_only := false;
    p_online_only := false;
    p_interests := NULL;
  END IF;

  SELECT p.gender INTO my_gender
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  target_gender := public.opposite_gender(my_gender);
  IF target_gender IS NULL THEN
    RETURN;
  END IF;

  -- Free filters cannot override hetero lock
  IF p_gender IS NOT NULL AND btrim(p_gender) <> '' AND p_gender <> target_gender THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM public.profiles p
  WHERE p.user_id != v_user_id
    AND p.display_name IS NOT NULL
    AND COALESCE(p.incognito_mode, false) = false
    AND p.gender = target_gender
    AND (
      p.looking_for IS NULL
      OR p.looking_for IN (my_gender, 'les deux')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.likes l
      WHERE l.from_user_id = v_user_id AND l.to_user_id = p.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_passes pp
      WHERE pp.from_user_id = v_user_id AND pp.to_user_id = p.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = v_user_id AND b.blocked_id = p.user_id)
         OR (b.blocker_id = p.user_id AND b.blocked_id = v_user_id)
    )
    AND (p_city IS NULL OR btrim(p_city) = '' OR p.city ILIKE '%' || p_city || '%')
    AND (p_age_min IS NULL OR p.age >= p_age_min)
    AND (p_age_max IS NULL OR p.age <= p_age_max)
    AND (p_looking_for IS NULL OR btrim(p_looking_for) = '' OR p.looking_for = p_looking_for)
    AND (NOT COALESCE(p_verified_only, false) OR p.is_verified = true)
    AND (
      NOT COALESCE(p_online_only, false)
      OR p.last_seen > now() - interval '15 minutes'
    )
    AND (
      p_interests IS NULL
      OR array_length(p_interests, 1) IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p_interests) AS interest
        WHERE interest = ANY(p.interests)
      )
    )
  ORDER BY
    (
      EXISTS (
        SELECT 1 FROM public.boosts b
        WHERE b.user_id = p.user_id AND b.expires_at > now()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_entitlements e
        WHERE e.user_id = p.user_id
          AND e.sku IN ('spotlight_24h', 'boost_24h')
          AND e.expires_at > now()
      )
    ) DESC,
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = p.user_id
        AND s.plan = 'vip'
        AND s.status = 'active'
        AND (s.expires_at IS NULL OR s.expires_at > now())
    ) DESC,
    p.last_seen DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_smart_matches(
  p_max_distance double precision DEFAULT 100,
  p_limit integer DEFAULT 30
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  gender text,
  bio text,
  age integer,
  city text,
  avatar_url text,
  last_seen timestamptz,
  interests text[],
  is_verified boolean,
  looking_for text,
  distance_km double precision,
  compatibility_score integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  my_lat double precision;
  my_lon double precision;
  my_interests text[];
  my_looking_for text;
  my_gender text;
  target_gender text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.latitude, p.longitude, p.interests, p.looking_for, p.gender
  INTO my_lat, my_lon, my_interests, my_looking_for, my_gender
  FROM public.profiles p WHERE p.user_id = v_user_id;

  target_gender := public.opposite_gender(my_gender);
  IF target_gender IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.gender,
    p.bio,
    p.age,
    p.city,
    p.avatar_url,
    p.last_seen,
    p.interests,
    p.is_verified,
    p.looking_for,
    CASE WHEN my_lat IS NOT NULL AND my_lon IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      THEN public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude)
      ELSE NULL
    END AS distance_km,
    (
      LEAST(40, COALESCE(
        (SELECT COUNT(*)::int FROM unnest(my_interests) mi WHERE mi = ANY(p.interests)) * 10,
        0
      ))
      + 20
      +
      CASE
        WHEN my_lat IS NULL OR p.latitude IS NULL THEN 5
        WHEN public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude) < 10 THEN 20
        WHEN public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude) < 25 THEN 15
        WHEN public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude) < 50 THEN 10
        WHEN public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude) < 100 THEN 5
        ELSE 0
      END
    )::integer AS compatibility_score
  FROM public.profiles p
  WHERE p.user_id != v_user_id
    AND p.display_name IS NOT NULL
    AND COALESCE(p.incognito_mode, false) = false
    AND p.gender = target_gender
    AND (
      p.looking_for IS NULL
      OR p.looking_for IN (my_gender, 'les deux')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.likes l
      WHERE l.from_user_id = v_user_id AND l.to_user_id = p.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_passes pp
      WHERE pp.from_user_id = v_user_id AND pp.to_user_id = p.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = v_user_id AND b.blocked_id = p.user_id)
         OR (b.blocker_id = p.user_id AND b.blocked_id = v_user_id)
    )
    AND (
      my_lat IS NULL OR p.latitude IS NULL OR
      public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude) <= p_max_distance
    )
  ORDER BY compatibility_score DESC, p.last_seen DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_speed_dating_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_waiting public.speed_dating_queue%ROWTYPE;
  v_my_entry_id uuid;
  v_partner_id uuid;
  v_session_start timestamptz := now();
  my_gender text;
  target_gender text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.gender INTO my_gender
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  target_gender := public.opposite_gender(my_gender);
  IF target_gender IS NULL THEN
    RAISE EXCEPTION 'profile_gender_required'
      USING ERRCODE = 'P0001',
            MESSAGE = 'profile_gender_required';
  END IF;

  DELETE FROM public.speed_dating_queue
  WHERE user_id = v_user_id AND status = 'waiting';

  SELECT q.* INTO v_waiting
  FROM public.speed_dating_queue q
  JOIN public.profiles partner ON partner.user_id = q.user_id
  WHERE q.status = 'waiting'
    AND q.user_id <> v_user_id
    AND partner.gender = target_gender
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = v_user_id AND b.blocked_id = q.user_id)
         OR (b.blocker_id = q.user_id AND b.blocked_id = v_user_id)
    )
  ORDER BY q.joined_at ASC
  LIMIT 1
  FOR UPDATE OF q SKIP LOCKED;

  IF FOUND THEN
    v_partner_id := v_waiting.user_id;

    UPDATE public.speed_dating_queue
    SET status = 'matched', matched_with = v_user_id, session_started_at = v_session_start
    WHERE id = v_waiting.id;

    INSERT INTO public.speed_dating_queue (user_id, status, matched_with, session_started_at)
    VALUES (v_user_id, 'matched', v_partner_id, v_session_start)
    RETURNING id INTO v_my_entry_id;

    RETURN jsonb_build_object(
      'status', 'matched',
      'queue_id', v_my_entry_id,
      'partner_id', v_partner_id
    );
  END IF;

  INSERT INTO public.speed_dating_queue (user_id, status)
  VALUES (v_user_id, 'waiting')
  RETURNING id INTO v_my_entry_id;

  RETURN jsonb_build_object(
    'status', 'waiting',
    'queue_id', v_my_entry_id
  );
END;
$$;

-- Who may SELECT a profile row (own / admin / mutual match / opposite gender)
CREATE OR REPLACE FUNCTION public.can_select_profile(p_target uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  my_gender text;
  their_gender text;
  v_admin boolean := false;
BEGIN
  IF v_me IS NULL OR p_target IS NULL THEN
    RETURN false;
  END IF;
  IF v_me = p_target THEN
    RETURN true;
  END IF;

  BEGIN
    v_admin := COALESCE(public.is_user_admin(), false);
  EXCEPTION WHEN OTHERS THEN
    v_admin := false;
  END;
  IF v_admin THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.likes a
    JOIN public.likes b
      ON a.from_user_id = b.to_user_id
     AND a.to_user_id = b.from_user_id
    WHERE a.from_user_id = v_me
      AND a.to_user_id = p_target
  ) THEN
    RETURN true;
  END IF;

  SELECT me.gender, them.gender
  INTO my_gender, their_gender
  FROM public.profiles me
  CROSS JOIN public.profiles them
  WHERE me.user_id = v_me
    AND them.user_id = p_target;

  RETURN public.opposite_gender(my_gender) IS NOT NULL
    AND their_gender = public.opposite_gender(my_gender);
END;
$$;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view allowed profiles" ON public.profiles;
CREATE POLICY "Users can view allowed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_select_profile(user_id));

-- Keep looking_for aligned with opposite gender after insert/update
CREATE OR REPLACE FUNCTION public.enforce_hetero_looking_for()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opp text;
BEGIN
  IF NEW.gender IN ('homme', 'femme') THEN
    v_opp := public.opposite_gender(NEW.gender);
    IF NEW.looking_for IS DISTINCT FROM v_opp THEN
      NEW.looking_for := v_opp;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_hetero_looking_for ON public.profiles;
CREATE TRIGGER trg_enforce_hetero_looking_for
  BEFORE INSERT OR UPDATE OF gender, looking_for
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_hetero_looking_for();
