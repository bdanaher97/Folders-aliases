import fs from "node:fs";
import path from "node:path";

export function isDevRuntime() {
  // Explicit off switch
  if (process.env.NEXT_PUBLIC_DEV === "0") return false;
  // Explicit on OR fallback to NODE_ENV !== production
  return (
    process.env.NEXT_PUBLIC_DEV === "1" || process.env.NODE_ENV !== "production"
  );
}

/** Read the gallery limit from env or a .dev-limit file (root or public/Portfolio). */
export function getDevGalleryLimit(): number | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_GALLERY_LIMIT;
  if (fromEnv) {
    const n = Number(fromEnv);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const tryFiles = [
    path.resolve(process.cwd(), ".dev-limit"),
    path.resolve(process.cwd(), "public", "Portfolio", ".dev-limit"),
  ];
  for (const p of tryFiles) {
    try {
      if (fs.existsSync(p)) {
        const n = Number(fs.readFileSync(p, "utf8").trim());
        if (Number.isFinite(n) && n > 0) return n;
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

/** Limit items only in dev, otherwise return unchanged. */
export function maybeLimit<T>(items: T[]): T[] {
  if (!isDevRuntime()) return items;
  const limit = getDevGalleryLimit();
  return limit ? items.slice(0, limit) : items;
}
