#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "public", "Portfolio");
const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".bmp",
  ".tiff",
]);

const flags = new Set(process.argv.slice(2));
const NO_OVERWRITE = flags.has("--no-overwrite");

function isImage(e) {
  return IMAGE_EXT.has(path.extname(e).toLowerCase());
}
function readDirSafe(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}
function writeFileIfChanged(p, contents) {
  const newText = contents.replace(/\r\n/g, "\n");
  const exists = fs.existsSync(p);
  if (exists) {
    const oldText = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
    if (oldText === newText) return false;
    if (NO_OVERWRITE) return false;
  }
  fs.writeFileSync(p, newText);
  return true;
}
function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function walk(dirAbs, relParts = []) {
  const entries = readDirSafe(dirAbs);
  const files = [];
  const subdirs = [];

  for (const d of entries) {
    if (d.name.startsWith(".")) continue; // ignore dot dirs/files
    const abs = path.join(dirAbs, d.name);
    if (d.isDirectory()) subdirs.push(d.name);
    else if (d.isFile()) files.push(d.name);
  }

  // Determine type
  const imageFiles = files.filter(isImage).sort(naturalCompare);
  const nonDotSubdirs = subdirs.sort(naturalCompare);

  // Case 1: image folder (at least one image AND no subfolders)
  if (imageFiles.length > 0 && nonDotSubdirs.length === 0) {
    const imagesPath = path.join(dirAbs, ".images");
    const content = imageFiles.join("\n") + "\n";
    const wrote = writeFileIfChanged(imagesPath, content);
    if (wrote) console.log("wrote .images →", path.join(...relParts));
  }

  // Case 2: container folder (one or more subfolders). Ignore a single image (cover)
  if (nonDotSubdirs.length > 0) {
    if (imageFiles.length > 1) {
      console.warn(
        "⚠ folder has subfolders AND multiple images (not just a cover):",
        path.join(...relParts)
      );
    }
    const foldersPath = path.join(dirAbs, ".folders");
    const content = nonDotSubdirs.join("\n") + "\n";
    const wrote = writeFileIfChanged(foldersPath, content);
    if (wrote) console.log("wrote .folders →", path.join(...relParts));

    // Recurse into subdirs
    for (const sub of nonDotSubdirs) {
      walk(path.join(dirAbs, sub), [...relParts, sub]);
    }
    return; // done with container folder
  }

  // Pure image folder: nothing else to recurse into.
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error("Missing root:", ROOT);
    process.exit(1);
  }
  walk(ROOT, ["Portfolio"]);
}

main();
