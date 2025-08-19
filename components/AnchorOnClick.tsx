'use client';

import React from "react";

/**
 * AnchorOnClick
 * --------------
 * Before navigation, update:
 *  - the current URL hash to the tile id
 *  - and store the tile's viewport offset (rect.top) so we can restore it.
 *
 * Hardening:
 * - Ignore modifier/middle/right clicks so new-tab behavior is unchanged.
 */
export default function AnchorOnClick({
  anchorId,
  children,
}: {
  anchorId: string;
  children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
}) {
  const onClick = React.useCallback(
    (e: React.MouseEvent) => {
      // If user is opening in a new tab/window or not left-click, do nothing
      if (
        e.defaultPrevented ||
        e.button !== 0 || // not left click
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
      ) {
        const childOnClick = children.props.onClick;
        if (typeof childOnClick === "function") childOnClick(e);
        return;
      }

      try {
        if (typeof window !== "undefined" && anchorId) {
          const id = anchorId.startsWith("#") ? anchorId.slice(1) : anchorId;
          const el = document.getElementById(id);
          if (el) {
            const desiredTop = el.getBoundingClientRect().top;

            // Update URL hash in-place so Back returns to this element
            const url = new URL(window.location.href);
            url.hash = id;
            window.history.replaceState(window.history.state, "", url.toString());

            // Persist viewport offset so the element lands where it was
            sessionStorage.setItem(
              `rtst:desiredTop:${id}`,
              String(Math.round(desiredTop))
            );
          }
        }
      } catch {
        // non-fatal
      }

      // Allow child's original onClick to run
      const childOnClick = children.props.onClick;
      if (typeof childOnClick === "function") childOnClick(e);
    },
    [anchorId, children]
  );

  return React.cloneElement(children, { onClick });
}
