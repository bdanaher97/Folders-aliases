# lib/gallery/

This folder contains all logic for scanning and loading the image portfolio tree.

It builds a structured `GalleryNode` tree from the `public/Portfolio/` directory,
supporting ordering, folder nesting, and preview covers.

---

## 📄 File Overview

| File       | Description                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| `build.ts` | Main orchestrator: builds the gallery tree and exports `getGalleryIndex()`. |
| `index.ts` | Barrel export for cleaner `@/lib/gallery` imports.                          |
| `types.ts` | Shared types, especially the `GalleryNode` structure.                       |
| `paths.ts` | Filesystem helpers: slugify, image detection, safe reads.                   |
| `order.ts` | Handles `.order`, `.folders`, and `.images` for deterministic ordering.     |
| `cover.ts` | Selects the most appropriate image to use as a gallery preview.             |

---

## 🧠 Key Concepts

### GalleryNode Tree

A recursive representation of the `/public/Portfolio` folder structure,
with nested children and optional image arrays.

### Ordering Rules

- `.order` is **authoritative** if present
- `.folders` and `.images` act as **fallbacks**
- Unlisted files are appended in filesystem order
- Duplicate filenames are allowed (for intentional repeats)

### Cover Image Resolution

1. First image inside any dot-folder (e.g. `.cover/`)
2. First image in the current folder
3. First child's cover image (if present)

---

## 🛠 Manifest Mode

If the environment variable `GALLERY_USE_MANIFEST=true` is set,
and a valid `portfolio-manifest.json` file exists in `/public`,
that data will be used instead of scanning the file system.

Useful for pre-generated builds or serverless environments.

---

## 🔁 Used In

- `app/page.tsx` – loads top-level gallery view
- `GalleryGrid.tsx`, `ImageGrid.tsx`, `Breadcrumbs.tsx` – visual components

---

## 🧩 Extensibility

This structure is designed to support upcoming features like:

- Inheritable `.tags` logic for filtering
- Category and project metadata
- Lazy loading and manifest generation
- Text blurbs per project or folder
