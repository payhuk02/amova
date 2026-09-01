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
  looking_for?: string | null;
} | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.display_name?.trim() &&
      profile.gender &&
      profile.age &&
      profile.looking_for,
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
        .select("display_name, gender, age, looking_for")
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
