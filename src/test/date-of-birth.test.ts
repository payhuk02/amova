import { describe, it, expect } from "vitest";
import { ageFromDateOfBirth, parseDobParts, daysInMonth } from "@/lib/date-of-birth";

describe("date-of-birth", () => {
  it("computes days in month including leap years", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2024, 4)).toBe(30);
  });

  it("rejects under-18 DOB", () => {
    const y = new Date().getFullYear() - 17;
    const result = parseDobParts(String(y), "06", "15");
    expect("error" in result).toBe(true);
  });

  it("accepts adult DOB and returns age", () => {
    const y = new Date().getFullYear() - 25;
    const result = parseDobParts(String(y), "01", "10");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.age).toBeGreaterThanOrEqual(24);
      expect(result.iso).toBe(`${y}-01-10`);
    }
  });

  it("ageFromDateOfBirth handles birthday not yet reached", () => {
    const today = new Date(2026, 8, 4); // Sep 4 2026
    expect(ageFromDateOfBirth("2000-09-05", today)).toBe(25);
    expect(ageFromDateOfBirth("2000-09-04", today)).toBe(26);
  });
});
