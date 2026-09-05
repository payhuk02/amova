-- Defense in depth: looking_for must equal opposite gender; likes INSERT policy

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_looking_for_hetero_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_looking_for_hetero_check
  CHECK (
    looking_for IS NULL
    OR (
      gender IN ('homme', 'femme')
      AND looking_for = public.opposite_gender(gender)
    )
  );

-- Harden likes INSERT policy (trigger remains primary guard)
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.likes;
CREATE POLICY "Users can insert their own likes"
ON public.likes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = from_user_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles me
    JOIN public.profiles them ON them.user_id = to_user_id
    WHERE me.user_id = auth.uid()
      AND me.gender IN ('homme', 'femme')
      AND them.gender = public.opposite_gender(me.gender)
  )
);
