import type { ProfileRow } from "@/types/profile";

interface DiscoverProfile {
  user_id: string;
  compatibility?: number;
}

/** Sort discover candidates: boosted first, then VIP, then compatibility. */
export function sortDiscoverProfiles<T extends DiscoverProfile>(
  profiles: T[],
  boostedIds: Set<string>,
  vipIds: Set<string>,
): T[] {
  return [...profiles].sort((a, b) => {
    const score = (p: T) => {
      let s = 0;
      if (boostedIds.has(p.user_id)) s += 1000;
      if (vipIds.has(p.user_id)) s += 100;
      if (p.compatibility != null) s += p.compatibility;
      return s;
    };
    return score(b) - score(a);
  });
}

export function filterDiscoverCandidates<T extends ProfileRow>(
  profiles: T[],
  likedIds: string[],
): T[] {
  return profiles.filter(
    (p) => !likedIds.includes(p.user_id) && !p.incognito_mode,
  );
}
