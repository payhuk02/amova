-- Professional KYC: ID document + selfie + 2 recent photos, admin-only approval.

ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS recent_photo_1_url text,
  ADD COLUMN IF NOT EXISTS recent_photo_2_url text,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.verification_requests.id_document_url IS 'Storage path of government ID (CNI/passport)';
COMMENT ON COLUMN public.verification_requests.recent_photo_1_url IS 'First recent personal photo for face consistency';
COMMENT ON COLUMN public.verification_requests.recent_photo_2_url IS 'Second recent personal photo for face consistency';

-- Submit full KYC dossier (sets profile pending via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.submit_verification_request(
  p_selfie_url text,
  p_id_document_url text,
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
     OR p_recent_photo_1_url IS NULL OR btrim(p_recent_photo_1_url) = ''
     OR p_recent_photo_2_url IS NULL OR btrim(p_recent_photo_2_url) = '' THEN
    RAISE EXCEPTION 'Tous les documents KYC sont obligatoires';
  END IF;

  v_prefix := v_user_id::text || '/';
  IF NOT (
    p_selfie_url LIKE v_prefix || '%'
    AND p_id_document_url LIKE v_prefix || '%'
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

REVOKE ALL ON FUNCTION public.submit_verification_request(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_verification_request(text, text, text, text, text, text) TO authenticated;

-- Admin review with optional rejection reason / notes
CREATE OR REPLACE FUNCTION public.admin_review_verification(
  p_request_id uuid,
  p_approved boolean,
  p_rejection_reason text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
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
    reviewed_by = auth.uid(),
    admin_notes = NULLIF(btrim(COALESCE(p_admin_notes, '')), ''),
    rejection_reason = CASE
      WHEN p_approved THEN NULL
      ELSE COALESCE(
        NULLIF(btrim(COALESCE(p_rejection_reason, '')), ''),
        'Documents non conformes — veuillez soumettre une nouvelle demande avec des pièces lisibles.'
      )
    END,
    auto_review_status = CASE WHEN p_approved THEN 'admin_approved' ELSE 'admin_rejected' END
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
      THEN 'Félicitations ! Votre identité a été confirmée par notre équipe de conformité.'
      ELSE COALESCE(
        NULLIF(btrim(COALESCE(p_rejection_reason, '')), ''),
        'Votre demande de vérification a été refusée. Vous pouvez soumettre une nouvelle demande.'
      )
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_verification(uuid, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_verification(uuid, boolean, text, text) TO authenticated;

-- Keep 2-arg overload for older clients
CREATE OR REPLACE FUNCTION public.admin_review_verification(
  p_request_id uuid,
  p_approved boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_review_verification(p_request_id, p_approved, NULL, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_verification(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_verification(uuid, boolean) TO authenticated;

-- Allow SECURITY DEFINER / admin KYC updates; users may only move to "pending"
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Service role (auth.uid null) and admins may update privileged fields
  IF auth.uid() IS NULL OR public.is_user_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    NEW.is_admin := OLD.is_admin;
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    NEW.is_verified := OLD.is_verified;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    -- Users can enter the KYC queue; verified/rejected only via admin/service
    IF NEW.verification_status = 'pending'
       AND COALESCE(OLD.verification_status, 'none') IN ('none', 'rejected', 'pending') THEN
      NULL;
    ELSE
      NEW.verification_status := OLD.verification_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
