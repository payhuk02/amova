import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProfileCompleteness {
  complete: boolean;
  displayName: string | null;
}

export function isProfileComplete(profile: {
  display_name?: string | null;
  gender?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  looking_for?: string | null;
  city?: string | null;
  avatar_url?: string | null;
} | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.display_name?.trim() &&
      profile.gender &&
      profile.date_of_birth &&
      profile.age &&
      profile.age >= 18 &&
      profile.looking_for &&
      profile.city?.trim() &&
      profile.avatar_url,
  );
}

export function useProfileComplete() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile-complete", user?.id],
    queryFn: async (): Promise<ProfileCompleteness> => {
      if (!user) return { complete: false, displayName: null };

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, gender, age, date_of_birth, looking_for, city, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      return {
        complete: isProfileComplete(data),
        displayName: data?.display_name ?? null,
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
