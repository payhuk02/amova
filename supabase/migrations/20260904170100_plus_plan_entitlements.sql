-- P1 continued: entitlements, payment products, Plus limits, fulfill consumables

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sku text NOT NULL,
  expires_at timestamptz NOT NULL,
  source_order_id uuid REFERENCES public.payment_orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_sku
  ON public.user_entitlements (user_id, sku, expires_at DESC);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own entitlements" ON public.user_entitlements;
CREATE POLICY "Users can view own entitlements" ON public.user_entitlements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view entitlements" ON public.user_entitlements;
CREATE POLICY "Admins can view entitlements" ON public.user_entitlements
  FOR SELECT TO authenticated
  USING (public.is_user_admin());

ALTER TABLE public.payment_orders
  ALTER COLUMN plan DROP NOT NULL;

ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS product_sku text;

CREATE OR REPLACE FUNCTION public.user_has_active_entitlement(p_user_id uuid, p_sku text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_entitlements e
    WHERE e.user_id = p_user_id
      AND e.sku = p_sku
      AND e.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_active_entitlement(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_active_entitlement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_entitlement(uuid, text) TO service_role;

-- Who liked me: Plus/Premium/VIP OR 24h reveal pass
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
  v_can_see := v_plan IN ('plus', 'premium', 'vip')
    OR public.user_has_active_entitlement(v_user_id, 'likes_reveal_24h');

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

-- Gallery: Plus+ or match
DROP POLICY IF EXISTS "Users can view own or unlocked profile photos" ON public.profile_photos;
CREATE POLICY "Users can view own or unlocked profile photos"
ON public.profile_photos
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_user_admin()
  OR public.get_user_plan(auth.uid()) IN ('plus', 'premium', 'vip')
  OR public.are_mutual_matches(auth.uid(), user_id)
);

-- Like limits: Plus = 100 swipes / 2 supers
CREATE OR REPLACE FUNCTION public.enforce_like_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_swipes_today integer;
  v_super_likes_today integer;
BEGIN
  v_plan := COALESCE(public.get_user_plan(NEW.from_user_id), 'free');

  SELECT COUNT(*) INTO v_swipes_today
  FROM public.likes
  WHERE from_user_id = NEW.from_user_id
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  SELECT COUNT(*) INTO v_super_likes_today
  FROM public.likes
  WHERE from_user_id = NEW.from_user_id
    AND is_super = true
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  IF v_plan = 'free' AND v_swipes_today >= 50 THEN
    RAISE EXCEPTION 'daily_swipe_limit_reached';
  ELSIF v_plan = 'plus' AND v_swipes_today >= 100 THEN
    RAISE EXCEPTION 'daily_swipe_limit_reached';
  END IF;

  IF NEW.is_super THEN
    IF v_plan = 'free' AND v_super_likes_today >= 1 THEN
      RAISE EXCEPTION 'daily_super_like_limit_reached';
    ELSIF v_plan = 'plus' AND v_super_likes_today >= 2 THEN
      RAISE EXCEPTION 'daily_super_like_limit_reached';
    ELSIF v_plan = 'premium' AND v_super_likes_today >= 5 THEN
      RAISE EXCEPTION 'daily_super_like_limit_reached';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Messages: free 15/day; plus+ unlimited
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

-- Allow purchased boosts granted by fulfill (service / no JWT)
CREATE OR REPLACE FUNCTION public.enforce_boost_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_boosts_today integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_plan := COALESCE(public.get_user_plan(NEW.user_id), 'free');

  SELECT COUNT(*) INTO v_boosts_today
  FROM public.boosts
  WHERE user_id = NEW.user_id
    AND started_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  IF v_plan = 'free' OR v_plan = 'plus' THEN
    RAISE EXCEPTION 'daily_boost_limit_reached';
  ELSIF v_plan = 'premium' AND v_boosts_today >= 1 THEN
    RAISE EXCEPTION 'daily_boost_limit_reached';
  ELSIF v_plan = 'vip' AND v_boosts_today >= 3 THEN
    RAISE EXCEPTION 'daily_boost_limit_reached';
  END IF;

  RETURN NEW;
END;
$$;

-- Discover advanced filters for plus+
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

-- Fulfill subscriptions + consumables
CREATE OR REPLACE FUNCTION public.fulfill_payment_by_token(
  p_token text,
  p_expected_amount integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.payment_orders%ROWTYPE;
  v_new_expires timestamptz;
  v_current_expires timestamptz;
  v_sku text;
  v_ent_expires timestamptz;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_order
  FROM public.payment_orders
  WHERE token_pay = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_expected_amount IS NOT NULL AND v_order.amount IS DISTINCT FROM p_expected_amount THEN
    RAISE EXCEPTION 'Payment amount mismatch';
  END IF;

  IF v_order.status = 'paid' THEN
    RETURN true;
  END IF;

  UPDATE public.payment_orders
  SET status = 'paid', updated_at = now()
  WHERE id = v_order.id;

  -- Consumables
  IF COALESCE(v_order.product_type, 'subscription') = 'consumable' THEN
    v_sku := COALESCE(v_order.product_sku, '');

    IF v_sku = 'likes_reveal_24h' THEN
      v_ent_expires := now() + interval '24 hours';
      INSERT INTO public.user_entitlements (user_id, sku, expires_at, source_order_id)
      VALUES (v_order.user_id, v_sku, v_ent_expires, v_order.id);

      INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (
        v_order.user_id,
        'subscription_renewal',
        'Qui m''aime débloqué',
        'Vous pouvez voir qui vous a aimé pendant 24 heures.'
      );
    ELSIF v_sku = 'boost_24h' THEN
      INSERT INTO public.boosts (user_id, expires_at)
      VALUES (v_order.user_id, now() + interval '24 hours');

      INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (
        v_order.user_id,
        'subscription_renewal',
        'Boost activé',
        'Votre profil est mis en avant pendant 24 heures.'
      );
    ELSIF v_sku = 'spotlight_24h' THEN
      v_ent_expires := now() + interval '24 hours';
      INSERT INTO public.user_entitlements (user_id, sku, expires_at, source_order_id)
      VALUES (v_order.user_id, v_sku, v_ent_expires, v_order.id);
      -- Spotlight also grants a boost for visibility
      INSERT INTO public.boosts (user_id, expires_at)
      VALUES (v_order.user_id, v_ent_expires);

      INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (
        v_order.user_id,
        'subscription_renewal',
        'Spotlight activé',
        'Votre profil est en Spot light pendant 24 heures.'
      );
    ELSE
      RAISE EXCEPTION 'Unknown consumable sku';
    END IF;

    RETURN true;
  END IF;

  -- Subscriptions
  IF v_order.plan IS NULL THEN
    RAISE EXCEPTION 'Subscription order missing plan';
  END IF;

  SELECT expires_at INTO v_current_expires
  FROM public.subscriptions
  WHERE user_id = v_order.user_id;

  v_new_expires := GREATEST(COALESCE(v_current_expires, now()), now()) + interval '30 days';

  UPDATE public.subscriptions
  SET
    plan = v_order.plan,
    started_at = CASE
      WHEN plan = v_order.plan AND status = 'active' THEN started_at
      ELSE now()
    END,
    expires_at = v_new_expires,
    status = 'active',
    updated_at = now()
  WHERE user_id = v_order.user_id;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (user_id, plan, expires_at, status)
    VALUES (v_order.user_id, v_order.plan, v_new_expires, 'active');
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    v_order.user_id,
    'subscription_renewal',
    CASE WHEN v_order.is_renewal THEN 'Abonnement renouvelé' ELSE 'Bienvenue Premium !' END,
    CASE WHEN v_order.is_renewal
      THEN 'Votre abonnement a été prolongé de 30 jours. Merci pour votre confiance !'
      ELSE 'Votre abonnement est actif. Profitez de tous vos avantages.'
    END
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_payment_by_token(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_by_token(text, integer) TO service_role;
