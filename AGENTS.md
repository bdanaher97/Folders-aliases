# AGENTS – Project Operating Rules (Do Not Drift)

This document locks behaviour for all code assistants and contributors. Breaking any “Locked” rule is a hard error.

## 0) Mission

* A minimal, pro-grade portfolio gallery (Next.js App Router) with deterministic folder/image ordering and predictable covers.
* Stability > features. Controlled, auditable changes only.

## 1) Interaction Protocol (Locked)

* ALWAYS print the path/filename **before** any code.
* When rewriting, PRINT THE **ENTIRE FILE** (drop-in replacement). Preserve all existing comments. If comments collide, resolve logically and KEEP them.
* ONE change step at a time.
* Apply the change in the workspace and **present a diff for review**. **Do not auto-merge**; await my approval in the PR/commit UI.
* No background tasks or promises outside the current run. Deliver the full result (printed file + diff) in the same task.
* Prefer small, reversible steps. If anything is ambiguous, default to **NO CHANGE** and ask.

## 2) Repository Invariants (Locked)

* **Ordering files**

  * `.order` controls the display order for sub-galleries and/or images where present.
  * `.folders` and `.images` are **convenience lists** that scripts may overwrite when (and only when) doing their job. They never override `.order`.
* **Top gallery**

  * There are **NEVER** lone images in the Top gallery. Do **NOT** generate `.images` at Top level. Do not display unattached images at Top.
* **Generator behaviour**

  * The manifest/generator MUST NOT create `.folders` in a directory that has **no subdirectories**.
  * The manifest/generator MUST NOT create `.images` in a directory that has **no images**.
  * The manifest/generator MUST NOT create `.images` in the **Top** gallery.
* **Cover logic**

  * If a `.cover` file specifies a filename, that exact file is the cover.
  * If `.cover` exists but is **empty**, use the **first image** according to the effective order for that directory.
  * Do NOT special-case filenames like `cover.*`. Names alone confer no priority.
* **Mixed galleries**

  * Currently **not supported** in a single frame. Treat as **two sections** (sub-galleries, then images) **only** when/if the later “Section” branch is implemented. Until then, maintain strict separation.
* **UI constraints**

  * Do not reintroduce the mobile scroll “jump” when the browser chrome hides/shows.
  * Do not regress gallery grid width or title alignment fixes.
  * Breadcrumbs and header must remain visually consistent across Stills/Motion/Portfolio.

## 3) Scripts (Locked Expectations)

* `scripts/generate-manifest.mjs`:

  * May overwrite `.folders` and `.images` where appropriate.
  * MUST respect all invariants above.
  * MUST NOT create files where no corresponding items exist.
  * MUST NOT touch Top-level `.images`.
* All optimisation/helper scripts must be idempotent and safe to re-run. Prefer a `--dryrun` flag where applicable.

## 4) Development Modes

* `NEXT_PUBLIC_DEV`:

  * `1` enables dev-only behaviour/diagnostics.
  * `0` disables them. Missing/invalid should be treated as `0` (off).
  * No dev-only UI/console in production builds.

## 5) Change Management Protocol (Locked)

1. Create/confirm a working branch for the specific fix/feature.
2. Make **one** surgical change.
3. Output a full drop-in file (path header + entire file contents).
4. Include a short rationale + expected observable behaviour.
5. Provide a micro test plan (which route to visit, what to click, command to run).
6. **Apply the change and present a diff** (no auto-merge). I will review and approve/cancel in the PR/commit UI.
7. Commit/PR title format: `feat|fix|refactor(scope): summary`. Avoid noisy commits.

## 6) Testing Checklist (Run before PR)

* `npm|pnpm|yarn build` passes locally.
* Run `MANIFEST_DEBUG=1 npm run gen:manifest` when relevant; verify:

  * No forbidden files are created.
  * **No** Top-level `.images` file appears.
* Verify cover selection on directories with:

  * explicit `.cover`,
  * empty `.cover`,
  * no `.cover`.
* Verify a leaf gallery, a subgallery list, and a deep nested gallery.
* Verify Stills vs Motion pages, and a random Portfolio subgallery.
* Mobile sanity check (Chrome/Firefox Android): **no** scroll-jump when URL bar hides.

## 7) Style & Quality

* Keep modules small and single-purpose. No “god” files.
* Preserve public APIs of utilities unless explicitly agreed.
* Document non-obvious logic with short comments near the code.
* Prefer pure functions for logic that can be unit-tested.

## 8) Red Lines (Immediate Revert)

* Generating `.images` at Top level.
* Generating `.folders` where no subdirectories exist.
* Changing cover precedence without explicit approval.
* Introducing mixed-gallery behaviour without the “Section” frame pattern.

## 9) Assistant Persona (for LLMs)

* Be concise, technical, and consistent.
* Never hand-wave: if unsure, do not change.
* Always show the file path and print full files.
* Follow the step gate: one file per task; then apply and show diff (no auto-merge).

## 10) Codex Usage (quick reference)

* In **Code → New task → Instructions**, start with:
