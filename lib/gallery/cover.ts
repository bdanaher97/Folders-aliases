// lib/gallery/cover.ts
//
// Central helpers for selecting covers and parsing path-like directives
// used by `.cover` files and alias helpers. Kept framework-agnostic.
//
// Exports:
//  - resolveCover(...) : parent-level cover selection (used by build.ts)
//  - normalizeParts / slugToWebPath / resolveLineToSlugParts
//  - readCoverOverrideWebPath / fallbackCoverFromImages / effectiveCoverWebPath
//
// Robustness:
//  - Strips UTF-8 BOMs and zero-width spaces in .cover lines
//  - Case-corrects each path segment under /public/Portfolio
//  - If a relative .cover points to an image that isn’t found directly,
//    we SEARCH the current gallery subtree for that filename (previous behavior)
//  - Skips Rule #1 if the target doesn't actually exist (no 404 covers)

import fs from "node:fs";
import path from "node:path";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

const PORT_ROOT_ABS = path.join(process.cwd(), "public", "Portfolio");

/** Normalize POSIX-like path parts (handles "." and ".."). */
export function normalizeParts(parts: string[]): string[] {
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out;
}

/** Convert slug parts like ["Foo","Bar"] → "/Portfolio/Foo/Bar" (POSIX). */
export function slugToWebPath(parts: string[]): string {
  return "/" + ["Portfolio", ...parts].join("/");
}

/** Strip BOM and zero-width no-break spaces that can sneak into text files. */
function stripWeirdPrefix(s: string): string {
  // \uFEFF = BOM, \u2060 = WORD JOINER, \u200B = ZERO WIDTH SPACE
  return s.replace(/^[\uFEFF\u2060\u200B]+/, "");
}

/**
 * Resolve a `.cover`/alias line to slug parts under /Portfolio.
 * Accepts:
 *  - "/Portfolio/Head/img.jpg"
 *  - "Portfolio/Head/img.jpg"
 *  - "img.jpg", "../X/img.jpg", "Sub/img.jpg" (relative to current gallery)
 */
export function resolveLineToSlugParts(
  rawLine: string,
  currentSlugParts: string[]
): string[] | null {
  let line = stripWeirdPrefix(rawLine).trim();
  if (!line || line.startsWith("#")) return null;

  // normalize backslashes and collapse leading slashes
  line = line.replace(/\\/g, "/");
  const cleaned = line.replace(/^\/+/, ""); // remove all leading "/"

  // Case 1: Explicit path under Portfolio (with or without leading slash)
  if (/^portfolio\//i.test(cleaned)) {
    const segs = cleaned.split("/");
    segs.shift(); // drop leading "Portfolio"
    return normalizeParts(segs);
  }

  // Case 2: Other absolute paths starting with "/" are NOT supported (outside Portfolio)
  if (rawLine.startsWith("/")) {
    return null;
  }

  // Case 3: Relative to the current gallery. Also handle accidental "portfolio/" on relative.
  const relSegs = cleaned.split("/");
  if (relSegs[0]?.toLowerCase() === "portfolio") relSegs.shift();
  return normalizeParts([...currentSlugParts, ...relSegs]);
}

/** Read first meaningful line from a file if it exists. (sync; used during build) */
function readFirstLineIfExists(absDir: string, filename: string): string | null {
  try {
    const raw = fs.readFileSync(path.join(absDir, filename), "utf8");
    // Strip BOM from whole file first
    const txt = stripWeirdPrefix(raw);
    const line = txt.split(/\r?\n/).find((l) => {
      const t = stripWeirdPrefix(l).trim();
      return t && !t.startsWith("#");
    });
    return line ? stripWeirdPrefix(line).trim() : null;
  } catch {
    return null;
  }
}

/**
 * Walk the real FS under public/Portfolio correcting the case of each segment.
 * Returns the corrected parts if the full path exists; otherwise null.
 *
 * Example input: ["Panerai RADIOMIR","Solo with rock-assets","Blue.png"]
 */
function correctCaseUnderPortfolio(parts: string[]): string[] | null {
  let dir = PORT_ROOT_ABS;
  const corrected: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }

    // try exact match first
    let match = entries.find((e) => e.name === seg);
    if (!match) {
      // case-insensitive match
      const lower = seg.toLowerCase();
      match = entries.find((e) => e.name.toLowerCase() === lower);
    }
    if (!match) return null;

    corrected.push(match.name);

    if (i < parts.length - 1) {
      if (!match.isDirectory()) return null; // mid-path must be a directory
      dir = path.join(dir, match.name);
    }
  }
  return corrected;
}

/**
 * BFS search for a file name anywhere under a given start folder within /public/Portfolio,
 * returning the corrected slug parts if found (e.g., ["Foo","Bar","Blue.png"]).
 * We skip dot-directories to avoid scanning control folders.
 */
function findFileUnderPortfolioBFS(
  startSlugParts: string[],
  targetFileName: string
): string[] | null {
  const startCorrected = correctCaseUnderPortfolio(startSlugParts);
  if (!startCorrected) return null;

  const startAbs = path.join(PORT_ROOT_ABS, ...startCorrected);
  const wantedLower = targetFileName.toLowerCase();

  type Q = { abs: string; parts: string[] };
  const q: Q[] = [{ abs: startAbs, parts: [...startCorrected] }];

  while (q.length) {
    const { abs, parts } = q.shift() as Q;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      continue;
    }

    // Prefer deterministic traversal: directories first (alpha), then files (alpha)
    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    // Files: look for an exact match first, then case-insensitive match
    for (const f of files) {
      if (f === targetFileName) return [...parts, f];
    }
    for (const f of files) {
      if (f.toLowerCase() === wantedLower) return [...parts, f];
    }

    // Queue subdirs
    for (const d of dirs) {
      q.push({ abs: path.join(abs, d), parts: [...parts, d] });
    }
  }

  return null;
}

