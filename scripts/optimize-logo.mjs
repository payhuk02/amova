/**
 * Optimize Amova logo from source PNG → public assets (png + webp + mark + compact)
 * Usage: node scripts/optimize-logo.mjs [path-to-source.png]
 */
import { copyFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src =
  process.argv[2] ||
  join(
    process.env.USERPROFILE || "",
    ".cursor/projects/c-Amova/assets/c__Users_pc_AppData_Roaming_Cursor_User_workspaceStorage_d556cc6a8fb87da66fc368f89bf1c6da_images_image-3adc12a4-6274-4700-ad68-7f6d1225ae57.png",
  );

console.log("Source:", src);

const pre = await sharp(src)
  .trim({ threshold: 14 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { data, info } = pre;
for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (r > 245 && g > 245 && b > 245) {
    data[i + 3] = 0;
  } else if (r > 228 && g > 228 && b > 228) {
    const whiteness = Math.min(r, g, b);
    data[i + 3] = Math.max(0, Math.round((255 - whiteness) * 12));
  }
}

const transparentPng = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toBuffer();

const cleanedBuf = await sharp(transparentPng).trim({ threshold: 0 }).png().toBuffer();
const cleanedMeta = await sharp(cleanedBuf).metadata();
console.log(`Cleaned: ${cleanedMeta.width}×${cleanedMeta.height}`);

const TARGET_W = 900;

const logoBuf = await sharp(cleanedBuf)
  .resize({ width: TARGET_W, kernel: sharp.kernel.lanczos3 })
  .png({ compressionLevel: 9, quality: 80, effort: 10 })
  .toBuffer();
writeFileSync(join(root, "public/logo.png"), logoBuf);

const webpBuf = await sharp(logoBuf)
  .webp({ quality: 88, alphaQuality: 100 })
  .toBuffer();
writeFileSync(join(root, "public/logo.webp"), webpBuf);

const logoMeta = await sharp(logoBuf).metadata();
const w = logoMeta.width;
const h = logoMeta.height;

const markBuf = await sharp(logoBuf)
  .extract({ left: 0, top: 0, width: w, height: Math.round(h * 0.46) })
  .trim()
  .resize({
    width: 512,
    height: 512,
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({ compressionLevel: 9, quality: 80, effort: 10 })
  .toBuffer();
writeFileSync(join(root, "public/logo-mark.png"), markBuf);

const compactBuf = await sharp(logoBuf)
  .extract({ left: 0, top: 0, width: w, height: Math.round(h * 0.78) })
  .trim()
  .png({ compressionLevel: 9, quality: 80, effort: 10 })
  .toBuffer();
writeFileSync(join(root, "public/logo-compact.png"), compactBuf);

const compactWebp = await sharp(compactBuf)
  .webp({ quality: 88, alphaQuality: 100 })
  .toBuffer();
writeFileSync(join(root, "public/logo-compact.webp"), compactWebp);

for (const f of [
  "public/logo.png",
  "public/logo.webp",
  "public/logo-mark.png",
  "public/logo-compact.png",
  "public/logo-compact.webp",
]) {
  const meta = await sharp(join(root, f)).metadata();
  console.log(
    `${f}: ${meta.width}×${meta.height}, ${(statSync(join(root, f)).size / 1024).toFixed(1)} KB`,
  );
}

copyFileSync(join(root, "public/logo.png"), join(root, "promo/assets/logo.png"));
console.log("Synced promo/assets/logo.png");
