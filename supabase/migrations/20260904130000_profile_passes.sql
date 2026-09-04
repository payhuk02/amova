-- Persist Discover left-swipes so rejected profiles do not reappear on reload.

CREATE TABLE IF NOT EXISTS public.profile_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id),
  CONSTRAINT profile_passes_no_self CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_passes_from_user
  ON public.profile_passes (from_user_id);

CREATE INDEX IF NOT EXISTS idx_profile_passes_to_user
  ON public.profile_passes (to_user_id);

ALTER TABLE public.profile_passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own passes" ON public.profile_passes;
CREATE POLICY "Users can view their own passes" ON public.profile_passes
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can insert their own passes" ON public.profile_passes;
CREATE POLICY "Users can insert their own passes" ON public.profile_passes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can delete their own passes" ON public.profile_passes;
CREATE POLICY "Users can delete their own passes" ON public.profile_passes
  FOR DELETE TO authenticated
  USING (auth.uid() = from_user_id);

-- Liking someone clears a prior pass (e.g. like from Dashboard after a swipe-left).
CREATE OR REPLACE FUNCTION public.clear_pass_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.profile_passes
  WHERE from_user_id = NEW.from_user_id
    AND to_user_id = NEW.to_user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_pass_on_like_trigger ON public.likes;
CREATE TRIGGER clear_pass_on_like_trigger
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_pass_on_like();

-- Discover: exclude passed profiles
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
  my_looking_for text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT public.get_user_plan(v_user_id) INTO v_plan;

  IF v_plan NOT IN ('premium', 'vip') THEN
    p_verified_only := false;
    p_online_only := false;
    p_interests := NULL;
  END IF;

  SELECT p.looking_for INTO my_looking_for
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  RETURN QUERY
  SELECT p.*
  FROM public.profiles p
  WHERE p.user_id != v_user_id
    AND p.display_name IS NOT NULL
    AND COALESCE(p.incognito_mode, false) = false
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
    AND (my_looking_for IS NULL OR my_looking_for = 'les deux' OR p.gender = my_looking_for)
    AND (p_city IS NULL OR btrim(p_city) = '' OR p.city ILIKE '%' || p_city || '%')
    AND (p_age_min IS NULL OR p.age >= p_age_min)
    AND (p_age_max IS NULL OR p.age <= p_age_max)
    AND (p_gender IS NULL OR btrim(p_gender) = '' OR p.gender = p_gender)
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
    EXISTS (
      SELECT 1 FROM public.boosts b
      WHERE b.user_id = p.user_id AND b.expires_at > now()
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

REVOKE ALL ON FUNCTION public.get_discover_profiles(integer, text, integer, integer, text, text, boolean, boolean, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_discover_profiles(integer, text, integer, integer, text, text, boolean, boolean, text[]) TO authenticated;

-- Nearby / smart matches: same exclusion
CREATE OR REPLACE FUNCTION public.get_smart_matches(
  p_max_distance double precision DEFAULT 100,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.latitude, p.longitude, p.interests, p.looking_for, p.gender
  INTO my_lat, my_lon, my_interests, my_looking_for, my_gender
  FROM public.profiles p WHERE p.user_id = v_user_id;

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
      +
      CASE
        WHEN my_looking_for IS NULL OR my_looking_for = 'les deux' THEN 10
        WHEN my_looking_for = p.gender THEN 20
        ELSE 0
      END
      +
      CASE
        WHEN p.looking_for IS NULL OR p.looking_for = 'les deux' THEN 10
        WHEN p.looking_for = my_gender THEN 20
        ELSE 0
      END
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
      my_looking_for IS NULL OR my_looking_for = 'les deux' OR p.gender = my_looking_for
    )
    AND (
      my_lat IS NULL OR p.latitude IS NULL OR
      public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude) <= p_max_distance
    )
  ORDER BY compatibility_score DESC, p.last_seen DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_smart_matches(double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_smart_matches(double precision, integer) TO authenticated;
