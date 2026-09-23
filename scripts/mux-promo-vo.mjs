/**
 * Mux Amova promo video + French VO into WebM and MP4.
 * Prereq: promo/out/amova-promo-30s.webm + run scripts/generate-vo.ps1
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "promo", "out");
const ff = ffmpegPath;

function run(args) {
  const r = spawnSync(ff, args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run([
  "-y",
  "-i",
  path.join(out, "amova-vo.wav"),
  "-filter:a",
  "atempo=1.08,volume=1.2",
  path.join(out, "amova-vo-30s.wav"),
]);

run([
  "-y",
  "-i",
  path.join(out, "amova-promo-30s.webm"),
  "-i",
  path.join(out, "amova-vo-30s.wav"),
  "-map",
  "0:v:0",
  "-map",
  "1:a:0",
  "-c:v",
  "copy",
  "-c:a",
  "libopus",
  "-b:a",
  "128k",
  "-shortest",
  path.join(out, "amova-promo-30s-vo.webm"),
]);

run([
  "-y",
  "-i",
  path.join(out, "amova-promo-30s.webm"),
  "-i",
  path.join(out, "amova-vo-30s.wav"),
  "-map",
  "0:v:0",
  "-map",
  "1:a:0",
  "-c:v",
  "libx264",
  "-preset",
  "fast",
  "-crf",
  "20",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-b:a",
  "160k",
  "-shortest",
  path.join(out, "amova-promo-30s-vo.mp4"),
]);

console.log("Done:", path.join(out, "amova-promo-30s-vo.mp4"));
