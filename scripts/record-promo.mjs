/**
 * Records promo/amova-30s.html to a WebM video via Playwright.
 * Output: promo/out/amova-promo-30s.webm
 */
import { chromium } from "playwright";
import { mkdir, readdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "promo", "amova-30s.html");
const outDir = path.join(root, "promo", "out");
const finalName = "amova-promo-30s.webm";

await mkdir(outDir, { recursive: true });

// Clear previous recordings
for (const f of await readdir(outDir)) {
  if (f.endsWith(".webm") || f.endsWith(".mp4")) {
    await unlink(path.join(outDir, f)).catch(() => {});
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: outDir,
    size: { width: 1920, height: 1080 },
  },
});

const page = await context.newPage();
const url = pathToFileURL(htmlPath).href;
console.log("Opening", url);
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForFunction(() => window.__AMOVA_PROMO_DONE__ === true, null, {
  timeout: 45000,
});
await page.waitForTimeout(500);

await context.close();
await browser.close();

const files = (await readdir(outDir)).filter((f) => f.endsWith(".webm"));
if (!files.length) {
  console.error("No WebM produced");
  process.exit(1);
}

const src = path.join(outDir, files[0]);
const dest = path.join(outDir, finalName);
if (src !== dest) await rename(src, dest);

console.log("Saved:", dest);
