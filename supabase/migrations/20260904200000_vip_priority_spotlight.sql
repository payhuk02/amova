-- VIP weekly free Spotlight + discover ORDER includes spotlight entitlements

CREATE OR REPLACE FUNCTION public.claim_vip_weekly_spotlight()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan text;
  v_expires timestamptz := now() + interval '24 hours';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_plan := COALESCE(public.get_user_plan(v_uid), 'free');
  IF v_plan <> 'vip' THEN
    RAISE EXCEPTION 'vip_spotlight_requires_vip'
      USING ERRCODE = 'P0001',
            MESSAGE = 'vip_spotlight_requires_vip';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_entitlements e
    WHERE e.user_id = v_uid
      AND e.sku = 'vip_weekly_spotlight'
      AND e.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'vip_weekly_spotlight_already_claimed'
      USING ERRCODE = 'P0001',
            MESSAGE = 'vip_weekly_spotlight_already_claimed';
  END IF;

  INSERT INTO public.user_entitlements (user_id, sku, expires_at)
  VALUES (v_uid, 'vip_weekly_spotlight', now() + interval '7 days');

  INSERT INTO public.user_entitlements (user_id, sku, expires_at)
  VALUES (v_uid, 'spotlight_24h', v_expires);

  INSERT INTO public.boosts (user_id, expires_at)
  VALUES (v_uid, v_expires);

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    v_uid,
    'subscription_renewal',
    'Spotlight VIP activé',
    'Votre Spotlight gratuit de la semaine est actif pendant 24 heures.'
  );

  RETURN jsonb_build_object('ok', true, 'expires_at', v_expires);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_vip_weekly_spotlight() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_vip_weekly_spotlight() TO authenticated;

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

  IF v_plan::text NOT IN ('plus', 'premium', 'vip') THEN
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
