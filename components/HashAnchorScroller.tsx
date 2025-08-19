'use client';

import { useEffect } from 'react';

/**
 * HashAnchorScroller
 * ------------------
 * On mount and when hash/history changes:
 *  - If we have a stored desiredTop for the current hash, scroll so the
 *    target element's top matches that viewport offset (same visual position).
 *  - Else, fall back to normal anchor jump (respecting scroll-margin-top).
 */
export default function HashAnchorScroller() {
  useEffect(() => {
    const applyAnchorPosition = () => {
      if (typeof window === 'undefined') return;
      const raw = window.location.hash;
      if (!raw) return;
      const id = raw.replace(/^#/, '');
      const el = document.getElementById(id);
      if (!el) return;

      // Retrieve viewport offset we saved before navigating away
      const stored = sessionStorage.getItem(`rtst:desiredTop:${id}`);
      const desiredTop = stored != null ? parseInt(stored, 10) : null;

      // Defer until layout is ready (end of frame)
      requestAnimationFrame(() => {
        if (desiredTop != null && Number.isFinite(desiredTop)) {
          // Compute the current top of the element relative to viewport
          const currentTop = el.getBoundingClientRect().top;
          // Scroll by the delta so the element appears at the same viewport position
          const delta = currentTop - desiredTop;
          if (Math.abs(delta) > 1) {
            window.scrollBy({ top: delta, left: 0, behavior: 'instant' as ScrollBehavior });
          }
          // Clean up so we don't fight future navigations
          sessionStorage.removeItem(`rtst:desiredTop:${id}`);
        } else {
          // Fallback: standard anchor behavior (lets scroll-margin-top work)
          el.scrollIntoView({ block: 'start', inline: 'nearest' });
        }
      });
    };

    applyAnchorPosition();
    window.addEventListener('hashchange', applyAnchorPosition);
    window.addEventListener('popstate', applyAnchorPosition);
    return () => {
      window.removeEventListener('hashchange', applyAnchorPosition);
      window.removeEventListener('popstate', applyAnchorPosition);
    };
  }, []);

  return null;
}
