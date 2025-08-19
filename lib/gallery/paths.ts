import fs from "node:fs";
import path from "node:path";
import { GalleryNode } from "./types";

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

export function isImageFile(file: string): boolean {
  return IMAGE_EXT.has(path.extname(file).toLowerCase());
}

export function slugify(name: string): string {
  return encodeURIComponent(name);
}

export function readDirSafe(p: string): string[] {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

export function firstImageInDir(
  absDir: string,
  relParts: string[]
): string | undefined {
  const webPath = "/" + ["Portfolio", ...relParts].join("/");
  const entries = readDirSafe(absDir);
  for (const e of entries) {
    const p = path.join(absDir, e);
    try {
      if (fs.statSync(p).isFile() && isImageFile(e)) {
        return `${webPath}/${e}`;
      }
    } catch {}
  }
  return undefined;
}
