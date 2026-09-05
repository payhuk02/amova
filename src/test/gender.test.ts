import { describe, expect, it } from "vitest";
import { genderLabel, lookingForLabel, oppositeGender } from "@/lib/gender";

describe("oppositeGender", () => {
  it("maps homme ↔ femme", () => {
    expect(oppositeGender("homme")).toBe("femme");
    expect(oppositeGender("femme")).toBe("homme");
    expect(oppositeGender("Homme")).toBe("femme");
  });

  it("rejects same-gender / invalid", () => {
    expect(oppositeGender("les deux")).toBeNull();
    expect(oppositeGender("autre")).toBeNull();
    expect(oppositeGender(null)).toBeNull();
  });
});

describe("labels", () => {
  it("never shows Les deux", () => {
    expect(lookingForLabel("les deux")).toBe("—");
    expect(lookingForLabel("homme")).toBe("Hommes");
    expect(lookingForLabel("femme")).toBe("Femmes");
    expect(genderLabel("homme")).toBe("Homme");
    expect(genderLabel("autre")).toBe("—");
    expect(genderLabel(null)).toBe("—");
  });
});
