-- P1: Plus plan + consumable entitlements (likes reveal 24h, boost pack)

-- Enum: plus (run before using the value in constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'subscription_plan' AND e.enumlabel = 'plus'
  ) THEN
    ALTER TYPE public.subscription_plan ADD VALUE 'plus';
  END IF;
END $$;
