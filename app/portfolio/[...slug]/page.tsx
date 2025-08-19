// app/portfolio/[...slug]/page.tsx
/**
 * Sub-Gallery / Leaf Page under "/portfolio/...".
 * - If the node has subfolders: show folder grid; filter cover out of images.
 * - If the node has NO subfolders (leaf): show ALL images (never hide cover).
 *
 * Aliases:
 * --------
 * We append alias tiles after real children.
 * The alias tiles follow the exact order of lines in `.aliases`.
 * To ensure the UI keeps that order regardless of any default sorting,
 * we attach a numeric `sortIndex` across the merged list.
 */

export const dynamic = "force-dynamic";
export const dynamicParams = true;
// ensure Node runtime (we read small files in public/Portfolio)
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { getNodeBySlug, getBreadcrumbs } from "@/lib/gallery";
import GalleryGrid from "@/components/GalleryGrid";
import ImageGrid from "@/components/ImageGrid";
import Breadcrumbs from "@/components/Breadcrumbs";

import fs from "node:fs/promises";
import path from "node:path";

// ✅ Use the canonical cover/paths helpers from the lib (does validation + case-correct)
import {
  resolveLineToSlugParts,         // for parsing .aliases lines
  readCoverOverrideWebPath,        // robust .cover reader (validates + corrects case)
  fallbackCoverFromImages,         // fallback helper
} from "@/lib/gallery";            // index.ts re-exports from ./cover

type AliasTile = {
  linkHref: string;
  [k: string]: unknown;
};

// --- minimal local helpers (non-duplicated with lib) ---
function normalizeParts(parts: string[]): string[] {
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out;
}

async function readLinesIfExists(dirAbs: string, filename: string): Promise<string[]> {
  try {
    const txt = await fs.readFile(path.join(dirAbs, filename), "utf8");
    return txt.split(/\r?\n/);
  } catch {
    return [];
  }
}

export default async function GalleryPage({
  params,
}: { params: { slug: string[] } }) {
  const slugParts = params.slug || [];
  const node = await getNodeBySlug(slugParts);
  if (!node) return notFound();

  const crumbs = getBreadcrumbs(slugParts);

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const imagesRaw = Array.isArray(node.images) ? node.images : [];
  const hasImages = imagesRaw.length > 0;

  // 🟢 Robust cover for THIS page's folder:
  //    1) `.cover` (validated, case-corrected)
  //    2) node.coverWebPath (from build)
  //    3) first image in this folder
  let coverWebPathEffective: string | undefined =
    readCoverOverrideWebPath(String((node as any).fsPath || ""), slugParts) ||
    (node as any).coverWebPath ||
    fallbackCoverFromImages(String((node as any).webPath || ""), imagesRaw);

  // Build alias tiles (IN FILE ORDER)
  let aliasTiles: AliasTile[] = [];
  try {
    const lines = await readLinesIfExists(String((node as any).fsPath || ""), ".aliases");
    if (lines.length) {
      const existingWeb = new Set((node.children || []).map((c: any) => String(c.webPath || "")));
      for (const line of lines) {
        const parts = resolveLineToSlugParts(line, slugParts);
        if (!parts) continue;
        const target = await getNodeBySlug(parts);
        if (!target) continue;
        if (existingWeb.has(String((target as any).webPath || ""))) continue;

        const linkHref = ["/portfolio", ...parts].join("/");
        const safeSlug = `${(target as any).slug || parts.at(-1) || "alias"}__alias`;

        aliasTiles.push({
          name: (target as any).name,
          slug: safeSlug,
          fsPath: `${(target as any).fsPath || linkHref}#alias:${(node as any).fsPath}`,
          webPath: (target as any).webPath,
          coverWebPath:
            (target as any).coverWebPath ||
            fallbackCoverFromImages(
              String((target as any).webPath || ""),
              (target as any).images
            ),
          children: (target as any).children,
          images: (target as any).images,
          linkHref,
          isAlias: true,
        });
      }
    }
  } catch {
    /* ignore alias read errors */
  }

  // Children (keep existing order), and compute covers per child using robust lib reader
  const childrenWithMetadata =
    hasChildren
      ? await Promise.all(
          (node.children as any[]).map(async (child: any) => {
            const childSlugParts = String(child.webPath || "")
              .replace(/^\/+/, "")
              .split("/")
              .slice(1); // drop "Portfolio"

            const childCoverOverride = readCoverOverrideWebPath(
              String(child.fsPath || ""),
              childSlugParts
            );

            const childCover =
              childCoverOverride ||
              child.coverWebPath ||
              fallbackCoverFromImages(String(child.webPath || ""), child.images);

            return {
              ...child,
              coverWebPath: childCover,
            };
          })
        )
      : [];

  const hasFolders = (childrenWithMetadata.length > 0) || (aliasTiles.length > 0);

  // Filter the cover file out of images ONLY when there are folders
  let coverFile: string | undefined;
  if (
    coverWebPathEffective &&
    (node as any).webPath &&
    coverWebPathEffective.startsWith(String((node as any).webPath) + "/")
  ) {
    coverFile = coverWebPathEffective.slice(String((node as any).webPath).length + 1);
  }

  const imagesBase =
    hasImages ? imagesRaw : (!hasFolders && coverFile ? [coverFile] : []);

  const imagesForDisplay =
    hasFolders && coverFile
      ? imagesBase.filter((img) => img !== coverFile)
      : imagesBase;

  // === Preserve merged order: real children (existing order) + aliases (file order) ===
  const merged = [...childrenWithMetadata, ...aliasTiles];
  const gridNodes = merged.map((n, idx) => ({ ...n, sortIndex: idx }));

  return (
    <section className="py-8 space-y-6">
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 space-y-2">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl tracking-tight">{(node as any).name}</h1>
      </div>

      {gridNodes.length > 0 ? (
        <GalleryGrid
          nodes={gridNodes as any}
          baseHref={["/portfolio", ...slugParts].join("/")}
          level="sub"
        />
      ) : null}

      {imagesForDisplay.length > 0 ? (
        <ImageGrid
          images={imagesForDisplay}
          baseFsPath={(node as any).fsPath}
          webBasePath={(node as any).webPath}
        />
      ) : null}

      {!hasFolders && imagesForDisplay.length === 0 && (
        <p className="opacity-60 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          This gallery is empty.
        </p>
      )}
    </section>
  );
}
