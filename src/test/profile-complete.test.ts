import { describe, it, expect } from "vitest";
import { isProfileComplete } from "@/hooks/useProfileComplete";

const complete = {
  display_name: "Alex",
  gender: "homme",
  age: 28,
  date_of_birth: "1998-01-10",
  looking_for: "femme",
  city: "Abidjan",
  avatar_url: "https://example.com/a.jpg",
};

describe("isProfileComplete", () => {
  it("returns false for null profile", () => {
    expect(isProfileComplete(null)).toBe(false);
  });

  it("returns false when required fields are missing", () => {
    expect(isProfileComplete({ display_name: "Alex", gender: null, age: 25, looking_for: "femme" })).toBe(false);
    expect(isProfileComplete({ ...complete, date_of_birth: null })).toBe(false);
    expect(isProfileComplete({ ...complete, city: "  " })).toBe(false);
    expect(isProfileComplete({ ...complete, avatar_url: null })).toBe(false);
  });

  it("returns true when all required fields are set", () => {
    expect(isProfileComplete(complete)).toBe(true);
  });

  it("returns false for whitespace-only display name", () => {
    expect(isProfileComplete({ ...complete, display_name: "   " })).toBe(false);
  });
});
