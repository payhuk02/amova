-- Fix retired OpenRouter free models (404) — use gemini-2.5-flash-lite

UPDATE public.ai_settings
SET
  model_match = 'google/gemini-2.5-flash-lite',
  model_compatibility = 'google/gemini-2.5-flash-lite',
  model_icebreaker = 'google/gemini-2.5-flash-lite',
  model_coach = 'google/gemini-2.5-flash-lite',
  model_kyc = 'google/gemini-2.5-flash-lite',
  updated_at = now()
WHERE model_match = 'google/gemini-2.0-flash-exp:free'
   OR model_coach = 'google/gemini-2.0-flash-exp:free'
   OR model_kyc = 'google/gemini-2.0-flash-exp:free'
   OR model_icebreaker = 'google/gemini-2.0-flash-exp:free'
   OR model_compatibility = 'google/gemini-2.0-flash-exp:free';

ALTER TABLE public.ai_settings
  ALTER COLUMN model_match SET DEFAULT 'google/gemini-2.5-flash-lite',
  ALTER COLUMN model_compatibility SET DEFAULT 'google/gemini-2.5-flash-lite',
  ALTER COLUMN model_icebreaker SET DEFAULT 'google/gemini-2.5-flash-lite',
  ALTER COLUMN model_coach SET DEFAULT 'google/gemini-2.5-flash-lite',
  ALTER COLUMN model_kyc SET DEFAULT 'google/gemini-2.5-flash-lite';
