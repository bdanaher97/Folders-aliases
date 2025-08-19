# TODO_build.md

## Future Enhancements Plan

### 1. On-the-fly tag/category galleries

**Goal:** View all images matching one or more tags (e.g., `/t/glass`).

**Implementation:**

- Add per-image tag data via sidecar (`.tags`), `.tags.json`, or Markdown frontmatter.
- Extend `generate-manifest.mjs` to build a `tagIndex`.
- Create `app/t/[tag]/page.tsx` to render `ImageGrid` for the tag.

---

### 2. Per-project blurb/content

**Goal:** Show a text block at the top of gallery pages.

**Implementation:**

- Add `index.md` or `.meta.json` to gallery folders.
- Parse and attach blurb HTML to gallery manifest entries.
- Render above the grid in `app/[gallery]/page.tsx`.

---

### 3. Image optimisation & caching

**Goal:** Improve load speed and UX.

**Implementation:**

- Use `sharp` in `generate-manifest.mjs` for:
  - Width/height detection
  - Responsive size generation (e.g., 480, 960, 1600, 2400)
  - Blur or dominant color placeholders
- Switch to `<Image>` with `sizes` + `placeholder="blur"`.
- Add CDN cache headers (`Cache-Control`, `immutable`).

---

### 4. Optional UI improvements

- Tag chips on images
- Tag cloud/list page
- Search query support (`/t?any=glass,dark`)
- Lazy load blurb content for long galleries
