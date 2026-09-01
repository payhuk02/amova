-- Fix 405 on get_incoming_likers: get_user_plan must not write in a STABLE/read path.
-- expire_stale_subscriptions() belongs in platform-cron only.

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

REVOKE ALL ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
