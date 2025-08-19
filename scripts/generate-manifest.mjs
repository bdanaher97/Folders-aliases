// scripts/generate-manifest.mjs
// Scans public/Portfolio and generates:
//   1) public/portfolio-manifest.json  (tree used by the app)
//   2) Convenience files in each folder:
//        - .folders  (ONLY if there are subfolders; else delete if present)
//        - .images   (ONLY if there are images; never at root; else delete)
//
// Ordering rules:
//   - .order (authoritative for BOTH folders & images)
//   - otherwise: case-insensitive, numeric-aware alpha
//
// Ignore rules:
//   - hide dot/at names (., .., .foo, @bar)
//   - hide names in .ignore (case-insensitive)
//   - hide default thumbs/proofs dirs (case-insensitive)
//
// Covers (matches lib/gallery/cover.ts):
//   - .cover bare filename: search current gallery subtree (BFS) for first match
//   - .cover "Portfolio/...": case-correct and verify under /public/Portfolio
//   - .cover relative path: case-correct and verify
//   - else: first image in this folder
//   - else: first child's first image or that child's cover
//
// Usage:
//   npm run gen:manifest
//   MANIFEST_DEBUG=1 npm run gen:manifest   # verbose logs

import fs from 'node:fs';
import path from 'node:path';

const DEBUG = process.env.MANIFEST_DEBUG === '1' || process.env.MANIFEST_DEBUG === 'true';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const ROOT = path.join(PUBLIC_DIR, 'Portfolio');
const OUT_JSON = path.join(PUBLIC_DIR, 'portfolio-manifest.json');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const DEFAULT_IGNORE_DIRS = new Set([
  'thumbnails', 'thumbnail', 'thumbs', 'thumb', 'proofs', 'proof',
]);

const log = (...args) => { if (DEBUG) console.log('[gen]', ...args); };
const isImageFile = (name) => IMAGE_EXT.has(path.extname(name).toLowerCase());

