"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom"; // this is correct for Next 13/14 client comps
import Link from "next/link";

type Crumb = { name: string; href: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById("crumbs-slot"));
  }, []);

  const content = (
    <ol className="crumbs flex gap-2 flex-wrap text-sm opacity-70">
      {items.map((c, i) => (
        <li key={c.href} className="flex items-center gap-2">
          {i > 0 && <span>›</span>}
          {i < items.length - 1 ? (
            <Link href={c.href} className="hover:underline">
              {c.name}
            </Link>
          ) : (
            <span>{c.name}</span>
          )}
        </li>
      ))}
    </ol>
  );

  // Render into the header's slot if it's present; otherwise render nothing
  return slot ? createPortal(content, slot) : null;
}
