-- P0 security hardening: prevent privilege escalation, lock down subscriptions,
-- badges, and notifications.

-- 1. Prevent users from granting themselves admin (service role bypasses via auth.uid() IS NULL)
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin AND auth.uid() IS NOT NULL THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_is_admin ON public.profiles;
CREATE TRIGGER protect_is_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privilege_escalation();

-- 2. Lock down subscriptions: users can only read their own plan
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

CREATE OR REPLACE FUNCTION public.admin_set_subscription(
  p_user_id uuid,
  p_plan public.subscription_plan,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.subscriptions
  SET
    plan = p_plan,
    started_at = now(),
    expires_at = p_expires_at,
    status = 'active',
    updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (user_id, plan, expires_at)
    VALUES (p_user_id, p_plan, p_expires_at);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_subscription(uuid, public.subscription_plan, timestamptz) TO authenticated;

-- 3. Badges: remove direct insert, award via validated RPC only
DROP POLICY IF EXISTS "System can insert badges" ON public.badges;

CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_mutual_count integer;
  v_likes_received integer;
  v_msg_count integer;
  v_event_count integer;
  v_story_count integer;
  v_days_since numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_user_id;

  IF v_profile.display_name IS NOT NULL
    AND v_profile.bio IS NOT NULL
    AND v_profile.age IS NOT NULL
    AND v_profile.city IS NOT NULL
    AND v_profile.avatar_url IS NOT NULL THEN
    INSERT INTO public.badges (user_id, badge_type)
    VALUES (v_user_id, 'profile_complete')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF v_profile.is_verified THEN
    INSERT INTO public.badges (user_id, badge_type)
    VALUES (v_user_id, 'verified')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  SELECT COUNT(*) INTO v_mutual_count
  FROM public.likes l1
  JOIN public.likes l2
    ON l1.to_user_id = l2.from_user_id AND l1.from_user_id = l2.to_user_id
  WHERE l1.from_user_id = v_user_id;

  IF v_mutual_count > 0 THEN
    INSERT INTO public.badges (user_id, badge_type)
    VALUES (v_user_id, 'first_match')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  SELECT COUNT(*) INTO v_likes_received
  FROM public.likes WHERE to_user_id = v_user_id;

  IF v_likes_received >= 10 THEN
    INSERT INTO public.badges (user_id, badge_type)
    VALUES (v_user_id, 'popular')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  SELECT COUNT(*) INTO v_msg_count
  FROM public.messages WHERE sender_id = v_user_id;

  IF v_msg_count >= 50 THEN
    INSERT INTO public.badges (user_id, badge_type)
    VALUES (v_user_id, 'social')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  SELECT COUNT(*) INTO v_event_count
  FROM public.event_attendees WHERE user_id = v_user_id;

  IF v_event_count >= 1 THEN
    INSERT INTO public.badges (user_id, badge_type)
    VALUES (v_user_id, 'explorer')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  SELECT COUNT(*) INTO v_story_count
  FROM public.stories WHERE user_id = v_user_id;

  IF v_story_count >= 5 THEN
    INSERT INTO public.badges (user_id, badge_type)
    VALUES (v_user_id, 'storyteller')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF v_profile.created_at IS NOT NULL THEN
    v_days_since := EXTRACT(EPOCH FROM (now() - v_profile.created_at)) / 86400;
    IF v_days_since >= 30 THEN
      INSERT INTO public.badges (user_id, badge_type)
      VALUES (v_user_id, 'loyal')
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_award_badges() TO authenticated;

-- 4. Notifications: remove client-side insert, use validated RPC for story likes
DROP POLICY IF EXISTS "Users can insert notifications for others" ON public.notifications;

CREATE OR REPLACE FUNCTION public.notify_story_like(p_story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_story_owner uuid;
  v_liker_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id INTO v_story_owner
  FROM public.stories
  WHERE id = p_story_id AND expires_at > now();

  IF v_story_owner IS NULL OR v_story_owner = auth.uid() THEN
    RETURN;
  END IF;

  SELECT display_name INTO v_liker_name
  FROM public.profiles
  WHERE user_id = auth.uid();

  INSERT INTO public.notifications (user_id, type, title, body, related_user_id)
  VALUES (
    v_story_owner,
    'story_like',
    '❤️ Story aimée',
    COALESCE(v_liker_name, 'Quelqu''un') || ' a aimé votre story',
    auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_story_like(uuid) TO authenticated;
