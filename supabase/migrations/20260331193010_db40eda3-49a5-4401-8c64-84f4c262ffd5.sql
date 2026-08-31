
-- Add geolocation columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision;

-- Create a function to calculate distance between two points (Haversine formula in km)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 6371 * acos(
    LEAST(1.0, 
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    )
  )
$$;

-- Create smart matching function that scores candidates
CREATE OR REPLACE FUNCTION public.get_smart_matches(
  p_user_id uuid,
  p_max_distance double precision DEFAULT 100,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  gender text,
  bio text,
  age integer,
  city text,
  avatar_url text,
  last_seen timestamptz,
  interests text[],
  is_verified boolean,
  looking_for text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  compatibility_score integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_lat double precision;
  my_lon double precision;
  my_interests text[];
  my_looking_for text;
  my_gender text;
BEGIN
  -- Get current user's profile
  SELECT p.latitude, p.longitude, p.interests, p.looking_for, p.gender
  INTO my_lat, my_lon, my_interests, my_looking_for, my_gender
  FROM profiles p WHERE p.user_id = p_user_id;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.gender,
    p.bio,
    p.age,
    p.city,
    p.avatar_url,
    p.last_seen,
    p.interests,
    p.is_verified,
    p.looking_for,
    p.latitude,
    p.longitude,
    -- Distance
    CASE WHEN my_lat IS NOT NULL AND my_lon IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      THEN public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude)
      ELSE NULL
    END AS distance_km,
    -- Compatibility score (0-100)
    (
      -- Shared interests (up to 40 points)
      LEAST(40, COALESCE(
        (SELECT COUNT(*)::int FROM unnest(my_interests) mi WHERE mi = ANY(p.interests)) * 10,
        0
      ))
      +
      -- Gender preference match (20 points)
      CASE
        WHEN my_looking_for IS NULL OR my_looking_for = 'les deux' THEN 10
        WHEN my_looking_for = p.gender THEN 20
        ELSE 0
      END
      +
      -- Reverse preference match (20 points)
      CASE
        WHEN p.looking_for IS NULL OR p.looking_for = 'les deux' THEN 10
        WHEN p.looking_for = my_gender THEN 20
        ELSE 0
      END
      +
      -- Proximity bonus (up to 20 points)
      CASE
        WHEN my_lat IS NULL OR p.latitude IS NULL THEN 5
        WHEN public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude) < 10 THEN 20
        WHEN public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude) < 25 THEN 15
        WHEN public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude) < 50 THEN 10
        WHEN public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude) < 100 THEN 5
        ELSE 0
      END
    )::integer AS compatibility_score
  FROM profiles p
  WHERE p.user_id != p_user_id
    AND p.display_name IS NOT NULL
    AND p.incognito_mode = false
    -- Exclude already liked
    AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.from_user_id = p_user_id AND l.to_user_id = p.user_id)
    -- Exclude blocked
    AND NOT EXISTS (SELECT 1 FROM blocked_users b WHERE b.blocker_id = p_user_id AND b.blocked_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM blocked_users b WHERE b.blocker_id = p.user_id AND b.blocked_id = p_user_id)
    -- Distance filter (only if both have location)
    AND (
      my_lat IS NULL OR p.latitude IS NULL OR
      public.calculate_distance(my_lat, my_lon, p.latitude, p.longitude) <= p_max_distance
    )
  ORDER BY compatibility_score DESC, p.last_seen DESC NULLS LAST
  LIMIT p_limit;
END;
$$;