function safeReaddirSync(abs) {
  try { return fs.readdirSync(abs, { withFileTypes: true }); }
  catch { return []; }
}
function readLinesIfFile(abs) {
  try {
    const raw = fs.readFileSync(abs, 'utf8');
    return raw.split(/\r?\n/).map(s => s.replace(/#.*/, '').trim()).filter(Boolean);
  } catch { return []; }
}
function readOrder(absDir) {
  return readLinesIfFile(path.join(absDir, '.order'));
}
function readIgnore(absDir) {
  return new Set(readLinesIfFile(path.join(absDir, '.ignore')).map(s => s.toLowerCase()));
}
function isHiddenOrIgnored(name, ignoreSet) {
  if (!name) return true;
  if (name.startsWith('.') || name.startsWith('@')) return true;
  if (ignoreSet.has(name.toLowerCase())) return true;
  if (DEFAULT_IGNORE_DIRS.has(name.toLowerCase())) return true;
  return false;
}
function ciAlpha(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
}
function applyOrderList(items, desired) {
  if (!desired.length) return items.slice();
  const pos = new Map();
  desired.forEach((n, i) => pos.set(n, i));
  const inList = items.filter(n => pos.has(n)).sort((a,b) => pos.get(a) - pos.get(b));
  const rest = items.filter(n => !pos.has(n));
  return inList.concat(rest);
}
function writeIfChanged(absPath, content) {
  try {
    const prev = fs.readFileSync(absPath, 'utf8');
    if (prev === content) return false;
  } catch {}
  fs.writeFileSync(absPath, content, 'utf8');
  return true;
}
function removeIfExists(absPath) {
  try {
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
      return true;
    }
  } catch {}
  return false;
}

// ---------- Cover helpers (mirrors lib/gallery/cover.ts) ----------
function stripWeirdPrefix(s) { return s.replace(/^[\uFEFF\u2060\u200B]+/, ''); }
function normalizeParts(parts) {
  const out = [];
  for (const p of parts) { if (!p || p === '.') continue; if (p === '..') out.pop(); else out.push(p); }
  return out;
}
function resolveLineToSlugParts(rawLine, currentSlugParts) {
  let line = stripWeirdPrefix(rawLine).trim();
  if (!line || line.startsWith('#')) return null;
  line = line.replace(/\\/g, '/');
  const cleaned = line.replace(/^\/+/, '');
  if (/^portfolio\//i.test(cleaned)) { const segs = cleaned.split('/'); segs.shift(); return normalizeParts(segs); }
  if (line.startsWith('/')) return null;
  const rel = cleaned.split('/'); if (rel[0]?.toLowerCase() === 'portfolio') rel.shift();
  return normalizeParts([...currentSlugParts, ...rel]);
}
function slugToWebPath(parts) { return '/' + ['Portfolio', ...parts].join('/'); }
function correctCaseUnderPortfolio(parts) {
  let dir = ROOT; const corrected = [];
  for (let i=0;i<parts.length;i++) {
    const seg = parts[i];
    const entries = safeReaddirSync(dir);
    let match = entries.find(e => e.name === seg);
    if (!match) match = entries.find(e => e.name.toLowerCase() === seg.toLowerCase());
    if (!match) return null;
    corrected.push(match.name);
    if (i < parts.length - 1) { if (!match.isDirectory()) return null; dir = path.join(dir, match.name); }
  }
  return corrected;
}
function findFileUnderPortfolioBFS(startSlugParts, fileName) {
  const startCorrected = correctCaseUnderPortfolio(startSlugParts);
  if (!startCorrected) return null;
  const startAbs = path.join(ROOT, ...startCorrected);
  const wantedLower = fileName.toLowerCase();
  const q = [{ abs: startAbs, parts: [...startCorrected] }];
  while (q.length) {
    const { abs, parts } = q.shift();
    const entries = safeReaddirSync(abs);
    const files = entries.filter(e => e.isFile()).map(e => e.name).sort(ciAlpha);
    const dirs  = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name).sort(ciAlpha);
    for (const f of files) { if (f === fileName) return [...parts, f]; }
    for (const f of files) { if (f.toLowerCase() === wantedLower) return [...parts, f]; }
    for (const d of dirs) q.push({ abs: path.join(abs, d), parts: [...parts, d] });
  }
  return null;
}
function readCoverOverrideWebPath(absDir, slugParts) {
  const p = path.join(absDir, '.cover');
  let line; try { line = fs.readFileSync(p, 'utf8'); } catch { return null; }
  if (!line) return null;
  line = stripWeirdPrefix(line).split(/\r?\n/).map(s=>stripWeirdPrefix(s).trim()).find(s=>s && !s.startsWith('#'));
  if (!line) return null;

  const parts = resolveLineToSlugParts(line, slugParts);
  if (!parts || !parts.length) return null;

  const last = parts[parts.length-1] || '';
  const hasExt = IMAGE_EXT.has(path.extname(last).toLowerCase());
  if (!hasExt) return null;

  const corrected = correctCaseUnderPortfolio(parts);
  if (corrected) return slugToWebPath(corrected);

  const isLikelyRelative = !/^portfolio\//i.test(line.replace(/\\/g,'/').replace(/^\/+/, '')) && !line.startsWith('/');
  if (isLikelyRelative) {
    const found = findFileUnderPortfolioBFS(slugParts, last);
    if (found) return slugToWebPath(found);
  }
  return null;
}
function fallbackCoverFromImages(webPath, images) {
  if (!images || !images.length) return undefined;
  return path.posix.join(webPath, images[0]);
}
function effectiveCoverWebPath({ dirAbs, slugParts, webPath, images, existingCoverWebPath }) {
  const override = readCoverOverrideWebPath(dirAbs, slugParts) || undefined;
  return override || existingCoverWebPath || fallbackCoverFromImages(webPath, images);
}

// ---------- Core build ----------
function buildNode(absPath, relParts, inheritedIgnore = new Set()) {
  const dirName = path.basename(absPath);
  const slug = dirName;
  const webPath = '/' + ['Portfolio', ...relParts].join('/');

  const isRoot = relParts.length === 0;

  const localIgnore = readIgnore(absPath);
  const combinedIgnore = new Set([...Array.from(inheritedIgnore), ...Array.from(localIgnore), ...Array.from(DEFAULT_IGNORE_DIRS)]);

  const entries = safeReaddirSync(absPath);
  const fileNames = entries.filter(e => e.isFile()).map(e => e.name).filter(n => !isHiddenOrIgnored(n, combinedIgnore));
  const dirNames  = entries.filter(e => e.isDirectory()).map(e => e.name).filter(n => !isHiddenOrIgnored(n, combinedIgnore));

  // IMAGES & FOLDERS with .order override, else ci-alpha
  const order = readOrder(absPath);
  let images = fileNames.filter(isImageFile);
  let folders = dirNames.slice();
  if (order.length) {
    images = applyOrderList(images, order);
    folders = applyOrderList(folders, order);
  } else {
    images = images.sort(ciAlpha);
    folders = folders.sort(ciAlpha);
  }

  // Write convenience files with suppression rules
  const imgPath = path.join(absPath, '.images');
  const folPath = path.join(absPath, '.folders');

  // .folders: write only if there are subfolders; else delete if present
  if (folders.length > 0) {
    const changed = writeIfChanged(folPath, folders.join('\n') + '\n');
    if (changed) log('Updated .folders', path.relative(ROOT, absPath) || '.');
  } else {
    if (removeIfExists(folPath)) log('Removed empty .folders', path.relative(ROOT, absPath) || '.');
  }

  // .images:
  //   - NEVER write at root
  //   - write only if there are images; else delete if present
  if (isRoot) {
    if (removeIfExists(imgPath)) log('Removed root .images', '(root)');
  } else if (images.length > 0) {
    const changed = writeIfChanged(imgPath, images.join('\n') + '\n');
    if (changed) log('Updated .images', path.relative(ROOT, absPath) || '.');
  } else {
    if (removeIfExists(imgPath)) log('Removed empty .images', path.relative(ROOT, absPath) || '.');
  }

  // Children
  const children = folders.map((child) =>
    buildNode(path.join(absPath, child), [...relParts, child], combinedIgnore)
  );

  // Cover
  const cover = effectiveCoverWebPath({ dirAbs: absPath, slugParts: relParts, webPath, images });

  // Hide cover file from images when there are children
  let finalImages = images.slice();
  if (children.length > 0 && cover && cover.startsWith(webPath + '/')) {
    const coverFile = cover.slice(webPath.length + 1);
    finalImages = finalImages.filter((img) => img !== coverFile);
  }

  return {
    name: dirName,
    slug,
    fsPath: absPath,
    webPath,
    coverWebPath: cover || undefined,
    images: finalImages.length ? finalImages : undefined,
    children: children.length ? children : undefined,
  };
}

// Build & write manifest (and convenience files)
if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error('✖ public/Portfolio not found.');
  process.exit(1);
}
const manifest = buildNode(ROOT, []);
fs.writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2));
console.log('✔ Wrote public/portfolio-manifest.json');
