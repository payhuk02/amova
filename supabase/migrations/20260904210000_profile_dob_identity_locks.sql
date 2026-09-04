-- Premium onboarding: date_of_birth + lock gender / DOB after first set

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date;

COMMENT ON COLUMN public.profiles.date_of_birth IS 'Legal date of birth; immutable once set (except admin).';

CREATE OR REPLACE FUNCTION public.age_from_dob(p_dob date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_dob IS NULL THEN NULL
    ELSE date_part(
      'year',
      age(current_date, p_dob)
    )::integer
  END;
$$;

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
  BEGIN
    v_is_admin := COALESCE(public.is_user_admin(), false);
  EXCEPTION WHEN OTHERS THEN
    v_is_admin := false;
  END;

  -- Derive age from DOB when provided
  IF NEW.date_of_birth IS NOT NULL THEN
    v_age := public.age_from_dob(NEW.date_of_birth);
    IF v_age IS NULL OR v_age < 18 THEN
      RAISE EXCEPTION 'must_be_18_or_older'
        USING ERRCODE = 'P0001',
              MESSAGE = 'must_be_18_or_older';
    END IF;
    IF v_age > 120 THEN
      RAISE EXCEPTION 'invalid_date_of_birth'
        USING ERRCODE = 'P0001',
              MESSAGE = 'invalid_date_of_birth';
    END IF;
    NEW.age := v_age;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT v_is_admin THEN
    -- Gender locked once set
    IF OLD.gender IS NOT NULL
       AND btrim(OLD.gender) <> ''
       AND NEW.gender IS DISTINCT FROM OLD.gender THEN
      RAISE EXCEPTION 'gender_locked'
        USING ERRCODE = 'P0001',
              MESSAGE = 'gender_locked';
    END IF;

    -- Date of birth locked once set
    IF OLD.date_of_birth IS NOT NULL
       AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
      RAISE EXCEPTION 'date_of_birth_locked'
        USING ERRCODE = 'P0001',
              MESSAGE = 'date_of_birth_locked';
    END IF;

    -- Prevent clearing DOB
    IF OLD.date_of_birth IS NOT NULL AND NEW.date_of_birth IS NULL THEN
      RAISE EXCEPTION 'date_of_birth_locked'
        USING ERRCODE = 'P0001',
              MESSAGE = 'date_of_birth_locked';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_identity_locks ON public.profiles;
CREATE TRIGGER trg_enforce_profile_identity_locks
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_identity_locks();
