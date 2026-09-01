-- OpenRouter AI configuration: settings, API key pool with rotation, admin RPCs

CREATE TABLE public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  model_match text NOT NULL DEFAULT 'google/gemini-2.0-flash-exp:free',
  model_compatibility text NOT NULL DEFAULT 'google/gemini-2.0-flash-exp:free',
  model_icebreaker text NOT NULL DEFAULT 'google/gemini-2.0-flash-exp:free',
  model_coach text NOT NULL DEFAULT 'google/gemini-2.0-flash-exp:free',
  model_kyc text NOT NULL DEFAULT 'google/gemini-2.0-flash-exp:free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ai_settings_singleton ON public.ai_settings ((true));

INSERT INTO public.ai_settings (enabled) VALUES (true);

CREATE TABLE public.ai_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'Clé OpenRouter',
  api_key text NOT NULL,
  key_prefix text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'error')),
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_api_keys_active_priority_idx
  ON public.ai_api_keys (priority ASC)
  WHERE is_active = true AND status = 'active';

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_ai_key_usage(p_key_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_api_keys
  SET
    usage_count = usage_count + 1,
    last_used_at = now(),
    updated_at = now()
  WHERE id = p_key_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_ai_config()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings jsonb;
  v_keys jsonb;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT to_jsonb(s.*) INTO v_settings
  FROM public.ai_settings s
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', k.id,
      'label', k.label,
      'key_prefix', k.key_prefix,
      'priority', k.priority,
      'is_active', k.is_active,
      'status', k.status,
      'usage_count', k.usage_count,
      'last_used_at', k.last_used_at,
      'last_error_at', k.last_error_at,
      'last_error_message', k.last_error_message,
      'created_at', k.created_at
    ) ORDER BY k.priority ASC, k.created_at ASC
  ), '[]'::jsonb) INTO v_keys
  FROM public.ai_api_keys k;

  RETURN jsonb_build_object('settings', v_settings, 'keys', v_keys);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_ai_key(
  p_label text,
  p_api_key text,
  p_priority integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_key text;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_key := trim(p_api_key);
  IF length(v_key) < 10 THEN
    RAISE EXCEPTION 'Clé API invalide';
  END IF;

  INSERT INTO public.ai_api_keys (label, api_key, key_prefix, priority)
  VALUES (
    COALESCE(NULLIF(trim(p_label), ''), 'Clé OpenRouter'),
    v_key,
    left(v_key, 14) || '...',
    COALESCE(p_priority, 0)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_ai_key(
  p_id uuid,
  p_label text DEFAULT NULL,
  p_priority integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
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

  UPDATE public.ai_api_keys
  SET
    label = COALESCE(NULLIF(trim(p_label), ''), label),
    priority = COALESCE(p_priority, priority),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clé introuvable';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_ai_key(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.ai_api_keys
  SET
    status = 'active',
    last_error_at = NULL,
    last_error_message = NULL,
    updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clé introuvable';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_ai_key(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.ai_api_keys WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clé introuvable';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_ai_settings(
  p_enabled boolean,
  p_model_match text,
  p_model_compatibility text,
  p_model_icebreaker text,
  p_model_coach text,
  p_model_kyc text
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

  UPDATE public.ai_settings
  SET
    enabled = p_enabled,
    model_match = NULLIF(trim(p_model_match), ''),
    model_compatibility = NULLIF(trim(p_model_compatibility), ''),
    model_icebreaker = NULLIF(trim(p_model_icebreaker), ''),
    model_coach = NULLIF(trim(p_model_coach), ''),
    model_kyc = NULLIF(trim(p_model_kyc), ''),
    updated_at = now()
  WHERE id = (SELECT id FROM public.ai_settings LIMIT 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_ai_config() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_ai_key(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_ai_key(uuid, text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_ai_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_ai_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_ai_settings(boolean, text, text, text, text, text) TO authenticated;
