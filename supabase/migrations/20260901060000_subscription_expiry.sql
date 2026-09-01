-- Subscription expiry + plan resolution fixes

CREATE OR REPLACE FUNCTION public.expire_stale_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.subscriptions
  SET
    plan = 'free',
    status = 'expired',
    updated_at = now()
  WHERE status = 'active'
    AND plan <> 'free'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_subscriptions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_subscriptions() TO service_role;

CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_expires timestamptz;
  v_status text;
BEGIN
  PERFORM public.expire_stale_subscriptions();

  SELECT plan::text, expires_at, status
  INTO v_plan, v_expires, v_status
  FROM public.subscriptions
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_plan IS NULL OR v_status <> 'active' THEN
    RETURN 'free';
  END IF;

  IF v_plan <> 'free' AND v_expires IS NOT NULL AND v_expires < now() THEN
    RETURN 'free';
  END IF;

  RETURN v_plan;
END;
$$;

-- Renew subscription (extends 30 days from max(now, current expiry))
CREATE OR REPLACE FUNCTION public.renew_subscription(p_user_id uuid, p_plan public.subscription_plan)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_expires timestamptz;
  v_new_expires timestamptz;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT expires_at INTO v_current_expires
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  v_new_expires := GREATEST(COALESCE(v_current_expires, now()), now()) + interval '30 days';

  UPDATE public.subscriptions
  SET
    plan = p_plan,
    status = 'active',
    started_at = CASE WHEN plan = p_plan AND status = 'active' THEN started_at ELSE now() END,
    expires_at = v_new_expires,
    updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (user_id, plan, expires_at, status)
    VALUES (p_user_id, p_plan, v_new_expires, 'active');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.renew_subscription(uuid, public.subscription_plan) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renew_subscription(uuid, public.subscription_plan) TO authenticated;
