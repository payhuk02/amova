-- Push devices, push queue, KYC scoring, renewal payments

CREATE TABLE public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push devices"
ON public.push_devices FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.push_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  notification_type text,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only push queue"
ON public.push_queue FOR ALL TO authenticated
USING (false);

ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS liveness_score numeric,
  ADD COLUMN IF NOT EXISTS face_match_score numeric,
  ADD COLUMN IF NOT EXISTS auto_review_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS pose_challenge text;

ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS is_renewal boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.register_push_device(
  p_token text,
  p_platform text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_platform NOT IN ('android', 'ios', 'web') THEN
    RAISE EXCEPTION 'Invalid platform';
  END IF;

  INSERT INTO public.push_devices (user_id, token, platform, updated_at)
  VALUES (auth.uid(), p_token, p_platform, now())
  ON CONFLICT (user_id, token)
  DO UPDATE SET platform = EXCLUDED.platform, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_device(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_device(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.push_queue (user_id, title, body, notification_type)
  VALUES (NEW.user_id, NEW.title, COALESCE(NEW.body, ''), NEW.type);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_notification_enqueue_push ON public.notifications;
CREATE TRIGGER on_notification_enqueue_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_push_notification();

-- Renewal reminder notifications (idempotent per day)
CREATE OR REPLACE FUNCTION public.send_subscription_renewal_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  PERFORM public.expire_stale_subscriptions();

  FOR r IN
    SELECT s.user_id, s.plan::text AS plan, s.expires_at
    FROM public.subscriptions s
    WHERE s.status = 'active'
      AND s.plan <> 'free'
      AND s.expires_at IS NOT NULL
      AND s.expires_at > now()
      AND s.expires_at <= now() + interval '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = s.user_id
          AND n.type = 'subscription_renewal'
          AND n.created_at >= date_trunc('day', now())
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      r.user_id,
      'subscription_renewal',
      'Renouvellement bientôt dû',
      'Votre abonnement ' || upper(r.plan) || ' expire le '
        || to_char(r.expires_at AT TIME ZONE 'UTC', 'DD/MM/YYYY')
        || '. Renouvelez pour conserver vos avantages.'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.send_subscription_renewal_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_subscription_renewal_reminders() TO service_role;

-- Extend subscription on successful payment (renewal-aware)
CREATE OR REPLACE FUNCTION public.fulfill_payment_by_token(p_token text)
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
