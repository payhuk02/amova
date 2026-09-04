-- P2b: paid Premium trial (3 days) + eligibility RPC

ALTER TABLE public.payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_billing_period_check;

ALTER TABLE public.payment_orders
  ADD CONSTRAINT payment_orders_billing_period_check
  CHECK (billing_period IN ('monthly', 'quarterly', 'yearly', 'trial'));

CREATE OR REPLACE FUNCTION public.user_can_start_paid_trial(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = p_user_id
        AND s.plan IS DISTINCT FROM 'free'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_orders o
      WHERE o.user_id = p_user_id
        AND o.billing_period = 'trial'
        AND (
          o.status = 'paid'
          OR (o.status = 'pending' AND o.created_at > now() - interval '2 hours')
        )
    );
$$;

REVOKE ALL ON FUNCTION public.user_can_start_paid_trial(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_start_paid_trial(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_start_paid_trial(uuid) TO service_role;

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
  v_days integer;
  v_period_label text;
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
      INSERT INTO public.boosts (user_id, expires_at)
      VALUES (v_order.user_id, v_ent_expires);

      INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (
        v_order.user_id,
        'subscription_renewal',
        'Spotlight activé',
        'Votre profil est en Spotlight pendant 24 heures.'
      );
    ELSE
      RAISE EXCEPTION 'Unknown consumable sku';
    END IF;

    RETURN true;
  END IF;

  -- Subscriptions (+ paid trial)
  IF v_order.plan IS NULL THEN
    RAISE EXCEPTION 'Subscription order missing plan';
  END IF;

  v_days := CASE COALESCE(v_order.billing_period, 'monthly')
    WHEN 'trial' THEN 3
    WHEN 'quarterly' THEN 90
    WHEN 'yearly' THEN 365
    ELSE 30
  END;

  v_period_label := CASE COALESCE(v_order.billing_period, 'monthly')
    WHEN 'trial' THEN '3 jours'
    WHEN 'quarterly' THEN '90 jours'
    WHEN 'yearly' THEN '365 jours'
    ELSE '30 jours'
  END;

  SELECT expires_at INTO v_current_expires
  FROM public.subscriptions
  WHERE user_id = v_order.user_id;

  v_new_expires := GREATEST(COALESCE(v_current_expires, now()), now())
    + make_interval(days => v_days);

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
    CASE
      WHEN COALESCE(v_order.billing_period, '') = 'trial' THEN 'Essai Premium activé'
      WHEN v_order.is_renewal THEN 'Abonnement renouvelé'
      ELSE 'Bienvenue !'
    END,
    CASE
      WHEN COALESCE(v_order.billing_period, '') = 'trial'
        THEN 'Votre essai Premium de ' || v_period_label || ' est actif. Profitez-en !'
      WHEN v_order.is_renewal
        THEN 'Votre abonnement a été prolongé de ' || v_period_label || '. Merci pour votre confiance !'
      ELSE 'Votre abonnement est actif pour ' || v_period_label || '. Profitez de tous vos avantages.'
    END
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_payment_by_token(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_by_token(text, integer) TO service_role;
