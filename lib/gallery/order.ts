import fs from "node:fs";
import path from "node:path";

export function readListFile(absDir: string, file: string): string[] {
  const p = path.join(absDir, file);
  if (!fs.existsSync(p)) return [];
  try {
    return fs
      .readFileSync(p, "utf8")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** .order: like readListFile, but supports comments (# and //) and strips BOM */
export function readOrder(absDir: string): string[] {
  const p = path.join(absDir, ".order");
  if (!fs.existsSync(p)) return [];
  try {
    const text = fs.readFileSync(p, "utf8").replace(/\uFEFF/g, "");
    return text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith("//"));
  } catch {
    return [];
  }
}

/** Convenience files remain unchanged (no comment support by design) */
export function readFolders(absDir: string): string[] {
  return readListFile(absDir, ".folders");
}

export function readImages(absDir: string): string[] {
  return readListFile(absDir, ".images");
}

export function applyOrder(items: string[], orderNames: string[]): string[] {
  if (!orderNames.length) return items;
  const set = new Set(items);
  const inOrder = orderNames.filter((n) => set.has(n));
  const leftovers = items.filter((n) => !orderNames.includes(n));
  return [...inOrder, ...leftovers];
}
