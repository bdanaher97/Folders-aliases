// components/GalleryGrid.tsx

import Link from "next/link";
import Image from "next/image";
import { type GalleryNode } from "@/lib/gallery";
import AnchorOnClick from "@/components/AnchorOnClick";
import HashAnchorScroller from "@/components/HashAnchorScroller";

/*
  GalleryGrid
  ===========
  Renders a grid of FOLDER tiles (either at the top level or inside a sub-gallery).

  IMPORTANT:
    - Default behavior: we respect whatever order we're given (no implicit sorting).
    - If any node includes a numeric `sortIndex`, we will sort by that field.
      This lets pages explicitly control order (e.g., .aliases line order) without
      affecting other routes.

  Props:
    - nodes: GalleryNode[]      Folder entries to render
    - baseHref: string          URL prefix for folder links
    - level: "top" | "sub"      Controls which tile class to use
*/

type Level = "top" | "sub";

type Props = {
  nodes: GalleryNode[];
  baseHref: string;
  level: Level; // "top" => uses --tile-aspect-top, "sub" => uses --tile-aspect-sub
};

function firstDescendantCover(node: any): string | undefined {
  const children: any[] = Array.isArray(node?.children) ? node.children : [];
  for (const child of children) {
    if (child?.coverWebPath) return child.coverWebPath as string;
    const deeper = firstDescendantCover(child);
    if (deeper) return deeper;
  }
  return undefined;
}

export default function GalleryGrid({
  nodes,
  baseHref,
  level,
}: Props) {
  if (!nodes?.length) return null;

  // Only sort if caller provided explicit sortIndex values.
  const shouldSortByIndex = nodes.some((n: any) => typeof (n as any)?.sortIndex === "number");
  const list = shouldSortByIndex
    ? [...nodes].sort(
        (a: any, b: any) =>
          (a?.sortIndex ?? Number.POSITIVE_INFINITY) -
          (b?.sortIndex ?? Number.POSITIVE_INFINITY)
      )
    : nodes;

  const tileClass = level === "top" ? "tile-top" : "tile-sub";

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10">
      <HashAnchorScroller />
      <ul
        className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-0 sm:gap-x-6 gap-y-6"
        data-level={level}
      >
        {list.map((n) => {
          const linkHref =
            (n as unknown as { linkHref?: string })?.linkHref ??
            `${baseHref}/${n.slug}`;

          const cover =
            n.coverWebPath ?? firstDescendantCover(n) ?? "/placeholder.png";

          const realChildrenCount = Array.isArray(n.children) ? n.children.length : 0;
          const aliasChildrenCount = Number((n as any)?.aliasChildrenCount ?? 0);
          const totalChildrenCount = realChildrenCount + aliasChildrenCount;

          const hasImages = !!n.images?.length;

          const anchorId = `tile-${n.slug}`;

          return (
            <li
              key={n.fsPath ?? `${n.webPath}:${n.slug}`}
              id={anchorId}
              style={{ scrollMarginTop: "var(--header-offset)" }}
            >
              <AnchorOnClick anchorId={anchorId}>
                <Link href={linkHref} className="group block">
                  <div className={tileClass}>
                    <Image
                      src={cover}
                      alt={n.name}
                      width={1600}
                      height={1200}
                      className="tile-img"
                    />
                  </div>

                  <div className="folder-title mt-2 text-sm tracking-tight">
                    {n.name}
                  </div>

                  {totalChildrenCount > 0 ? (
                    <div className="folder-count small-muted">
                      {totalChildrenCount} {totalChildrenCount === 1 ? "gallery" : "galleries"}
                    </div>
                  ) : hasImages ? (
                    <div className="folder-count small-muted">
                      {n.images!.length} {n.images!.length === 1 ? "image" : "images"}
                    </div>
                  ) : (
                    <div className="folder-count small-muted"></div>
                  )}
                </Link>
              </AnchorOnClick>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
