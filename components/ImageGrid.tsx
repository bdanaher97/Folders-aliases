"use client";

/*
  ImageGrid
  =========
  Renders a grid of LEAF images (i.e., inside a gallery that has images).
  IMPORTANT: Leaf images should display at their *native aspect* (no fixed tile ratio).
  We achieve this by:
    - Using a wrapper `.tile-leaf` that DOES NOT set `aspect-ratio`.
    - Using an <img> with `.tile-img--contain` so height is driven by the image’s intrinsic aspect.

  Features:
    - Click-to-open lightbox with previous/next navigation.
    - Keyboard controls (Esc to close, ← / → to navigate).
    - Preloads neighbor images when open for snappy next/prev.
    - Optional filename label under each thumbnail (useful for curation).

  Styling hooks (defined in globals.css):
    - .tile-leaf          → container with no aspect-ratio, no cropping
    - .tile-img--contain  → native aspect, no crop, responsive width
    - .image-filename     → label visibility controlled by --show-image-filenames (0/1)
    - .lightbox-backdrop, .lightbox-img-wrap, .lightbox-img-heightfit
    - .btn-overlay (+ variants), .small-muted

  Props:
    - images: string[]        List of image filenames (relative to webBasePath).
    - webBasePath: string     Public path prefix to load files from (e.g. "/Portfolio/Brand/Campaign").
    - baseFsPath?: string     Optional filesystem path (kept for parity with upstream types; not required here).

  NOTE ON SIZING (single-image galleries):
    - We cap height to: (NO-UI viewport) - top-of-grid - SAFETY
      * NO-UI viewport = 100lvh if supported (treat as if URL bars don’t exist).
        If not supported, we fall back to a one-time baseline at mount.
      * top-of-grid = getBoundingClientRect().top (includes header + breadcrumbs + any padding)
      * SAFETY covers filename label + breathing room.

  MOBILE JUMP POLICY:
    - We DO NOT update on scroll/resize (URL bars show/hide). No jumps.
    - We ONLY re-measure on orientation change or an initial post-mount pass.
*/

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  images: string[];
  webBasePath: string;
  baseFsPath?: string;
};

