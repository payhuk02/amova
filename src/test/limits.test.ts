import { describe, it, expect } from "vitest";
import { getLimitErrorMessage, isUpgradeLimitError, plansEnticement } from "@/lib/limits";

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

  it("returns message limit message", () => {
    expect(getLimitErrorMessage({ message: "daily_message_limit_reached" })).toContain("messages");
  });

  it("returns incognito message", () => {
    expect(getLimitErrorMessage({ message: "incognito_requires_vip" })).toContain("VIP");
  });

  it("returns null for unknown errors", () => {
    expect(getLimitErrorMessage({ message: "other error" })).toBeNull();
    expect(getLimitErrorMessage(null)).toBeNull();
  });
});

describe("isUpgradeLimitError", () => {
  it("detects plan upgrade limits", () => {
    expect(isUpgradeLimitError({ message: "daily_swipe_limit_reached" })).toBe(true);
    expect(isUpgradeLimitError({ message: "daily_message_limit_reached" })).toBe(true);
    expect(isUpgradeLimitError({ message: "incognito_requires_vip" })).toBe(true);
    expect(isUpgradeLimitError({ message: "other error" })).toBe(false);
  });
});

describe("plansEnticement", () => {
  it("mentions the feature when provided", () => {
    expect(plansEnticement("Filtres avancés")).toContain("Filtres avancés");
  });
});
