import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const authFile = path.join("e2e", ".auth", "user.json");

setup("authenticate staging user", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  if (!email || !password) {
    setup.skip(true, "PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set");
    return;
  }

  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("votre@email.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /Se connecter/i }).click();

  await expect(page).toHaveURL(/\/(dashboard|profile-setup)/, { timeout: 30_000 });

  if (page.url().includes("/profile-setup")) {
    setup.skip(true, "Test account profile incomplete — complete profile-setup first");
    return;
  }

  await expect(page.getByText(/Bonjour,/i)).toBeVisible({ timeout: 15_000 });
  await page.context().storageState({ path: authFile });
});
