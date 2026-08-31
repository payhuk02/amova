-- Reliable admin check via SECURITY DEFINER (avoids RLS edge cases)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
