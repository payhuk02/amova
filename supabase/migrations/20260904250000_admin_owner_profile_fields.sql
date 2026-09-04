-- Admin owner + data fix + extended profile fields
-- Service-role (auth.uid() IS NULL) may correct identity fields

CREATE OR REPLACE FUNCTION public.enforce_profile_identity_locks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
  v_age integer;
BEGIN
  -- Management API / service role has no JWT
  IF auth.uid() IS NULL THEN
    v_is_admin := true;
  ELSE
    BEGIN
      v_is_admin := COALESCE(public.is_user_admin(), false);
    EXCEPTION WHEN OTHERS THEN
      v_is_admin := false;
    END;
  END IF;

  IF NEW.date_of_birth IS NOT NULL THEN
    v_age := public.age_from_dob(NEW.date_of_birth);
    IF v_age IS NULL OR v_age < 18 THEN
      RAISE EXCEPTION 'must_be_18_or_older'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_age > 120 THEN
      RAISE EXCEPTION 'invalid_date_of_birth'
        USING ERRCODE = 'P0001';
    END IF;
    NEW.age := v_age;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT v_is_admin THEN
    IF OLD.gender IS NOT NULL
       AND btrim(OLD.gender) <> ''
       AND NEW.gender IS DISTINCT FROM OLD.gender THEN
      RAISE EXCEPTION 'gender_locked'
        USING ERRCODE = 'P0001';
    END IF;

    IF OLD.date_of_birth IS NOT NULL
       AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
      RAISE EXCEPTION 'date_of_birth_locked'
        USING ERRCODE = 'P0001';
    END IF;

    IF OLD.date_of_birth IS NOT NULL AND NEW.date_of_birth IS NULL THEN
      RAISE EXCEPTION 'date_of_birth_locked'
        USING ERRCODE = 'P0001';
    END IF;

    IF OLD.date_of_birth IS NOT NULL
       AND NEW.age IS DISTINCT FROM public.age_from_dob(OLD.date_of_birth) THEN
      NEW.age := public.age_from_dob(OLD.date_of_birth);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 1) Only agenceedigit@gmail.com is admin
UPDATE public.profiles SET is_admin = false WHERE is_admin = true;
UPDATE public.profiles p
SET is_admin = true
FROM auth.users u
WHERE p.user_id = u.id
  AND lower(u.email) = lower('agenceedigit@gmail.com');

-- 2) Fix JOHN mislabeled as femme (bio = JEUNE HOMME)
UPDATE public.profiles
SET gender = 'homme', looking_for = 'femme'
WHERE lower(btrim(display_name)) = 'john'
  AND gender = 'femme';

UPDATE public.profiles
SET looking_for = public.opposite_gender(gender)
WHERE gender IN ('homme', 'femme')
  AND looking_for IS DISTINCT FROM public.opposite_gender(gender);

-- 3) Extended profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS religion text,
  ADD COLUMN IF NOT EXISTS relationship_type text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS occupation_sector text,
  ADD COLUMN IF NOT EXISTS partner_preferences text[] DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_relationship_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_relationship_type_check
      CHECK (
        relationship_type IS NULL
        OR relationship_type IN ('monogamie', 'polygamie', 'a_decider')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_occupation_sector_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_occupation_sector_check
      CHECK (
        occupation_sector IS NULL
        OR occupation_sector IN ('fonctionnaire', 'prive', 'independant', 'etudiant', 'autre')
      );
  END IF;
END $$;