/** If `.cover` exists in dirAbs, return a *correct-cased* web path or null. */
export function readCoverOverrideWebPath(
  dirAbs: string,
  slugParts: string[]
): string | null {
  const line = readFirstLineIfExists(dirAbs, ".cover");
  if (!line) return null;

  const parts = resolveLineToSlugParts(line, slugParts);
  if (!parts || parts.length === 0) return null;

  const last = parts[parts.length - 1] || "";
  const hasExt = IMAGE_EXT.has(path.extname(last).toLowerCase());
  if (!hasExt) return null; // only accept explicit image files

  // First try: treat the parts literally (relative or Portfolio/...)
  const corrected = correctCaseUnderPortfolio(parts);
  if (corrected) {
    return slugToWebPath(corrected);
  }

  // If not found and the line looked "relative", support the historical behavior:
  // bare filename (or unresolved relative path) → search subtree of the current gallery.
  const isLikelyRelative =
    !/^portfolio\//i.test(stripWeirdPrefix(line).replace(/\\/g, "/").replace(/^\/+/, "")) &&
    !stripWeirdPrefix(line).startsWith("/");

  if (isLikelyRelative) {
    const filename = last;
    const found = findFileUnderPortfolioBFS(slugParts, filename);
    if (found) return slugToWebPath(found);
  }

  return null;
}

/** Fallback cover: if no coverWebPath, but there are images, use the first image. */
export function fallbackCoverFromImages(
  webPath: string,
  images: string[] | undefined
): string | undefined {
  if (!images || images.length === 0) return undefined;
  return path.posix.join(webPath, images[0]);
}

/**
 * Finalizer used by the gallery builder and other call-sites:
 * - .cover override (absolute or relative; case-corrected; BOM-safe; subtree search)
 * - existingCoverWebPath (if your picker already chose one)
 * - first image in this folder
 */
export function effectiveCoverWebPath(args: {
  dirAbs: string;
  slugParts: string[];
  webPath: string;
  existingCoverWebPath?: string | undefined;
  images?: string[] | undefined;
}): string | undefined {
  const override =
    readCoverOverrideWebPath(args.dirAbs, args.slugParts) || undefined;
  return (
    override ||
    args.existingCoverWebPath ||
    fallbackCoverFromImages(args.webPath, args.images)
  );
}

/**
 * Parent-level cover precedence (used by builder):
 *   1) ".cover" → file under this parent or deeper (relative), OR "Portfolio/..."
 *      We case-correct the full path under /public/Portfolio and only use it
 *      if it exists. If a bare filename doesn’t resolve directly, we search
 *      the subtree for that filename (historical behavior).
 *   2) Exactly one image in the parent → use it
 *   3) First image from the first child that has images (ordered children),
 *      or that child's existing cover if it has none but a cover was set.
 */
export function resolveCover(
  absPath: string,
  relParts: string[],
  dotDirs: string[],
  imagesHere: string[],
  webPath: string,
  children: Array<{ webPath?: string; images?: string[]; coverWebPath?: string }>,
  childDirs: string[]
): string | undefined {
  // ---- Rule 1: .cover override in this parent ----
  const raw = readFirstLineIfExists(absPath, ".cover");
  if (raw) {
    const normalized = stripWeirdPrefix(raw).replace(/\\/g, "/").trim();
    const cleaned = normalized.replace(/^\/+/, "");

    let candidateParts: string[] | null = null;

    if (/^portfolio\//i.test(cleaned)) {
      const segs = cleaned.split("/");
      segs.shift(); // drop "Portfolio"
      candidateParts = normalizeParts(segs);
    } else if (!normalized.startsWith("/")) {
      const rel = cleaned.split("/");
      candidateParts = normalizeParts([...relParts, ...rel]);
    }

    if (candidateParts && candidateParts.length > 0) {
      const last = candidateParts[candidateParts.length - 1] || "";
      if (IMAGE_EXT.has(path.extname(last).toLowerCase())) {
        // Try direct resolution
        const corrected = correctCaseUnderPortfolio(candidateParts);
        if (corrected) {
          return slugToWebPath(corrected);
        }

        // Bare filename or unresolved relative → search subtree
        const isLikelyRelative =
          !/^portfolio\//i.test(cleaned) && !normalized.startsWith("/");
        if (isLikelyRelative) {
          const found = findFileUnderPortfolioBFS(relParts, last);
          if (found) {
            return slugToWebPath(found);
          }
        }
      } else {
        // directory given → try to choose its first image (case-corrected)
        const correctedDir = correctCaseUnderPortfolio(candidateParts);
        if (correctedDir) {
          const absDir = path.join(PORT_ROOT_ABS, ...correctedDir);
          try {
            const entries = fs.readdirSync(absDir, { withFileTypes: true });
            const firstImage = entries
              .filter((e) => e.isFile())
              .map((e) => e.name)
              .find((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()));
            if (firstImage) {
              return "/" + ["Portfolio", ...correctedDir, firstImage].join("/");
            }
          } catch {
            /* ignore */
          }
        }
      }
    }
    // If we get here, rule 1 didn’t yield a valid/real file. Fall through.
  }

  // ---- Rule 2: exactly one image in the parent ----
  if (imagesHere.length === 1) {
    return `${webPath}/${imagesHere[0]}`;
  }

  // ---- Rule 3: first child's first image (respecting order) ----
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    const imgs = Array.isArray(c?.images) ? c!.images! : [];
    if (imgs.length > 0 && c?.webPath) {
      return `${c.webPath}/${imgs[0]}`;
    }
    if (c?.coverWebPath) {
      return c.coverWebPath;
    }
  }

  return undefined;
}
