// app/portfolio/page.tsx
/**
 * Top Gallery Page ("/portfolio")
 * Renders top-level folders with fixed aspect (tile-top).
 * Includes aliasChildrenCount per child so counts include aliases.
 */

import { notFound } from "next/navigation";
import { getNodeBySlug, getBreadcrumbs } from "@/lib/gallery";
import GalleryGrid from "@/components/GalleryGrid";
import Breadcrumbs from "@/components/Breadcrumbs";
import { addAliasCountsToChildren } from "@/lib/gallery/aliases";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ensure Node runtime for helper that reads .aliases files

export default async function TopGalleryPage() {
  const slugParts: string[] = [];
  const node = await getNodeBySlug(slugParts);
  if (!node) return notFound();

  const crumbs = getBreadcrumbs(slugParts);

  // NEW: include alias counts on each child (order preserved; .order respected)
  const childrenWithCounts = await addAliasCountsToChildren(node.children as any[]);

  return (
    <section className="py-8 space-y-6">
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 space-y-2">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl tracking-tight">{node.name}</h1>
      </div>

      {childrenWithCounts?.length ? (
        <GalleryGrid nodes={childrenWithCounts as any[]} baseHref={"/portfolio"} level="top" />
      ) : null}

      {!childrenWithCounts?.length && !node.images?.length && (
        <p className="opacity-60 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          No galleries found at the top level.
        </p>
      )}
    </section>
  );
}
