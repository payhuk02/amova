-- HOTFIX: revoke mass is_admin + harden hetero profile visibility
-- Root cause: every profile had is_admin=true → admin nav for all + can_select_profile bypass for same-gender

-- Keep only the platform owner as admin (adjust email if needed)
UPDATE public.profiles p
SET is_admin = false
WHERE p.is_admin = true
  AND p.user_id NOT IN (
    SELECT id FROM auth.users WHERE lower(email) = lower('payhukpro9@gmail.com')
  );

UPDATE public.profiles p
SET is_admin = true
FROM auth.users u
WHERE p.user_id = u.id
  AND lower(u.email) = lower('payhukpro9@gmail.com');

-- Never allow clients to set is_admin on INSERT (must stay false)
CREATE OR REPLACE FUNCTION public.protect_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.is_admin := false;
    RETURN NEW;
  END IF;

  -- Updates: only an existing admin may change is_admin via set_user_admin RPC;
  -- block direct client flips except when caller is already admin AND using service path.
  IF TG_OP = 'UPDATE' AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF auth.uid() IS NULL THEN
      -- service role / trigger context may proceed
      RETURN NEW;
    END IF;
    -- Non-admins cannot elevate; admins changing others should use set_user_admin
    IF NOT COALESCE((
      SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()
    ), false) THEN
      NEW.is_admin := OLD.is_admin;
    ELSIF NEW.user_id = auth.uid() AND NEW.is_admin = false AND OLD.is_admin = true THEN
      -- Prevent self-demotion lockout via direct update (use RPC)
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_is_admin ON public.profiles;
CREATE TRIGGER protect_is_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_is_admin();

-- Strict heterosexual SELECT for non-admins
CREATE OR REPLACE FUNCTION public.can_select_profile(p_target uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  my_gender text;
  their_gender text;
BEGIN
  IF v_me IS NULL OR p_target IS NULL THEN
    RETURN false;
  END IF;
  IF v_me = p_target THEN
    RETURN true;
  END IF;

  -- Real admins only (column check, not recursive RPC)
  IF EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.user_id = v_me AND me.is_admin IS TRUE
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.likes a
    JOIN public.likes b
      ON a.from_user_id = b.to_user_id
     AND a.to_user_id = b.from_user_id
    WHERE a.from_user_id = v_me
      AND a.to_user_id = p_target
  ) THEN
    RETURN true;
  END IF;

  SELECT lower(btrim(me.gender)), lower(btrim(them.gender))
  INTO my_gender, their_gender
  FROM public.profiles me
  CROSS JOIN public.profiles them
  WHERE me.user_id = v_me
    AND them.user_id = p_target;

  IF my_gender IS NULL OR their_gender IS NULL THEN
    RETURN false;
  END IF;

  RETURN (
    (my_gender = 'homme' AND their_gender = 'femme')
    OR (my_gender = 'femme' AND their_gender = 'homme')
  );
END;
$$;

-- Align looking_for with opposite gender
UPDATE public.profiles
SET looking_for = public.opposite_gender(gender)
WHERE gender IN ('homme', 'femme')
  AND looking_for IS DISTINCT FROM public.opposite_gender(gender);

-- Harden is_user_admin to require explicit TRUE
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin IS TRUE FROM public.profiles WHERE user_id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.can_select_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_select_profile(uuid) TO authenticated;
