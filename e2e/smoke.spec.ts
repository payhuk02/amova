import { test, expect } from "@playwright/test";

test.describe("Amova smoke tests", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Amova", level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("navigation").first()).toBeVisible();
  });

  test("auth page loads", async ({ page }) => {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Connexion|Créer un compte/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByPlaceholder("votre@email.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /Se connecter|Créer mon compte/i })).toBeVisible();
  });

  test("protected route redirects to auth", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  });

  test("legal pages are accessible", async ({ page }) => {
    await page.goto("/confidentialite", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/confidentialit|données/i, { timeout: 15_000 });

    await page.goto("/conditions", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/condition/i, { timeout: 15_000 });

    await page.goto("/faq", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/FAQ|question/i, { timeout: 15_000 });
  });

  test("SEO marketing pages load", async ({ page }) => {
    await page.goto("/tarifs", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Tarifs/i, {
      timeout: 15_000,
    });

    await page.goto("/verification-identite", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Vérification/i, {
      timeout: 15_000,
    });

    await page.goto("/rencontres/abidjan", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Abidjan/i, {
      timeout: 15_000,
    });
  });
});
