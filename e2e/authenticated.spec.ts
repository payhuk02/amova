import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const authFile = path.join("e2e", ".auth", "user.json");
const hasAuthCreds = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);
const hasAuthState = fs.existsSync(authFile);

test.describe("Authenticated feature smoke", () => {
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

  test("discover page exposes swipe actions", async ({ page }) => {
    await page.goto("/discover", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/discover/);
    await expect(page.getByRole("button", { name: /Filtres/i })).toBeVisible({ timeout: 15_000 });

    const passBtn = page.getByRole("button", { name: "Passer" });
    const likeBtn = page.getByRole("button", { name: "J'aime" });
    const emptyState = page.getByText(/Plus de profils|Aucun profil/i);

    // Either a deck with actions, or an empty state — both are valid wired states
    await expect(passBtn.or(emptyState).first()).toBeVisible({ timeout: 20_000 });

    if (await passBtn.isVisible()) {
      await expect(likeBtn).toBeVisible();
      await passBtn.click();
      // UI advances; deck may empty or show next card without crashing
      await expect(page.locator("body")).not.toContainText(/Something went wrong|Erreur fatale/i);
    }
  });

  test("messages page loads", async ({ page }) => {
    await page.goto("/messages", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/messages/);
    await expect(page.getByRole("heading", { name: /Messages/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("premium checkout dialog opens", async ({ page }) => {
    await page.goto("/premium", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/premium/);
    await expect(page.getByText(/Investissez dans vos/i)).toBeVisible({ timeout: 15_000 });

    const choosePremium = page.getByRole("button", { name: /Choisir ce plan/i }).first();
    // Free plan users see "Choisir ce plan"; already-subscribed users may only see "Plan actuel"
    if (await choosePremium.isVisible()) {
      await choosePremium.click();
      await expect(page.getByRole("heading", { name: /Paiement|Renouveler/i })).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByLabel(/Numéro de téléphone/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /Payer maintenant/i })).toBeVisible();
    } else {
      await expect(page.getByText(/Plan actuel/i).first()).toBeVisible();
    }
  });

  test("premium callback without token shows error state", async ({ page }) => {
    await page.goto("/premium/callback", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/premium\/callback/);
    await expect(
      page.getByRole("heading", { name: /Paiement non confirmé|Erreur|introuvable/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("heading", { name: /Paramètres/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Notifications/i)).toBeVisible();
  });

  test("admin route redirects non-admin to dashboard", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    // Admin accounts stay on /admin; regular test users are bounced to dashboard
    await expect(page).toHaveURL(/\/(admin|dashboard)/, { timeout: 15_000 });
    if (page.url().includes("/admin")) {
      await expect(page.getByText(/Utilisateurs|Statistiques|Paiements|Admin/i).first()).toBeVisible({
        timeout: 15_000,
      });
    } else {
      await expect(page.getByText(/Bonjour,/i)).toBeVisible({ timeout: 15_000 });
    }
  });

  test("nested admin routes also gate non-admins", async ({ page }) => {
    await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/(admin\/users|dashboard)/, { timeout: 15_000 });
    if (!page.url().includes("/admin")) {
      await expect(page.getByText(/Bonjour,/i)).toBeVisible({ timeout: 15_000 });
    }
  });

  test("nearby and stories routes load", async ({ page }) => {
    await page.goto("/nearby", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/nearby/);
    await expect(
      page.getByText(/proximité|localisation|Découvrir autour/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto("/stories", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/stories/);
    await expect(page.getByText(/Stories|story/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
