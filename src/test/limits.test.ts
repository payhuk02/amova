import { describe, it, expect } from "vitest";
import { getLimitErrorMessage } from "@/lib/limits";

describe("getLimitErrorMessage", () => {
  it("returns swipe limit message", () => {
    expect(getLimitErrorMessage({ message: "daily_swipe_limit_reached" })).toContain("swipes");
  });

  it("returns super like limit message", () => {
    expect(getLimitErrorMessage({ message: "daily_super_like_limit_reached" })).toContain("Super Likes");
  });

  it("returns boost limit message", () => {
    expect(getLimitErrorMessage({ message: "daily_boost_limit_reached" })).toContain("boosts");
  });

  it("returns incognito message", () => {
    expect(getLimitErrorMessage({ message: "incognito_requires_vip" })).toContain("VIP");
  });

  it("returns null for unknown errors", () => {
    expect(getLimitErrorMessage({ message: "other error" })).toBeNull();
    expect(getLimitErrorMessage(null)).toBeNull();
  });
});
