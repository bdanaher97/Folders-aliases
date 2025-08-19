// lib/gallery/aliases.ts
//
// Annotate children with `aliasChildrenCount` so folder tiles show a count
// that includes aliases. Respects .order and does NOT sort.
//
// Counts logic:
// - Reads `.aliases` inside each child (lines kept in file order; no sorting).
// - Each line is resolved to slug parts using the same path rules as .cover.
// - We check existence via getNodeBySlug (manifest), not fs.stat.
// - We de-dupe against REAL child folders (no double-counting).

import fs from "node:fs/promises";
import path from "node:path";
import type { GalleryNode } from "./types";
import { resolveLineToSlugParts } from "./cover";
import { getNodeBySlug } from "./build"; // manifest-based; avoids touching FS tree at runtime

async function readLinesIfExists(dirAbs: string, filename: string): Promise<string[]> {
  try {
    const txt = await fs.readFile(path.join(dirAbs, filename), "utf8");
    return txt.split(/\r?\n/);
  } catch {
    return [];
  }
}

async function addAliasCountToChild<T extends GalleryNode>(child: T): Promise<T & { aliasChildrenCount?: number }> {
  const childFsPath = String((child as any).fsPath || "");
  const childWebPath = String(child.webPath || "");
  const childSlugParts = childWebPath.replace(/^\/+/, "").split("/").slice(1); // drop "Portfolio"

  const lines = await readLinesIfExists(childFsPath, ".aliases");
  if (!lines.length) return child as any;

  // real child webPaths for de-dupe
  const realChildWebs = new Set(
    (Array.isArray(child.children) ? child.children : []).map((c: any) => String(c?.webPath || ""))
  );

  let aliasChildrenCount = 0;

  for (const rawLine of lines) {
    const parts = resolveLineToSlugParts(rawLine, childSlugParts);
    if (!parts) continue;

    // Use manifest lookup to verify the target gallery exists
    const target = await getNodeBySlug(parts);
    if (!target) continue;

    const targetWeb = String((target as any).webPath || "/" + ["Portfolio", ...parts].join("/"));
    if (realChildWebs.has(targetWeb)) continue; // don't double-count

    aliasChildrenCount++;
  }

  return { ...(child as any), aliasChildrenCount };
}

/**
 * Public API: annotate each child with `aliasChildrenCount`.
 * - Preserves order (so `.order` continues to work).
 * - Does not mutate the input array.
 */
export async function addAliasCountsToChildren<T extends GalleryNode>(
  children: T[] | undefined | null
): Promise<(T & { aliasChildrenCount?: number })[]> {
  if (!Array.isArray(children) || children.length === 0) return (children ?? []) as any[];
  return Promise.all(children.map(addAliasCountToChild));
}
