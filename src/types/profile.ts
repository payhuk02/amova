import type { Tables } from "@/integrations/supabase/types";

export type ProfileRow = Tables<"profiles">;
export type ProfileSummary = Pick<
  ProfileRow,
  | "user_id"
  | "display_name"
  | "age"
  | "city"
  | "bio"
  | "gender"
  | "looking_for"
  | "interests"
  | "is_verified"
  | "incognito_mode"
  | "latitude"
  | "longitude"
  | "verification_status"
  | "last_seen"
  | "avatar_url"
>;
