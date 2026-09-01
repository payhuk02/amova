-- P1 fixes: boosts visibility, message blocking, bidirectional block list, priority helpers

-- 1. Allow authenticated users to see who is currently boosted (for discover ordering)
CREATE POLICY "Users can view active boosts"
  ON public.boosts
  FOR SELECT TO authenticated
  USING (expires_at > now());

-- 2. RPC: active boosted user IDs
CREATE OR REPLACE FUNCTION public.get_active_boosted_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT user_id
  FROM public.boosts
  WHERE expires_at > now();
$$;

-- 3. RPC: VIP user IDs among candidates (priority matching)
CREATE OR REPLACE FUNCTION public.get_vip_user_ids(p_user_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.user_id
  FROM public.subscriptions s
  WHERE s.user_id = ANY(p_user_ids)
    AND s.plan = 'vip'
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now());
$$;

-- 4. RPC: all blocked relationships (both directions)
CREATE OR REPLACE FUNCTION public.get_blocked_relationship_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT blocked_id FROM public.blocked_users WHERE blocker_id = auth.uid()
  UNION
  SELECT blocker_id FROM public.blocked_users WHERE blocked_id = auth.uid();
$$;

-- 5. RPC: check if blocked with another user
CREATE OR REPLACE FUNCTION public.is_blocked_with(p_other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = p_other_user_id)
       OR (blocker_id = p_other_user_id AND blocked_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.get_active_boosted_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_boosted_user_ids() TO authenticated;

REVOKE ALL ON FUNCTION public.get_vip_user_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vip_user_ids(uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.get_blocked_relationship_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_blocked_relationship_ids() TO authenticated;

REVOKE ALL ON FUNCTION public.is_blocked_with(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked_with(uuid) TO authenticated;

-- 6. Prevent messaging between blocked users
CREATE OR REPLACE FUNCTION public.prevent_blocked_messages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = NEW.sender_id AND blocked_id = NEW.receiver_id)
       OR (blocker_id = NEW.receiver_id AND blocked_id = NEW.sender_id)
  ) THEN
    RAISE EXCEPTION 'blocked_user'
      USING ERRCODE = 'P0001', MESSAGE = 'blocked_user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_blocked_messages_trigger ON public.messages;
CREATE TRIGGER prevent_blocked_messages_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_blocked_messages();