export default function ImageGrid({ images, webBasePath }: Props) {
  // Index of currently open image in lightbox; null means closed.
  const [open, setOpen] = useState<number | null>(null);

  // Track that we’ve mounted so portals can target document.body safely (SSR guard).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Ref to the outer container that sits above the <ul>. We measure its top to compute remaining height.
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Top offset of the container (px) – measured once (and on orientation change).
  const [topOffset, setTopOffset] = useState<number>(0);

  // Fallback baseline viewport height (px) if 100lvh is not supported.
  const baseViewportRef = useRef<number | null>(null);

  // Derived helpers
  const count = images.length;
  const isSingle = count === 1;

  // --- Responsive column logic for small galleries (<3 images) -------------
  // 1 image  → 1 col on all breakpoints (fixed gaps, no sm/lg modifiers → no jolts)
  // 2 images → 1 col on mobile, 2 cols on ≥sm
  // 3+       → 1 / 2 / 3 on mobile / ≥sm / ≥lg (existing look)
  const gridCols = useMemo(() => {
    if (isSingle) return "grid grid-cols-1 gap-x-0 gap-y-4";
    if (count === 2)
      return "grid grid-cols-1 sm:grid-cols-2 gap-x-0 sm:gap-x-4 gap-y-4 sm:gap-y-6";
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-0 sm:gap-x-4 gap-y-4 sm:gap-y-6";
  }, [count, isSingle]);

  // --- One-time measurements (no scroll/resize listeners) ------------------
  useLayoutEffect(() => {
    if (!isSingle) {
      setTopOffset(0);
      baseViewportRef.current = null;
      return;
    }

    const SAFETY_PX = 56; // kept for clarity; used when composing calc string below

    const measure = () => {
      const el = containerRef.current;
      if (!el) return;

      // Top edge of the container relative to viewport (includes header + breadcrumbs + padding)
      const top = Math.floor(el.getBoundingClientRect().top);
      setTopOffset(top);

      // Establish fallback baseline viewport height once
      if (baseViewportRef.current == null) {
        const currentVh = Math.max(
          window.visualViewport?.height ?? 0,
          window.innerHeight ?? 0
        );
        baseViewportRef.current = Math.floor(currentVh);
      }
    };

    // Initial measure after layout/paint + a late pass
    measure();
    const timer = window.setTimeout(measure, 150);

    // On ORIENTATION change, re-measure (layout really changes)
    const onOrientation = () => {
      baseViewportRef.current = null; // re-establish baseline
      // next frame: measure again
      requestAnimationFrame(measure);
    };
    window.addEventListener("orientationchange", onOrientation);

    return () => {
      window.removeEventListener("orientationchange", onOrientation);
      window.clearTimeout(timer);
    };
  }, [isSingle]);

  // --- Handlers -------------------------------------------------------------
  const openAt = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= count) return;
      setOpen(idx);
    },
    [count]
  );

  const openPrev = useCallback(() => {
    setOpen((i) => (i === null ? 0 : (i + count - 1) % count));
  }, [count]);

  const openNext = useCallback(() => {
    setOpen((i) => (i === null ? 0 : (i + 1) % count));
  }, [count]);

  const close = useCallback(() => {
    setOpen(null);
  }, []);

  // --- Preload neighbor images when lightbox is open -----------------------
  useEffect(() => {
    if (open === null || count < 2) return;
    const next = (open + 1) % count;
    const prev = (open + count - 1) % count;
    new window.Image().src = `${webBasePath}/${images[next]}`;
    new window.Image().src = `${webBasePath}/${images[prev]}`;
  }, [open, count, images, webBasePath]);

  // --- Keyboard navigation + background scroll lock ------------------------
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") openPrev();
      if (e.key === "ArrowRight") openNext();
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, openPrev, openNext]);

  // --- Lightbox overlay (unchanged — you said it was fine) -----------------
  const overlay =
    open === null ? null : (
      <div
        className="lightbox-backdrop flex items-center justify-center"
        onClick={close}
      >
        <div
          className="lightbox-img-wrap relative"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={`${webBasePath}/${images[open]}`}
            alt=""
            className="lightbox-img-heightfit"
          />
          <button
            className="btn-overlay btn-overlay--outline absolute left-3 top-1/2 -translate-y-1/2"
            onClick={(e) => {
              e.stopPropagation();
              openPrev();
            }}
            aria-label="Previous image"
            type="button"
          >
            ‹
          </button>
          <button
            className="btn-overlay btn-overlay--outline absolute right-3 top-1/2 -translate-y-1/2"
            onClick={(e) => {
              e.stopPropagation();
              openNext();
            }}
            aria-label="Next image"
            type="button"
          >
            ›
          </button>
          <button
            className="btn-overlay btn-overlay--outline absolute top-3 right-3"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>
      </div>
    );

  // --- Render ---------------------------------------------------------------
  if (!images || images.length === 0) return null;

  // Build single-image maxHeight with a stable “no URL bars” baseline:
  //  - Prefer CSS 100lvh (largest viewport height — as if UI bars are hidden)
  //  - Fallback: one-time baseline from innerHeight/visualViewport at mount
  const SAFETY_PX = 56;
  const supportsLVH =
    typeof window !== "undefined" &&
    typeof (window as any).CSS !== "undefined" &&
    typeof (window as any).CSS.supports === "function" &&
    (window as any).CSS.supports("height: 100lvh");

  const fallbackMax =
    baseViewportRef.current != null
      ? Math.max(0, baseViewportRef.current - topOffset - SAFETY_PX) + "px"
      : undefined; // brief initial render will just rely on natural size; we measure quickly after mount

  const singleMaxHeightStyle: React.CSSProperties | undefined = isSingle
    ? supportsLVH
      ? { maxHeight: `calc(100lvh - ${topOffset}px - ${SAFETY_PX}px)` }
      : fallbackMax
      ? { maxHeight: fallbackMax }
      : undefined
    : undefined;

  return (
    <>
      <div ref={containerRef} className="w-full px-0 sm:px-6 lg:px-10">
        {/* NOTE: grid columns are now dynamic based on image count (see gridCols). */}
        <ul className={`list-none p-0 m-0 ${gridCols}`}>
          {images.map((img, i) => {
            const src = `${webBasePath}/${img}`;

            return (
              <li key={img}>
                <button
                  className="group block w-full text-left"
                  onClick={() => openAt(i)}
                  aria-label={`Open image ${i + 1} of ${count}`}
                  type="button"
                >
                  {/* Leaf tile wrapper: NO fixed aspect, transparent bg */}
                  <div className="tile-leaf" style={{ background: "transparent" }}>
                    {/* Native-aspect image: contain & cap height (single image uses stable maxHeight) */}
                    <img
                      src={src}
                      alt=""
                      className={
                        isSingle
                          ? "block mx-auto w-auto max-w-full h-auto object-contain"
                          : "block w-full h-auto object-contain"
                      }
                      style={singleMaxHeightStyle}
                      loading="lazy"
                    />
                  </div>

                  {/* Filename visibility controlled ONLY by CSS var now */}
                  <div className="image-filename small-muted mt-2">{img}</div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {mounted && open !== null ? createPortal(overlay, document.body) : null}
    </>
  );
}
