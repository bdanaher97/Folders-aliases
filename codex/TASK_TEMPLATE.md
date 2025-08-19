# Codex Task Template (Paste into “Code → New task → Instructions”)

Use guardrails in `AGENTS.md`. If Codex cannot read it, treat the Constraints below as authoritative.

## Context
- Next.js portfolio repo. Deterministic gallery ordering, strict cover rules, stable UI.

## Goal
- <ONE sentence describing the single change to make.>

## Scope
- Touch ONLY: <repo-relative path(s), e.g., `scripts/generate-manifest.mjs`>.
- ONE step only. No other files.

## Constraints (LOCKED)
- Print the **path/filename first**.
- Then print the **ENTIRE FILE** (drop-in). **Preserve all existing comments**; if comments collide, resolve logically and keep them.
- Do **not** make background changes or promises.
- Do **not** alter cover precedence, mixed-gallery behaviour (not implemented), or UI layout/spacing/title alignment.
- If anything is ambiguous, **make no change** and ask.

## Acceptance Criteria
- <Bullet list of concrete checks, e.g.:>
  - Running `MANIFEST_DEBUG=1 npm run gen:manifest` shows no `.images` created at Top level.
  - No `.folders` file created where there are no subdirectories.
  - Behaviour elsewhere unchanged.

## Output & Apply (MANDATORY)
- First line: `<repo-relative path>`
- Then: **full file contents**, ready to paste.
- After printing, **APPLY the change in the workspace and PRESENT A DIFF for review** (do **not** auto-merge/commit). I will approve or cancel.

## Micro Test Plan
- <How I will validate locally, e.g. route to open, command to run, what to look for.>
