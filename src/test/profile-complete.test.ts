import { describe, it, expect } from "vitest";
import { isProfileComplete } from "@/hooks/useProfileComplete";

describe("isProfileComplete", () => {
  it("returns false for null profile", () => {
    expect(isProfileComplete(null)).toBe(false);
  });

  it("returns false when required fields are missing", () => {
    expect(isProfileComplete({ display_name: "Alex", gender: null, age: 25, looking_for: "femme" })).toBe(false);
  });

  it("returns true when all required fields are set", () => {
    expect(
      isProfileComplete({
        display_name: "Alex",
        gender: "homme",
        age: 28,
        looking_for: "femme",
      }),
    ).toBe(true);
  });

  it("returns false for whitespace-only display name", () => {
    expect(
      isProfileComplete({
        display_name: "   ",
        gender: "homme",
        age: 28,
        looking_for: "femme",
      }),
    ).toBe(false);
  });
});
