-- Admin platform control: stats RPCs, moderation policies, and management functions

-- ─── Admin read policies ───────────────────────────────────────────────────

CREATE POLICY "Admins can view all payment orders"
ON public.payment_orders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view all verification requests"
ON public.verification_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can update verification requests"
ON public.verification_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view all likes"
ON public.likes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can delete messages"
ON public.messages FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view all stories"
ON public.stories FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can delete stories"
ON public.stories FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can delete events"
ON public.events FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view all boosts"
ON public.boosts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view all blocked users"
ON public.blocked_users FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view speed dating queue"
ON public.speed_dating_queue FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- ─── Platform stats ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'users_count', (SELECT count(*) FROM public.profiles),
    'reports_pending', (SELECT count(*) FROM public.reports WHERE status = 'pending'),
    'likes_count', (SELECT count(*) FROM public.likes),
    'messages_count', (SELECT count(*) FROM public.messages),
    'matches_count', (
      SELECT count(*) FROM public.likes l1
      INNER JOIN public.likes l2
        ON l1.from_user_id = l2.to_user_id AND l1.to_user_id = l2.from_user_id
      WHERE l1.from_user_id < l1.to_user_id
    ),
    'events_count', (SELECT count(*) FROM public.events),
    'stories_active', (SELECT count(*) FROM public.stories WHERE expires_at > now()),
    'verifications_pending', (SELECT count(*) FROM public.verification_requests WHERE status = 'pending'),
    'payments_paid', (SELECT count(*) FROM public.payment_orders WHERE status = 'paid'),
    'revenue_total', COALESCE((SELECT sum(amount) FROM public.payment_orders WHERE status = 'paid'), 0),
    'premium_users', (SELECT count(*) FROM public.subscriptions WHERE plan IN ('premium', 'vip') AND status = 'active'),
    'speed_dating_active', (SELECT count(*) FROM public.speed_dating_queue WHERE status IN ('waiting', 'matched'))
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;

-- ─── Verification review ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_review_verification(
  p_request_id uuid,
  p_approved boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.verification_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;

  UPDATE public.verification_requests
  SET status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      reviewed_at = now()
  WHERE id = p_request_id;

  UPDATE public.profiles
  SET
    is_verified = p_approved,
    verification_status = CASE WHEN p_approved THEN 'verified' ELSE 'rejected' END
  WHERE user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_verification(uuid, boolean) TO authenticated;

-- ─── Admin role management ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_set_admin(
  p_user_id uuid,
  p_is_admin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_user_id = auth.uid() AND NOT p_is_admin THEN
    RAISE EXCEPTION 'Cannot revoke your own admin access';
  END IF;

  UPDATE public.profiles
  SET is_admin = p_is_admin
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_admin(uuid, boolean) TO authenticated;

-- ─── Broadcast notifications ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_send_notification(
  p_title text,
  p_body text,
  p_user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (p_user_id, 'admin', trim(p_title), COALESCE(trim(p_body), ''));
    RETURN 1;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body)
  SELECT user_id, 'admin', trim(p_title), COALESCE(trim(p_body), '')
  FROM public.profiles;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_send_notification(text, text, uuid) TO authenticated;
