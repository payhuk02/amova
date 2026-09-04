-- KYC: require ID front + back (recto/verso)

ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS id_document_verso_url text;

COMMENT ON COLUMN public.verification_requests.id_document_verso_url IS 'Storage path of ID document back (verso)';

DROP FUNCTION IF EXISTS public.submit_verification_request(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_verification_request(
  p_selfie_url text,
  p_id_document_url text,
  p_id_document_verso_url text,
  p_recent_photo_1_url text,
  p_recent_photo_2_url text,
  p_document_type text DEFAULT 'cni',
  p_pose_challenge text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_prefix text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_selfie_url IS NULL OR btrim(p_selfie_url) = ''
     OR p_id_document_url IS NULL OR btrim(p_id_document_url) = ''
     OR p_id_document_verso_url IS NULL OR btrim(p_id_document_verso_url) = ''
     OR p_recent_photo_1_url IS NULL OR btrim(p_recent_photo_1_url) = ''
     OR p_recent_photo_2_url IS NULL OR btrim(p_recent_photo_2_url) = '' THEN
    RAISE EXCEPTION 'Tous les documents KYC sont obligatoires (recto, verso, selfie, 2 photos)';
  END IF;

  v_prefix := v_user_id::text || '/';
  IF NOT (
    p_selfie_url LIKE v_prefix || '%'
    AND p_id_document_url LIKE v_prefix || '%'
    AND p_id_document_verso_url LIKE v_prefix || '%'
    AND p_recent_photo_1_url LIKE v_prefix || '%'
    AND p_recent_photo_2_url LIKE v_prefix || '%'
  ) THEN
    RAISE EXCEPTION 'Chemins de stockage invalides';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.verification_requests
    WHERE user_id = v_user_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Une demande est déjà en cours d''examen';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = v_user_id AND verification_status = 'verified' AND is_verified = true
  ) THEN
    RAISE EXCEPTION 'Profil déjà vérifié';
  END IF;

  INSERT INTO public.verification_requests (
    user_id,
    selfie_url,
    id_document_url,
    id_document_verso_url,
    recent_photo_1_url,
    recent_photo_2_url,
    document_type,
    pose_challenge,
    status,
    auto_review_status,
    provider
  ) VALUES (
    v_user_id,
    p_selfie_url,
    p_id_document_url,
    p_id_document_verso_url,
    p_recent_photo_1_url,
    p_recent_photo_2_url,
    COALESCE(NULLIF(btrim(p_document_type), ''), 'cni'),
    p_pose_challenge,
    'pending',
    'pending_review',
    'manual_kyc'
  )
  RETURNING id INTO v_request_id;

  UPDATE public.profiles
  SET
    verification_status = 'pending',
    verification_photo_url = p_selfie_url
  WHERE user_id = v_user_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_verification_request(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_verification_request(text, text, text, text, text, text, text) TO authenticated;
