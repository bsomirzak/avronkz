/**
 * Подготовка печатей и подписей для модуля документов.
 *
 *   node scripts/docs-seal.mjs sign stamps/sign_kuandyk.HEIC kuandyk [--rotate 270] [--threshold 18]
 *   node scripts/docs-seal.mjs stamp stamps/stamp_kuandyk.png kuandyk
 *   ... --upload   — сразу положить в Redis (KV_* из .env.local, префикс DOCS_PREFIX или «docs:»)
 *
 * Результат пишется в stamps/<kind>_<key>.png (папка в .gitignore — репозиторий
 * публичный, печати в git не кладём).
 *
 * HEIC с iPhone сначала конвертируется штатной macOS-утилитой sips.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { cleanInk } from "../lib/docs/image.ts";

const [kind, file, key, ...rest] = process.argv.slice(2);
if (!["sign", "stamp"].includes(kind) || !file || !key) {
  console.error("usage: node scripts/docs-seal.mjs sign|stamp <file> <key> [--rotate 0|90|180|270] [--threshold N] [--upload]");
  process.exit(1);
}
const opt = (name, def) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : def;
};

let input = file;
if (/\.hei[cf]$/i.test(file)) {
  const dir = mkdtempSync(path.join(tmpdir(), "seal-"));
  input = path.join(dir, "in.png");
  execFileSync("sips", ["-s", "format", "png", file, "--out", input], { stdio: "ignore" });
}

const MAX = kind === "stamp" ? 900 : 1000;
let png;
if (kind === "sign" || rest.includes("--clean")) {
  // .rotate() без аргументов применяет EXIF-ориентацию.
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = cleanInk(
    { data, width: info.width, height: info.height },
    { threshold: Number(opt("threshold", 18)), rotate: Number(opt("rotate", 0)) },
  );
  png = await sharp(Buffer.from(out.data.buffer), { raw: { width: out.width, height: out.height, channels: 4 } })
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, colors: 64 })
    .toBuffer();
} else {
  png = await sharp(input).rotate(Number(opt("rotate", 0))).ensureAlpha()
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    // Палитра на 128 цветов: печать одноцветная, а PDF худеет в 4–5 раз.
    .png({ compressionLevel: 9, palette: true, colors: 128 })
    .toBuffer();
}

const target = path.join("stamps", `${kind}_${key}.png`);
const outPath = opt("out", target);
await sharp(png).toFile(outPath);
const meta = await sharp(png).metadata();
console.log(`${outPath}: ${meta.width}×${meta.height}, ${(png.length / 1024).toFixed(0)} КБ`);

if (rest.includes("--upload")) {
  const env = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
  const get = (k) => process.env[k] ?? env.match(new RegExp(`^${k}=["']?([^"'\\n]+)`, "m"))?.[1];
  const url = get("KV_REST_API_URL") ?? get("UPSTASH_REDIS_REST_URL");
  const token = get("KV_REST_API_TOKEN") ?? get("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) throw new Error("нет KV_REST_API_URL / KV_REST_API_TOKEN");
  const prefix = process.env.DOCS_PREFIX ?? "docs:";
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["SET", `${prefix}img:${key}:${kind}`, png.toString("base64")]),
  });
  console.log("Redis:", res.status, await res.text());
}
