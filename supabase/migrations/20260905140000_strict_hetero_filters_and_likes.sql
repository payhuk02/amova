-- Strict hetero lock: no same-gender likes, no les deux / autre, harden discover RPCs

-- Align preferences
UPDATE public.profiles
SET looking_for = public.opposite_gender(gender)
WHERE gender IN ('homme', 'femme')
  AND looking_for IS DISTINCT FROM public.opposite_gender(gender);

-- Remove legacy same-gender likes (breaks H↔F)
DELETE FROM public.likes l
USING public.profiles a, public.profiles b
WHERE l.from_user_id = a.user_id
  AND l.to_user_id = b.user_id
  AND a.gender IN ('homme', 'femme')
  AND b.gender IN ('homme', 'femme')
  AND a.gender = b.gender;

-- Reject same-gender likes at insert time
CREATE OR REPLACE FUNCTION public.enforce_hetero_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_g text;
  to_g text;
BEGIN
  SELECT lower(btrim(gender)) INTO from_g
  FROM public.profiles WHERE user_id = NEW.from_user_id;

  SELECT lower(btrim(gender)) INTO to_g
  FROM public.profiles WHERE user_id = NEW.to_user_id;

  IF from_g IS NULL OR to_g IS NULL THEN
    RAISE EXCEPTION 'profile_gender_required'
      USING ERRCODE = 'P0001', MESSAGE = 'profile_gender_required';
  END IF;

  IF public.opposite_gender(from_g) IS DISTINCT FROM to_g THEN
    RAISE EXCEPTION 'hetero_only_matching'
      USING ERRCODE = 'P0001', MESSAGE = 'hetero_only_matching';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_hetero_like ON public.likes;
CREATE TRIGGER trg_enforce_hetero_like
  BEFORE INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_hetero_like();

-- Same for passes (optional hygiene)
CREATE OR REPLACE FUNCTION public.enforce_hetero_pass()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_g text;
  to_g text;
BEGIN
  SELECT lower(btrim(gender)) INTO from_g
  FROM public.profiles WHERE user_id = NEW.from_user_id;

  SELECT lower(btrim(gender)) INTO to_g
  FROM public.profiles WHERE user_id = NEW.to_user_id;

  IF from_g IS NULL OR to_g IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.opposite_gender(from_g) IS DISTINCT FROM to_g THEN
    RAISE EXCEPTION 'hetero_only_matching'
      USING ERRCODE = 'P0001', MESSAGE = 'hetero_only_matching';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_hetero_pass ON public.profile_passes;
CREATE TRIGGER trg_enforce_hetero_pass
  BEFORE INSERT ON public.profile_passes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_hetero_pass();

-- Tighten CHECK constraints (drop legacy names if present)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'profiles'
      AND c.contype = 'c'
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%gender%'
        OR pg_get_constraintdef(c.oid) ILIKE '%looking_for%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Normalize invalid gender / looking_for before new checks
UPDATE public.profiles
SET gender = NULL
WHERE gender IS NOT NULL AND gender NOT IN ('homme', 'femme');

UPDATE public.profiles
SET looking_for = public.opposite_gender(gender)
WHERE gender IN ('homme', 'femme');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_hetero_check
  CHECK (gender IS NULL OR gender IN ('homme', 'femme'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_looking_for_hetero_check
  CHECK (
    looking_for IS NULL
    OR looking_for IN ('homme', 'femme')
  );

-- Discover: ignore client gender overrides; strict opposite only
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

  SELECT lower(btrim(p.gender)) INTO my_gender
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  target_gender := public.opposite_gender(my_gender);
  IF target_gender IS NULL THEN
    RETURN;
  END IF;

  -- Client cannot request same-gender discovery (p_gender / p_looking_for ignored for lock)
  RETURN QUERY
  SELECT p.*
  FROM public.profiles p
  WHERE p.user_id != v_user_id
    AND p.display_name IS NOT NULL
    AND COALESCE(p.incognito_mode, false) = false
    AND lower(btrim(p.gender)) = target_gender
    AND (
      p.looking_for IS NULL
      OR lower(btrim(p.looking_for)) = my_gender
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
  my_gender text;
  target_gender text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.latitude, p.longitude, p.interests, lower(btrim(p.gender))
  INTO my_lat, my_lon, my_interests, my_gender
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
    AND lower(btrim(p.gender)) = target_gender
    AND (
      p.looking_for IS NULL
      OR lower(btrim(p.looking_for)) = my_gender
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
