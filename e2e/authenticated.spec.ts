import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const authFile = path.join("e2e", ".auth", "user.json");
const hasAuthCreds = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);
const hasAuthState = fs.existsSync(authFile);

test.describe("Authenticated staging flows", () => {
  test.beforeEach(() => {
    test.skip(
      !hasAuthCreds || !hasAuthState,
      "Requires PLAYWRIGHT_TEST_EMAIL/PASSWORD and successful auth.setup",
    );
  });

  test("dashboard loads for authenticated user", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Bonjour,/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Mode swipe/i })).toBeVisible();
  });

  test("discover page is accessible", async ({ page }) => {
    await page.goto("/discover", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/discover/);
    await expect(page.getByRole("button", { name: /Filtres/i })).toBeVisible({ timeout: 15_000 });
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("heading", { name: /Paramètres/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Notifications/i)).toBeVisible();
  });
});
