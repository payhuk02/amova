-- P1: Enforce premium limits server-side and prepare account deletion support.

-- Daily like/super-like limits based on subscription plan
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
  END IF;

  IF NEW.is_super THEN
    IF v_plan = 'free' AND v_super_likes_today >= 1 THEN
      RAISE EXCEPTION 'daily_super_like_limit_reached';
    ELSIF v_plan = 'premium' AND v_super_likes_today >= 5 THEN
      RAISE EXCEPTION 'daily_super_like_limit_reached';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_like_limits_trigger ON public.likes;
CREATE TRIGGER enforce_like_limits_trigger
  BEFORE INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_like_limits();

-- Daily boost limits based on subscription plan
CREATE OR REPLACE FUNCTION public.enforce_boost_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_boosts_today integer;
  v_daily_limit integer;
BEGIN
  v_plan := COALESCE(public.get_user_plan(NEW.user_id), 'free');

  v_daily_limit := CASE v_plan
    WHEN 'free' THEN 0
    WHEN 'premium' THEN 1
    ELSE 3
  END;

  SELECT COUNT(*) INTO v_boosts_today
  FROM public.boosts
  WHERE user_id = NEW.user_id
    AND started_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  IF v_boosts_today >= v_daily_limit THEN
    RAISE EXCEPTION 'daily_boost_limit_reached';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_boost_limits_trigger ON public.boosts;
CREATE TRIGGER enforce_boost_limits_trigger
  BEFORE INSERT ON public.boosts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_boost_limits();

-- Incognito mode restricted to VIP plan
CREATE OR REPLACE FUNCTION public.enforce_incognito_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
BEGIN
  IF NEW.incognito_mode IS DISTINCT FROM OLD.incognito_mode AND NEW.incognito_mode = true THEN
    v_plan := COALESCE(public.get_user_plan(NEW.user_id), 'free');
    IF v_plan <> 'vip' THEN
      RAISE EXCEPTION 'incognito_requires_vip';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_incognito_plan_trigger ON public.profiles;
CREATE TRIGGER enforce_incognito_plan_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_incognito_plan();
