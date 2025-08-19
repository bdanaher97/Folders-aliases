/**
 * Gallery tree builder
 * --------------------
 * Scans /public/Portfolio and produces a recursive `GalleryNode` tree with:
 *   - deterministic folder & image ordering (.order > .folders/.images > fs order)
 *   - a `coverWebPath` for every node (parents & leaves)
 *   - leaf images as FILENAMES ONLY (ImageGrid prefixes with its webBasePath)
 *
 * Parent cover precedence (implemented in resolveCover):
 *   1) ".cover" (flat file) → parent/<file>  OR  parent/<child>/<file>
 *   2) Exactly one image in the parent → use it
 *   3) First image from the first child that has images (ordered children)
 *
 * Leaf behavior (this file):
 *   - If leaf has ≥ 2 images → show grid; if no cover yet, use first image as cover.
 *   - If leaf has exactly 1 image:
 *       • DO show that single image in the grid (no “cover‑only” hiding).
 *
 * Invariants:
 *   - node.webPath        = FULL web path to the folder, e.g. "/Portfolio/Foo/Bar"
 *   - node.coverWebPath   = FULL web path to the chosen cover image (or undefined)
 *   - node.images         = FILENAMES ONLY for leaves (or undefined when not a leaf)
 *   - node.children       = child nodes (undefined for leaves)
 */

import fs from "node:fs";
import path from "node:path";

import { readOrder, readFolders, readImages, applyOrder } from "./order";
import { isImageFile, slugify, readDirSafe } from "./paths";
import { resolveCover } from "./cover";
import { GalleryNode } from "./types";

import { maybeLimit } from "../dev-limit";

/** Filesystem root of the portfolio. */
const ROOT = path.join(process.cwd(), "public", "Portfolio");

/** Optional manifest path (used when GALLERY_USE_MANIFEST=true). */
const MANIFEST_PATH = path.join(
  process.cwd(),
  "public",
  "portfolio-manifest.json"
);

/** Helper: extract just the filename from a full web path like "/Portfolio/Foo/img.jpg". */
function filenameFromWebPath(p?: string): string | undefined {
  if (!p || typeof p !== "string") return undefined;
  const idx = p.lastIndexOf("/");
  return idx >= 0 ? p.slice(idx + 1) : p;
}

/**
 * Recursively build a GalleryNode for `absPath`.
 *
 * @param absPath               Absolute on-disk path to the folder
 * @param relParts              Path segments relative to "/public/Portfolio"
 * @param siblingsCountAtParent Number of child dirs the PARENT has (kept for future rules).
 *                              Pass 0 at the root; children receive the parent’s child-count.
 */
function buildNode(
  absPath: string,
  relParts: string[],
  siblingsCountAtParent: number = 0
): GalleryNode {
  // ---- Identity ----
  const dirName = path.basename(absPath); // on-disk folder name
  const slug = slugify(dirName); // URL-safe slug
  const webPath = "/" + ["Portfolio", ...relParts].join("/"); // full web path for this folder

  // ---- Read entries ----
  const entries = readDirSafe(absPath);

  const fileNames: string[] = [];
  const dirNames: string[] = [];
  for (const e of entries) {
    const p = path.join(absPath, e);
    try {
      const st = fs.statSync(p);
      if (st.isFile()) fileNames.push(e);
      else if (st.isDirectory()) dirNames.push(e);
    } catch {
      // ignore unreadable entries (keeps the builder resilient)
    }
  }

  // Separate metadata folders (dot dirs) from normal subfolders
  const dotDirs = dirNames.filter((d) => d.startsWith("."));
  let normalDirs = dirNames.filter((d) => !d.startsWith("."));
  let imagesHere = fileNames.filter(isImageFile); // images directly inside this folder

  // ---- Order CHILD FOLDERS deterministically ----
  // Priority: .order (authoritative) > .folders (fallback) > native order
  {
    const order = readOrder(absPath);
    const desired = order.length ? order : readFolders(absPath);
    normalDirs = applyOrder(normalDirs, desired);
  }

  // ---- Order IMAGES deterministically ----
  // Priority: .order (authoritative) > .images (fallback) > native order
  {
    const order = readOrder(absPath);
    const desired = order.length ? order : readImages(absPath);
    imagesHere = applyOrder(imagesHere, desired);
  }

  // ---- Recurse into children (in display order) ----
  // Children need to know how many siblings THEY have, so pass the count.
  const parentChildCount = normalDirs.length; // count includes the child itself
  const children: GalleryNode[] = normalDirs.map((d) =>
    buildNode(path.join(absPath, d), [...relParts, d], parentChildCount)
  );

  // ---- Prepare "childDirs" for cover rules ----
  // We want the on-disk directory names for each child, in THE SAME ORDER as `children`,
  // so resolveCover can:
  //   - search for a `.cover` filename inside each child (rule 1b)
  //   - pick first child with images (rule 3)
  const childDirs: string[] = children
    .map((c) => {
      if (c.fsPath) return path.basename(c.fsPath); // safest: actual folder name
      if (c.slug) return c.slug; // often mirrors dir name
      if (c.webPath) {
        const segs = c.webPath.split("/").filter(Boolean);
        return segs[segs.length - 1];
      }
      return "";
    })
    .filter(Boolean);

  // ---- Parent-level cover (rules 1→2→3) ----
  const coverFromParentRules = resolveCover(
    absPath,
    relParts,
    dotDirs,
    imagesHere,
    webPath,
    children,
    childDirs
  );

  // ---- Leaf logic: images array + cover fallback ----
  const isLeaf = children.length === 0;

  // IMPORTANT: ImageGrid expects FILENAMES ONLY; we keep filenames here.
  let images: string[] | undefined =
    imagesHere.length > 0 ? imagesHere : undefined;

  // Start with any parent-level cover decision
  let coverWebPath: string | undefined = coverFromParentRules;

  if (isLeaf) {
    if (imagesHere.length >= 2) {
      // Multi-image leaf → show grid; if no cover yet, select first image as cover
      if (!coverWebPath) coverWebPath = `${webPath}/${imagesHere[0]}`;
    } else if (imagesHere.length === 1) {
      // Single-image leaf → DO show the single image in the grid.
      // (Changed behavior: we do NOT hide single-image leaves as "cover-only".)
      const only = imagesHere[0];
      if (!coverWebPath) coverWebPath = `${webPath}/${only}`;
      images = [only]; // keep length-1 images array so imagesRaw === 1
    } else {
      // No images at this leaf → leave cover as-is (may be undefined)
    }
  } else {
    // Parent node (has children): never show images from this folder level in a grid.
    images = undefined;
  }

  // ---- Assemble node ----
  return {
    name: dirName,
    slug,
    fsPath: absPath,
    webPath,
    coverWebPath, // FULL web path
    images, // FILENAMES ONLY for leaves; undefined otherwise
    // Limit children at root only in dev (keeps local pages lighter)
    children: children.length
      ? relParts.length === 0
        ? maybeLimit(children)
        : children
      : undefined,
  };
}

