-- Count passes toward daily swipe quota (likes + passes).
-- Free: 50 / Plus: 100 / Premium+VIP: unlimited

CREATE OR REPLACE FUNCTION public.count_daily_swipes(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    (SELECT COUNT(*)::integer
     FROM public.likes
     WHERE from_user_id = p_user_id
       AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC'))
    +
    (SELECT COUNT(*)::integer
     FROM public.profile_passes
     WHERE from_user_id = p_user_id
       AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC'))
  );
$$;

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
  v_swipes_today := public.count_daily_swipes(NEW.from_user_id);

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

CREATE OR REPLACE FUNCTION public.enforce_pass_swipe_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_swipes_today integer;
BEGIN
  v_plan := COALESCE(public.get_user_plan(NEW.from_user_id), 'free');
  v_swipes_today := public.count_daily_swipes(NEW.from_user_id);

  IF v_plan = 'free' AND v_swipes_today >= 50 THEN
    RAISE EXCEPTION 'daily_swipe_limit_reached';
  ELSIF v_plan = 'plus' AND v_swipes_today >= 100 THEN
    RAISE EXCEPTION 'daily_swipe_limit_reached';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pass_swipe_limits_trigger ON public.profile_passes;
CREATE TRIGGER enforce_pass_swipe_limits_trigger
  BEFORE INSERT ON public.profile_passes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pass_swipe_limits();
