import { describe, it, expect } from "vitest";
import {
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  SEO_CITIES,
  SEO_COUNTRIES,
  getSeoCity,
  getSeoPlace,
  cityPageTitle,
  pageTitle,
  absoluteUrl,
  FOOTER_COUNTRIES_PREVIEW,
} from "@/lib/seo";

describe("seo helpers", () => {
  it("keeps brand-forward default title", () => {
    expect(DEFAULT_TITLE).toMatch(/Amova/);
    expect(DEFAULT_TITLE.toLowerCase()).toMatch(/rencontres|afrique/);
    expect(DEFAULT_DESCRIPTION.toLowerCase()).toMatch(/mobile money|vérif|afrique/);
  });

  it("formats page titles with Amova suffix", () => {
    expect(pageTitle("FAQ")).toBe("FAQ | Amova");
    expect(pageTitle(DEFAULT_TITLE)).toBe(DEFAULT_TITLE);
  });

  it("lists all African countries", () => {
    expect(SEO_COUNTRIES.length).toBeGreaterThanOrEqual(50);
    expect(FOOTER_COUNTRIES_PREVIEW).toBeLessThan(SEO_COUNTRIES.length);
    const senegal = getSeoPlace("senegal");
    expect(senegal?.kind).toBe("country");
    expect(cityPageTitle(senegal!)).toMatch(/Sénégal/);
  });

  it("resolves city landings", () => {
    expect(SEO_CITIES.length).toBeGreaterThanOrEqual(6);
    const abidjan = getSeoCity("abidjan");
    expect(abidjan?.name).toBe("Abidjan");
    expect(cityPageTitle(abidjan!)).toMatch(/Abidjan/);
    expect(absoluteUrl(`/rencontres/${abidjan!.slug}`)).toBe(
      "https://www.amova.space/rencontres/abidjan",
    );
  });

  it("rejects unknown place slugs", () => {
    expect(getSeoPlace("paris")).toBeUndefined();
  });
});