/**
 * Normalize a manifest-loaded JSON node to our runtime invariants.
 * Ensures shape/semantics match live scan results.
 */
function normalizeManifest(node: any): GalleryNode {
  const name = node.name ?? node.dirName ?? "";
  const slug = node.slug ?? slugify(name);
  const fsPath = node.fsPath ?? "";
  const webPath = node.webPath ?? "";
  const coverWebPath = node.coverWebPath;

  // CHILDREN FIRST so we can tell if this is a leaf.
  const children =
    Array.isArray(node.children) && node.children.length
      ? node.children.map((c: any) => normalizeManifest(c))
      : undefined;

  // Keep images as FILENAMES ONLY (match live-scan invariant)
  const imagesArray = Array.isArray(node.images) ? node.images : [];
  let images: string[] | undefined =
    imagesArray.length > 0 ? imagesArray : undefined;

  // If this is a LEAF and images are missing/empty but we have a coverWebPath,
  // rehydrate a single image from the cover filename so `imagesRaw` becomes 1.
  if ((!children || children.length === 0) && (!images || images.length === 0)) {
    const fn = filenameFromWebPath(coverWebPath);
    if (fn) {
      images = [fn];
    }
  }

  return { name, slug, fsPath, webPath, coverWebPath, images, children };
}

/**
 * Public entrypoint: load from manifest (if enabled) or scan filesystem.
 */
export async function getGalleryIndex(): Promise<GalleryNode> {
  const useManifest = process.env.GALLERY_USE_MANIFEST === "true";

  if (useManifest && fs.existsSync(MANIFEST_PATH)) {
    const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const root = normalizeManifest(parsed);

    // Some manifests include a top-level container; prefer "Portfolio" if present
    const portfolio =
      root.children?.find(
        (n) =>
          decodeURIComponent(n.slug) === "Portfolio" || n.name === "Portfolio"
      ) ?? root;

    return portfolio;
  }

  if (!fs.existsSync(ROOT)) {
    // Empty shell when root missing (keeps UI stable)
    return {
      name: "Portfolio",
      slug: "Portfolio",
      fsPath: ROOT,
      webPath: "/Portfolio",
      children: [],
    };
  }

  return buildNode(ROOT, []);
}

/**
 * Resolve a node by slug parts (["Watches","Subfolder"]).
 * Returns null if any segment doesn't exist.
 */
export async function getNodeBySlug(
  slugParts: string[]
): Promise<GalleryNode | null> {
  const index = await getGalleryIndex();
  let node: GalleryNode = index;

  for (const part of slugParts) {
    const decoded = decodeURIComponent(part);
    const next = node.children?.find(
      (c) => c.slug === part || c.name === decoded
    );
    if (!next) return null;
    node = next;
  }
  return node;
}

/** Breadcrumb helper for the UI. */
export function getBreadcrumbs(slugParts: string[]) {
  const items = [{ name: "Portfolio", href: "/portfolio" }];
  let href = "/portfolio";
  for (const part of slugParts) {
    href += "/" + part;
    items.push({ name: decodeURIComponent(part), href });
  }
  return items;
}
