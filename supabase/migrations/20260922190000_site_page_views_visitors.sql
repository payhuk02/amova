-- First-party page views for admin visitor analytics (privacy-friendly: no IP).

CREATE TABLE IF NOT EXISTS public.site_page_views (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  path text NOT NULL,
  referrer_host text,
  session_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  is_authed boolean NOT NULL DEFAULT false,
  device text NOT NULL DEFAULT 'unknown'
    CHECK (device IN ('mobile', 'desktop', 'tablet', 'unknown'))
);

CREATE INDEX IF NOT EXISTS site_page_views_created_at_idx
  ON public.site_page_views (created_at DESC);

CREATE INDEX IF NOT EXISTS site_page_views_path_created_idx
  ON public.site_page_views (path, created_at DESC);

CREATE INDEX IF NOT EXISTS site_page_views_session_created_idx
  ON public.site_page_views (session_id, created_at DESC);

ALTER TABLE public.site_page_views ENABLE ROW LEVEL SECURITY;

-- No direct client access — insert/read via SECURITY DEFINER RPCs only.
DROP POLICY IF EXISTS "No direct access to site_page_views" ON public.site_page_views;

COMMENT ON TABLE public.site_page_views IS
  'Anonymous-ish page views for admin analytics. No IP stored.';

CREATE OR REPLACE FUNCTION public.record_page_view(
  p_path text,
  p_session_id uuid,
  p_referrer_host text DEFAULT NULL,
  p_device text DEFAULT 'unknown'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
  v_host text;
  v_device text;
  v_uid uuid;
BEGIN
  v_path := left(trim(COALESCE(p_path, '/')), 300);
  IF v_path = '' THEN
    v_path := '/';
  END IF;
  -- Normalize: strip query/hash if somehow present
  v_path := split_part(v_path, '?', 1);
  v_path := split_part(v_path, '#', 1);
  IF left(v_path, 1) <> '/' THEN
    v_path := '/' || v_path;
  END IF;

  -- Skip noisy/private admin noise optional — still track /admin for ops
  IF v_path ~* '^/(assets|src|node_modules)' THEN
    RETURN;
  END IF;

  IF p_session_id IS NULL THEN
    RETURN;
  END IF;

  -- Debounce: same session + path within 20 seconds
  IF EXISTS (
    SELECT 1
    FROM public.site_page_views
    WHERE session_id = p_session_id
      AND path = v_path
      AND created_at > now() - interval '20 seconds'
  ) THEN
    RETURN;
  END IF;

  v_host := NULLIF(left(trim(COALESCE(p_referrer_host, '')), 200), '');
  v_device := CASE
    WHEN p_device IN ('mobile', 'desktop', 'tablet', 'unknown') THEN p_device
    ELSE 'unknown'
  END;

  BEGIN
    v_uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  INSERT INTO public.site_page_views (path, referrer_host, session_id, user_id, is_authed, device)
  VALUES (v_path, v_host, p_session_id, v_uid, v_uid IS NOT NULL, v_device);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_page_view(text, uuid, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_visitor_stats(p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_since timestamptz;
  v_today date;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_days := GREATEST(1, LEAST(COALESCE(p_days, 7), 90));
  v_since := date_trunc('day', now() AT TIME ZONE 'UTC') - ((v_days - 1) || ' days')::interval;
  v_today := (now() AT TIME ZONE 'UTC')::date;

  RETURN jsonb_build_object(
    'period_days', v_days,
    'visits_today', (
      SELECT COUNT(*)::integer
      FROM public.site_page_views
      WHERE created_at >= v_today::timestamptz
    ),
    'unique_sessions_today', (
      SELECT COUNT(DISTINCT session_id)::integer
      FROM public.site_page_views
      WHERE created_at >= v_today::timestamptz
    ),
    'visits_period', (
      SELECT COUNT(*)::integer
      FROM public.site_page_views
      WHERE created_at >= v_since
    ),
    'unique_sessions_period', (
      SELECT COUNT(DISTINCT session_id)::integer
      FROM public.site_page_views
      WHERE created_at >= v_since
    ),
    'authed_visits_period', (
      SELECT COUNT(*)::integer
      FROM public.site_page_views
      WHERE created_at >= v_since AND is_authed
    ),
    'devices', (
      SELECT COALESCE(jsonb_object_agg(device, cnt), '{}'::jsonb)
      FROM (
        SELECT device, COUNT(*)::integer AS cnt
        FROM public.site_page_views
        WHERE created_at >= v_since
        GROUP BY device
      ) d
    ),
    'top_pages', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      FROM (
        SELECT path, COUNT(*)::integer AS views,
               COUNT(DISTINCT session_id)::integer AS sessions
        FROM public.site_page_views
        WHERE created_at >= v_since
        GROUP BY path
        ORDER BY COUNT(*) DESC
        LIMIT 20
      ) t
    ),
    'top_referrers', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      FROM (
        SELECT COALESCE(NULLIF(referrer_host, ''), '(direct)') AS referrer,
               COUNT(*)::integer AS views
        FROM public.site_page_views
        WHERE created_at >= v_since
        GROUP BY 1
        ORDER BY COUNT(*) DESC
        LIMIT 15
      ) t
    ),
    'by_day', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      FROM (
        SELECT (created_at AT TIME ZONE 'UTC')::date AS day,
               COUNT(*)::integer AS views,
               COUNT(DISTINCT session_id)::integer AS sessions
        FROM public.site_page_views
        WHERE created_at >= v_since
        GROUP BY 1
        ORDER BY 1 ASC
      ) t
    ),
    'recent', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      FROM (
        SELECT path, referrer_host, is_authed, device, created_at
        FROM public.site_page_views
        ORDER BY created_at DESC
        LIMIT 40
      ) t
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_visitor_stats(integer) TO authenticated;
