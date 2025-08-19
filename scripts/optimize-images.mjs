#!/usr/bin/env node
// scripts/optimize-images.mjs

/**
 * optimize-images.mjs
 *
 * Pre-generates responsive cached images from /public/Portfolio into /public/_imgcache.
 *
 * ✔ Groups by "leaf" folders (deepest level with images)
 * ✔ Skips leaves that haven't changed using .imgcache-stamp.json
 * ✔ Generates WebP (and optionally AVIF) at fixed widths
 * ✔ Writes .blur.json with tiny placeholders
 *
 * Regeneration is only triggered if:
 *   - An image file (jpg/png/webp/tiff) is added, removed, or modified
 *   - The resizing settings (widths, quality) are changed
 *   - The internal SETTINGS_VERSION string is changed
 *
 * ⚠️ Changes to .images, .folders, or .order will NOT cause regeneration.
 *     You can safely reorder or edit metadata files without affecting the cache.
 *
 * To force regeneration of all leaves, bump:
 *     const SETTINGS_VERSION = "v1.0.0";
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import sharp from "sharp";

// CONFIG
const SRC_ROOT = path.resolve(process.cwd(), "public", "Portfolio");
const CACHE_ROOT = path.resolve(process.cwd(), "public", "_imgcache");
const INPUT_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);
const WIDTHS = [320, 640, 1024, 1600, 2048];
const OUT_WEBP = true;
const OUT_AVIF = true;
const WEBP_QUALITY = 82;
const AVIF_QUALITY = 55;
const BLUR_W = 24;
const CONCURRENCY = Math.max(1, os.cpus().length - 1);
const SETTINGS_VERSION = "v1.0.0";

// Helpers
const relFromSrc = (abs) => path.relative(SRC_ROOT, abs);
const ensureDir = (p) => fsp.mkdir(p, { recursive: true });
const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");

async function fileHash(p) {
  const s = await fsp.stat(p);
  return sha1(Buffer.from(JSON.stringify({ size: s.size, mtime: s.mtimeMs })));
}

async function computeLeafStamp(leafDir, files) {
  const parts = [SETTINGS_VERSION];
  for (const f of files.sort()) {
    parts.push(relFromSrc(f));
    parts.push(await fileHash(f));
  }
  return sha1(Buffer.from(parts.join("|")));
}

function cachePath(absSource, width, ext) {
  const rel = relFromSrc(absSource);
  const outDir = path.join(CACHE_ROOT, path.dirname(rel));
  const outName = `${path.basename(rel, path.extname(rel))}.w${width}.${ext}`;
  return path.join(outDir, outName);
}

function blurJsonPath(leafDir) {
  return path.join(CACHE_ROOT, relFromSrc(leafDir), ".blur.json");
}

function stampPath(leafDir) {
  return path.join(leafDir, ".imgcache-stamp.json");
}

async function readJsonSafe(p) {
  try {
    return JSON.parse(await fsp.readFile(p, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(p, obj) {
  await ensureDir(path.dirname(p));
  await fsp.writeFile(p, JSON.stringify(obj, null, 2));
}

async function generateOutputsForImage(absSource) {
  const buf = await fsp.readFile(absSource);
  const meta = await sharp(buf).metadata();
  const naturalW = meta.width || Math.max(...WIDTHS);
  const widths = WIDTHS.filter((w) => w <= naturalW);
  if (!widths.length) widths.push(Math.min(WIDTHS[0], naturalW));

  await ensureDir(path.dirname(cachePath(absSource, widths[0], "webp")));

  const tasks = [];

  if (OUT_WEBP) {
    for (const w of widths) {
      tasks.push(
        sharp(buf)
          .resize(w)
          .webp({ quality: WEBP_QUALITY })
          .toFile(cachePath(absSource, w, "webp"))
      );
    }
  }
  if (OUT_AVIF) {
    for (const w of widths) {
      tasks.push(
        sharp(buf)
          .resize(w)
          .avif({ quality: AVIF_QUALITY })
          .toFile(cachePath(absSource, w, "avif"))
      );
    }
  }

  const blur = await sharp(buf).resize(BLUR_W).webp({ quality: 40 }).toBuffer();
  const blurDataURL = `data:image/webp;base64,${blur.toString("base64")}`;

  await Promise.all(tasks);
  return { blurDataURL };
}

async function processLeaf(leafDir, imageFiles) {
  const imgs = imageFiles.filter((f) =>
    INPUT_EXT.has(path.extname(f).toLowerCase())
  );
  if (!imgs.length) return;

  const newStamp = await computeLeafStamp(leafDir, imgs);
  const existing = await readJsonSafe(stampPath(leafDir));
  if (existing?.stamp === newStamp) return;

  const blurData = {};
  for (const imgPath of imgs) {
    const { blurDataURL } = await generateOutputsForImage(imgPath);
    blurData[relFromSrc(imgPath)] = { blurDataURL };
  }

  await writeJson(blurJsonPath(leafDir), {
    generatedAt: new Date().toISOString(),
    blurData,
  });
  await writeJson(stampPath(leafDir), { stamp: newStamp });
}

async function walk(dir) {
  const out = [];
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function main() {
  if (!fs.existsSync(SRC_ROOT)) throw new Error(`No source dir: ${SRC_ROOT}`);
  await ensureDir(CACHE_ROOT);
  const allFiles = await walk(SRC_ROOT);

  const byLeaf = {};
  for (const f of allFiles) {
    const leaf = path.dirname(f);
    (byLeaf[leaf] ||= []).push(f);
  }

  const leaves = Object.entries(byLeaf).filter(([, files]) =>
    files.some((f) => INPUT_EXT.has(path.extname(f).toLowerCase()))
  );

  console.log(`Found ${leaves.length} leaves`);
  for (const [leaf, files] of leaves) {
    console.log(`→ ${relFromSrc(leaf)}`);
    await processLeaf(leaf, files);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
