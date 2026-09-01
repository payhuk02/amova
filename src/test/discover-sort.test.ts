import { describe, it, expect } from "vitest";
import { sortDiscoverProfiles, filterDiscoverCandidates } from "@/lib/discover-sort";

describe("sortDiscoverProfiles", () => {
  const profiles = [
    { user_id: "a", compatibility: 70 },
    { user_id: "b", compatibility: 90 },
    { user_id: "c", compatibility: 50 },
  ];

  it("prioritizes boosted users", () => {
    const sorted = sortDiscoverProfiles(profiles, new Set(["c"]), new Set());
    expect(sorted[0].user_id).toBe("c");
  });

  it("prioritizes VIP users over compatibility", () => {
    const sorted = sortDiscoverProfiles(profiles, new Set(), new Set(["a"]));
    expect(sorted[0].user_id).toBe("a");
  });

  it("puts boosted before VIP", () => {
    const sorted = sortDiscoverProfiles(profiles, new Set(["c"]), new Set(["b"]));
    expect(sorted[0].user_id).toBe("c");
    expect(sorted[1].user_id).toBe("b");
  });
});

describe("filterDiscoverCandidates", () => {
  it("excludes liked and incognito profiles", () => {
    const profiles = [
      { user_id: "a", incognito_mode: false },
      { user_id: "b", incognito_mode: true },
      { user_id: "c", incognito_mode: false },
    ] as Parameters<typeof filterDiscoverCandidates>[0];

    const result = filterDiscoverCandidates(profiles, ["c"]);
    expect(result.map((p) => p.user_id)).toEqual(["a"]);
  });
});
