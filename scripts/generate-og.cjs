const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

(async () => {
  const logoPath = path.join("public", "logo.png");
  const outPath = path.join("public", "og-image.jpg");

  const logoMeta = await sharp(logoPath)
    .resize({ width: 320, height: 320, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });

  const logoW = logoMeta.info.width;
  const left = Math.round((1200 - logoW) / 2);
  const top = Math.round((630 - logoMeta.info.height) / 2) - 40;

  const svg = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a0f22"/>
      <stop offset="50%" stop-color="#100A14"/>
      <stop offset="100%" stop-color="#2a1230"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="600" y="500" text-anchor="middle" font-family="Georgia, serif" font-size="48" fill="#F5E6F0" letter-spacing="6">AMOVA</text>
  <text x="600" y="548" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#C9A8B8">Rencontres sinceres en Afrique</text>
</svg>`);

  await sharp(svg)
    .composite([{ input: logoMeta.data, top, left }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  console.log("OG ok", meta.width, "x", meta.height, "bytes", fs.statSync(outPath).size);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
