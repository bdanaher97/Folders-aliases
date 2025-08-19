# High-End Photography Portfolio (Next.js + Tailwind)

Auto-discovers galleries from `public/Portfolio/**` (each folder = project; nested folders = sub-galleries). Minimal UI, responsive, keyboard navigation, and centralized UI controls in `app/globals.css`.

## Quick start

```bash
# install
npm install

# dev (runs on http://localhost:3001)
npm run dev

# build / prod
npm run build
npm start
```

Requirements

    Node.js (LTS via nvm recommended)

    npm

Folder structure (high level)

app/
layout.tsx # header + breadcrumbs slot
page.tsx # home
portfolio/
page.tsx # top-level galleries
[...slug]/page.tsx # nested galleries
components/
Breadcrumbs.tsx # portals into header slot
GalleryGrid.tsx
ImageGrid.tsx # thumbnails + lightbox
lib/
gallery.ts # folder discovery / manifest
public/
Portfolio/ # ← put your images here
placeholder.png
scripts/
generate-manifest.mjs

Images / Galleries

Place folders and images under:

public/Portfolio/ProjectName/SubProject/...

    First image in a folder becomes its cover (or drop a cover.jpg and adjust sort if you wish).

    Folders starting with a dot (e.g. .cover) are ignored by the grid but can be used to store cover assets (tweak in lib/gallery.ts if desired).

UI Controls (centralized)

Edit app/globals.css :root variables:

    --site-name

    lightbox: --lightbox-border-desktop, --lightbox-border-mobile, --lightbox-overlay, etc.

    breadcrumbs: --crumbs-top-gap, --crumbs-indent, --crumbs-color

Dev scripts

    npm run dev – start dev server on :3001

    npm run build – build for production

    npm start – run the built app

    npm run gen:manifest – generate static manifest for serverless (set GALLERY_USE_MANIFEST=true)

Branching workflow (simple)

git checkout -b feature/my-change

# edit, test

git add -A
git commit -m "feat: my change"
git push -u origin feature/my-change

# open PR or merge locally

Sync on another machine

mkdir -p ~/Local\ Sites/GPT && cd "$\_"
git clone git@github.com:sdcgi/GPT5_photo_portfolio.git portfolio
cd portfolio
npm install
npm run dev

Vercel connection test
