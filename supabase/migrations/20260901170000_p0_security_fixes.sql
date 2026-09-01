-- P0 security fixes: payments, KYC, likes paywall, verification escalation, speed dating

-- 1. Revoke free subscription extension RPC from authenticated users
REVOKE EXECUTE ON FUNCTION public.renew_subscription(uuid, public.subscription_plan) FROM authenticated;

-- 2. Prevent users from self-granting verified status
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      NEW.is_admin := OLD.is_admin;
    END IF;
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
      NEW.is_verified := OLD.is_verified;
    END IF;
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      NEW.verification_status := OLD.verification_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Lock down likes: users can only read their outgoing likes (paywall via get_incoming_likers)
DROP POLICY IF EXISTS "Users can view their own likes" ON public.likes;
CREATE POLICY "Users can view their outgoing likes" ON public.likes
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id);

-- 4. RPCs to replace direct incoming-like queries
CREATE OR REPLACE FUNCTION public.get_mutual_match_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l1.to_user_id
  FROM public.likes l1
  INNER JOIN public.likes l2
    ON l1.to_user_id = l2.from_user_id
    AND l1.from_user_id = l2.to_user_id
  WHERE l1.from_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_liked_me(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.likes
    WHERE from_user_id = p_user_id AND to_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_stats(p_user_id uuid)
RETURNS TABLE(like_count bigint, match_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.likes WHERE to_user_id = p_user_id),
    (
      SELECT count(*)
      FROM public.likes l1
      INNER JOIN public.likes l2
        ON l1.from_user_id = l2.to_user_id
        AND l1.to_user_id = l2.from_user_id
      WHERE l1.from_user_id = p_user_id
    );
$$;

REVOKE ALL ON FUNCTION public.get_mutual_match_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mutual_match_user_ids() TO authenticated;

REVOKE ALL ON FUNCTION public.has_liked_me(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_liked_me(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_profile_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_stats(uuid) TO authenticated;

-- 5. Mask liker identity in notifications for free users
CREATE OR REPLACE FUNCTION public.notify_on_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reverse_exists boolean;
  liker_name text;
  liked_name text;
  liked_plan public.subscription_plan;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.likes
    WHERE from_user_id = NEW.to_user_id AND to_user_id = NEW.from_user_id
  ) INTO reverse_exists;

  IF reverse_exists THEN
    SELECT display_name INTO liker_name FROM public.profiles WHERE user_id = NEW.from_user_id;
    SELECT display_name INTO liked_name FROM public.profiles WHERE user_id = NEW.to_user_id;

    INSERT INTO public.notifications (user_id, type, title, body, related_user_id)
    VALUES
      (NEW.from_user_id, 'match', 'Nouveau match !', 'Vous avez matché avec ' || COALESCE(liked_name, 'quelqu''un'), NEW.to_user_id),
      (NEW.to_user_id, 'match', 'Nouveau match !', 'Vous avez matché avec ' || COALESCE(liker_name, 'quelqu''un'), NEW.from_user_id);
  ELSE
    SELECT public.get_user_plan(NEW.to_user_id) INTO liked_plan;

    IF liked_plan IN ('premium', 'vip') THEN
      SELECT display_name INTO liker_name FROM public.profiles WHERE user_id = NEW.from_user_id;
      INSERT INTO public.notifications (user_id, type, title, body, related_user_id)
      VALUES (
        NEW.to_user_id,
        'like',
        'Quelqu''un vous aime',
        COALESCE(liker_name, 'Quelqu''un') || ' a aimé votre profil',
        NEW.from_user_id
      );
    ELSE
      INSERT INTO public.notifications (user_id, type, title, body, related_user_id)
      VALUES (
        NEW.to_user_id,
        'like',
        'Quelqu''un vous aime',
        'Quelqu''un a aimé votre profil. Passez Premium pour voir qui !',
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Remove duplicate notification triggers
DROP TRIGGER IF EXISTS on_new_like_notify ON public.likes;
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;

-- 7. Speed dating: atomic matchmaking RPC
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.speed_dating_queue
  WHERE user_id = v_user_id AND status = 'waiting';

  SELECT * INTO v_waiting
  FROM public.speed_dating_queue q
  WHERE q.status = 'waiting'
    AND q.user_id <> v_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = v_user_id AND b.blocked_id = q.user_id)
         OR (b.blocker_id = q.user_id AND b.blocked_id = v_user_id)
    )
  ORDER BY q.joined_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

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

REVOKE ALL ON FUNCTION public.join_speed_dating_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_speed_dating_queue() TO authenticated;

-- 8. Admin storage access for KYC selfies
DROP POLICY IF EXISTS "Admins can view all verification photos" ON storage.objects;
CREATE POLICY "Admins can view all verification photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verifications'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- 9. Validate payment amount on fulfillment
DROP FUNCTION IF EXISTS public.fulfill_payment_by_token(text);

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
