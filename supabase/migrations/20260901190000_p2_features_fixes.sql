-- P2 fixes: stories match-only, GDPR export, blocked users list, verification notifications

-- 1. Mutual match helper (reusable for stories RLS)
CREATE OR REPLACE FUNCTION public.are_mutual_matches(p_user_a uuid, p_user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.likes l1
    INNER JOIN public.likes l2
      ON l1.from_user_id = l2.to_user_id
      AND l1.to_user_id = l2.from_user_id
    WHERE l1.from_user_id = p_user_a AND l1.to_user_id = p_user_b
  );
$$;

REVOKE ALL ON FUNCTION public.are_mutual_matches(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_mutual_matches(uuid, uuid) TO authenticated;

-- 2. Stories: visible only to owner or mutual matches
DROP POLICY IF EXISTS "Authenticated users can view non-expired stories" ON public.stories;
CREATE POLICY "Users can view own or matched stories" ON public.stories
  FOR SELECT TO authenticated
  USING (
    expires_at > now()
    AND (
      user_id = auth.uid()
      OR public.are_mutual_matches(auth.uid(), user_id)
    )
  );

-- 3. Blocked users list for Settings (outgoing blocks only)
CREATE OR REPLACE FUNCTION public.get_my_blocked_users()
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.blocked_id, p.display_name, p.avatar_url
  FROM public.blocked_users b
  INNER JOIN public.profiles p ON p.user_id = b.blocked_id
  WHERE b.blocker_id = auth.uid()
  ORDER BY p.display_name NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_my_blocked_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_blocked_users() TO authenticated;

-- 4. Complete GDPR export
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN jsonb_build_object(
    'exported_at', now(),
    'user_id', v_user_id,
    'profile', (
      SELECT to_jsonb(p) - 'verification_photo_url'
      FROM public.profiles p
      WHERE p.user_id = v_user_id
    ),
    'photos', COALESCE((
      SELECT jsonb_agg(to_jsonb(pp) ORDER BY pp.position)
      FROM public.profile_photos pp
      WHERE pp.user_id = v_user_id
    ), '[]'::jsonb),
    'likes_sent', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'to_user_id', l.to_user_id,
        'created_at', l.created_at,
        'is_super', l.is_super
      ) ORDER BY l.created_at DESC)
      FROM public.likes l
      WHERE l.from_user_id = v_user_id
    ), '[]'::jsonb),
    'likes_received', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'from_user_id', l.from_user_id,
        'created_at', l.created_at,
        'is_super', l.is_super
      ) ORDER BY l.created_at DESC)
      FROM public.likes l
      WHERE l.to_user_id = v_user_id
    ), '[]'::jsonb),
    'messages', COALESCE((
      SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC)
      FROM public.messages m
      WHERE m.sender_id = v_user_id OR m.receiver_id = v_user_id
    ), '[]'::jsonb),
    'subscription', (
      SELECT to_jsonb(s)
      FROM public.subscriptions s
      WHERE s.user_id = v_user_id
      LIMIT 1
    ),
    'badges', COALESCE((
      SELECT jsonb_agg(to_jsonb(b))
      FROM public.badges b
      WHERE b.user_id = v_user_id
    ), '[]'::jsonb),
    'reports_filed', COALESCE((
      SELECT jsonb_agg(to_jsonb(r))
      FROM public.reports r
      WHERE r.reporter_id = v_user_id
    ), '[]'::jsonb),
    'blocked_users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('blocked_id', b.blocked_id, 'created_at', b.created_at))
      FROM public.blocked_users b
      WHERE b.blocker_id = v_user_id
    ), '[]'::jsonb),
    'stories', COALESCE((
      SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC)
      FROM public.stories s
      WHERE s.user_id = v_user_id
    ), '[]'::jsonb),
    'story_views', COALESCE((
      SELECT jsonb_agg(to_jsonb(sv) ORDER BY sv.viewed_at DESC)
      FROM public.story_views sv
      WHERE sv.viewer_id = v_user_id
    ), '[]'::jsonb),
    'events_created', COALESCE((
      SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC)
      FROM public.events e
      WHERE e.creator_id = v_user_id
    ), '[]'::jsonb),
    'event_attendance', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'event_id', ea.event_id,
        'joined_at', ea.joined_at
      ) ORDER BY ea.joined_at DESC)
      FROM public.event_attendees ea
      WHERE ea.user_id = v_user_id
    ), '[]'::jsonb),
    'notifications', COALESCE((
      SELECT jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC)
      FROM public.notifications n
      WHERE n.user_id = v_user_id
    ), '[]'::jsonb),
    'verification_requests', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(vr) - 'selfie_url'
        ORDER BY vr.created_at DESC
      )
      FROM public.verification_requests vr
      WHERE vr.user_id = v_user_id
    ), '[]'::jsonb),
    'payment_orders', COALESCE((
      SELECT jsonb_agg(to_jsonb(po) ORDER BY po.created_at DESC)
      FROM public.payment_orders po
      WHERE po.user_id = v_user_id
    ), '[]'::jsonb),
    'boosts', COALESCE((
      SELECT jsonb_agg(to_jsonb(b) ORDER BY b.started_at DESC)
      FROM public.boosts b
      WHERE b.user_id = v_user_id
    ), '[]'::jsonb),
    'push_devices', COALESCE((
      SELECT jsonb_agg(to_jsonb(pd) ORDER BY pd.updated_at DESC)
      FROM public.push_devices pd
      WHERE pd.user_id = v_user_id
    ), '[]'::jsonb)
  );
END;
$$;

-- 5. Admin verification review: notify user + award badge
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
  SET
    status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    reviewed_at = now(),
    rejection_reason = CASE WHEN p_approved THEN NULL ELSE COALESCE(rejection_reason, 'Rejeté par un administrateur') END
  WHERE id = p_request_id;

  UPDATE public.profiles
  SET
    is_verified = p_approved,
    verification_status = CASE WHEN p_approved THEN 'verified' ELSE 'rejected' END
  WHERE user_id = v_user_id;

  IF p_approved THEN
    INSERT INTO public.badges (user_id, badge_type)
    VALUES (v_user_id, 'verified')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    v_user_id,
    'verification',
    CASE WHEN p_approved THEN 'Profil vérifié' ELSE 'Vérification refusée' END,
    CASE WHEN p_approved
      THEN 'Félicitations ! Votre identité a été confirmée par notre équipe.'
      ELSE 'Votre demande de vérification a été refusée. Vous pouvez soumettre une nouvelle demande.'
    END
  );
END;
$$;
