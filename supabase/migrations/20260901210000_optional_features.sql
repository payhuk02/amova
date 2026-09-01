-- Optional features: VAPID web push columns, Sumsub KYC fields

ALTER TABLE public.push_devices
  ADD COLUMN IF NOT EXISTS endpoint text,
  ADD COLUMN IF NOT EXISTS p256dh text,
  ADD COLUMN IF NOT EXISTS auth_key text;

CREATE OR REPLACE FUNCTION public.register_push_device(
  p_token text,
  p_platform text,
  p_endpoint text DEFAULT NULL,
  p_p256dh text DEFAULT NULL,
  p_auth_key text DEFAULT NULL
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

  INSERT INTO public.push_devices (user_id, token, platform, endpoint, p256dh, auth_key, updated_at)
  VALUES (auth.uid(), p_token, p_platform, p_endpoint, p_p256dh, p_auth_key, now())
  ON CONFLICT (user_id, token)
  DO UPDATE SET
    platform = EXCLUDED.platform,
    endpoint = EXCLUDED.endpoint,
    p256dh = EXCLUDED.p256dh,
    auth_key = EXCLUDED.auth_key,
    updated_at = now();
END;
$$;

ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS external_id text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sumsub_applicant_id text;

CREATE OR REPLACE FUNCTION public.complete_identity_verification(
  p_user_id uuid,
  p_provider text DEFAULT 'sumsub',
  p_external_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    is_verified = true,
    verification_status = 'verified',
    sumsub_applicant_id = COALESCE(p_external_id, sumsub_applicant_id)
  WHERE user_id = p_user_id;

  UPDATE public.verification_requests
  SET
    status = 'approved',
    provider = p_provider,
    external_id = COALESCE(p_external_id, external_id),
    reviewed_at = now(),
    auto_review_status = 'approved'
  WHERE user_id = p_user_id AND status = 'pending';

  INSERT INTO public.badges (user_id, badge_type)
  VALUES (p_user_id, 'verified')
  ON CONFLICT (user_id, badge_type) DO NOTHING;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    p_user_id,
    'verification',
    'Profil vérifié',
    'Votre identité a été confirmée par notre partenaire de vérification.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_identity_verification(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_identity_verification(uuid, text, text) TO service_role;
