/**
 * Generates web icons, PWA assets, and Android native icons/splash from public/logo.png.
 * Run: npm run icons
 */
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoPath = join(root, "public", "logo.png");
const logoBytes = readFileSync(logoPath);
const logo = sharp(logoBytes);
const meta = await logo.metadata();
const { width = 1024, height = 1024 } = meta;

const markHeight = Math.round(height * 0.42);
const markSize = Math.min(width, markHeight);
const left = Math.round((width - markSize) / 2);

const markBuffer = await sharp(logoBytes)
  .extract({ left, top: 0, width: markSize, height: markSize })
  .png()
  .toBuffer();

function roundedMaskSvg(size) {
  const r = Math.round(size * 0.22);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/>
    </svg>`,
  );
}

async function writeSquareIcon(relPath, size, padding = 0) {
  const inner = size - padding * 2;
  const icon = await sharp(markBuffer)
    .resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  const square = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: "#FFFFFF",
    },
  })
    .composite([{ input: icon, gravity: "center" }])
    .png()
    .toBuffer();

  const out = join(root, relPath);
  mkdirSync(dirname(out), { recursive: true });
  await sharp(square)
    .composite([{ input: roundedMaskSvg(size), blend: "dest-in" }])
    .png()
    .toFile(out);
  console.log(`Wrote ${relPath} (${size}x${size})`);
}

const webOutputs = [
  ["public/icon.png", 512],
  ["public/favicon.png", 64],
  ["public/apple-touch-icon.png", 180],
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["resources/icon.png", 1024],
];

for (const [relPath, size] of webOutputs) {
  await writeSquareIcon(relPath, size);
}

const splashLogoBuf = await sharp(logoBytes)
  .resize({ height: Math.round(height * 0.55) })
  .png()
  .toBuffer();

async function writeSplash(relPath, w, h) {
  const logoH = Math.round(h * 0.45);
  const logoBuf = await sharp(logoBytes)
    .resize({ height: logoH })
    .png()
    .toBuffer();

  const out = join(root, relPath);
  mkdirSync(dirname(out), { recursive: true });
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: "#0F1114",
    },
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png()
    .toFile(out);
  console.log(`Wrote ${relPath} (${w}x${h})`);
}

await writeSplash("resources/splash.png", 2732, 2732);

const androidMipmaps = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

for (const [folder, size] of Object.entries(androidMipmaps)) {
  const base = `android/app/src/main/res/${folder}`;
  await writeSquareIcon(`${base}/ic_launcher.png`, size);
  await writeSquareIcon(`${base}/ic_launcher_round.png`, size);
  await writeSquareIcon(`${base}/ic_launcher_foreground.png`, size, Math.round(size * 0.12));
}

const androidSplashes = [
  ["android/app/src/main/res/drawable/splash.png", 480, 320],
  ["android/app/src/main/res/drawable-port-mdpi/splash.png", 320, 480],
  ["android/app/src/main/res/drawable-port-hdpi/splash.png", 480, 800],
  ["android/app/src/main/res/drawable-port-xhdpi/splash.png", 720, 1280],
  ["android/app/src/main/res/drawable-port-xxhdpi/splash.png", 960, 1600],
  ["android/app/src/main/res/drawable-port-xxxhdpi/splash.png", 1280, 1920],
  ["android/app/src/main/res/drawable-land-mdpi/splash.png", 480, 320],
  ["android/app/src/main/res/drawable-land-hdpi/splash.png", 800, 480],
  ["android/app/src/main/res/drawable-land-xhdpi/splash.png", 1280, 720],
  ["android/app/src/main/res/drawable-land-xxhdpi/splash.png", 1600, 960],
  ["android/app/src/main/res/drawable-land-xxxhdpi/splash.png", 1920, 1280],
];

for (const [relPath, w, h] of androidSplashes) {
  await writeSplash(relPath, w, h);
}

console.log("Done.");
