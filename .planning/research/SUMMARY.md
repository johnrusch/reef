# Project Research Summary

**Project:** Reef — v1.4 Repo-Stored Diagrams (.reef/ Folder)
**Domain:** Electron desktop app — file-system artifact storage layered on top of existing SQLite C4 diagram pipeline
**Researched:** 2026-03-26
**Confidence:** HIGH

## Executive Summary

v1.4 is a pure-code milestone that requires zero new npm dependencies. The goal is to make C4 architecture diagrams shareable across teams by writing generated diagram artifacts (PlantUML source, pre-rendered SVGs, AI enrichment metadata) into a `.reef/` folder inside each managed repository. This folder can be committed to git like any other file, allowing teammates to clone a repo and immediately see diagrams without triggering expensive AI regeneration. Every capability needed — file I/O, git operations, schema validation, file watching exclusion — already exists in the installed stack: Node.js `fs/promises`, `simple-git` v3.28.0, `zod` v4.3.6, and `chokidar` v4.0.3.

The recommended architecture adds one new service (`ReefStorageService`), one new IPC handler file (`reefStorageHandlers.ts`), and a minimal set of targeted modifications to existing components. The write path hooks into the existing `c4-storage:store-svg` IPC handler (the point where both the SVG and PlantUML source are available), and the read path adds a `.reef/` presence check to `AddRepositoryModal` before showing the generation prompt. SQLite remains the primary app-state store; `.reef/` is a transportable, VCS-friendly export layer. The two must be kept in sync via a "SQLite-first, .reef/-second" write ordering and a "read .reef/ on import, populate SQLite" read ordering.

The most critical risks are all preventable at Phase 1: the chokidar file watcher must exclude `.reef/` before any files are written there (or an infinite regeneration loop triggers), SVG files need a `.gitattributes binary` directive committed alongside the first SVG (or git merge conflicts corrupt diagrams for the whole team), and all file writes must use atomic temp-file-then-rename semantics (or concurrent regenerations produce corrupt partial SVGs on Windows). `schemaVersion: 1` must be in every `metadata.json` from day one to prevent silent breakage in future schema evolution. Path traversal validation is required in all IPC read handlers since `.reef/` files originate from external repositories.

---

## Key Findings

### Recommended Stack

v1.4 needs no new packages installed. All required capabilities are available in the current stack. The implementation work is one new service file, one new IPC handler file, one shared type definition, a one-line chokidar regex change, and integration hooks in two existing files.

**Core technologies:**
- `fs/promises` (Node.js 22 built-in): all `.reef/` directory and file operations — `mkdir({ recursive: true })`, `writeFile`, `readFile`, `access` cover 100% of use cases; no additional package needed
- `simple-git` v3.28.0 (installed): stage and commit `.reef/` artifacts via `add()`, `commit()`, `checkIgnore()` — all methods verified present in installed TypeScript definitions
- `zod` v4.3.6 (installed): parse and validate `metadata.json` on read with `.safeParse()` — graceful fallback to regeneration on corrupt or version-mismatched files; already used throughout codebase
- `chokidar` v4.0.3 (installed): one-line regex change to exclude `.reef/` from the existing file watcher — prevents self-trigger infinite generation loop
- `better-sqlite3` v11.10.0 (installed): SQLite remains the primary app state store; `.reef/` is a parallel, VCS-friendly export that populates SQLite on import

### Expected Features

**Must have (table stakes — v1.4 launch):**
- Define `.reef/` folder structure — per-level files (`context.puml`, `context.svg`, `context.meta.json`) plus optional single `metadata.json`; this is the contract every other feature depends on; must be stable and treated as a public API from day one
- Read `.reef/` on repo import — check for `.reef/` presence before showing generation prompt; if found, load artifacts into SQLite and display instantly; no AI call triggered; no PlantUML render
- Write `.reef/` after generation — on generation complete, write all levels to `.reef/`; automatic, not user-triggered; SQLite write succeeds first
- Manual "Regenerate and Save" — explicit user action to refresh diagrams and update `.reef/`; automatic background sync on every file save is explicitly out of scope per PROJECT.md
- Graceful fallback when `.reef/` absent — existing first-visit generation prompt flow unchanged; only diverge when `.reef/` is detected

**Should have (competitive — v1.4.x after core validated):**
- Stale-on-import detection — compare `metadata.json:generated_at` vs last commit date via `simple-git git log`; show warning badge + "Regenerate and Save" CTA if diagrams predate recent code changes
- Auto-write `.gitattributes` — append `linguist-generated=true` for `.reef/*.svg` and `.reef/*.puml` on first "Save to Repo" to reduce PR noise
- Import conflict resolution — if local SQLite data is newer than `.reef/`, prompt user instead of silently overwriting

**Defer (v2+):**
- `.reef/` chokidar watching for auto-import on git pull (circular trigger risk; adds per-repo watcher overhead)
- Diagram freshness badge in C4HierarchyTree sidebar
- CI/CD export hook or CLI path for GitHub Actions integration
- Per-branch `.reef/` storage (last-writer-wins on current branch is sufficient; branch-aware logic multiplies folder complexity)
- In-app diagram version history (use `git log -- .reef/context.puml` instead)

### Architecture Approach

The architecture adds a thin new layer between the existing three-phase generation pipeline (Static Analysis → AI Enrichment → PlantUML Generation) and the filesystem. `ReefStorageService` encapsulates all `.reef/` file I/O with atomic write semantics; it is called from the `c4-storage:store-svg` IPC handler in `c4StorageHandlers.ts` — the correct insertion point where both the SVG string and PlantUML source are available in the same handler context. On repo import, `AddRepositoryModal` makes a `reef-storage:check-exists` IPC call before showing the generation prompt; if artifacts exist, `reef-storage:load-into-sqlite` populates `C4StorageService` and the modal closes. No new Zustand stores are needed; the existing `diagramStateStore` state machine handles all resulting state transitions without modification.

**Major components:**
1. `ReefStorageService` (new) — core read/write/validate logic for `.reef/` folder; atomic writes via temp-file-then-rename; schema validation via `zod.safeParse()`; centralized file path derivation in a single `getFilePaths(level, elementId)` method; no external npm dependencies
2. `ReefStorageHandlers` (new) — IPC registration for `reef-storage:check-exists`, `reef-storage:load-into-sqlite`, `reef-storage:clear`; follows exact pattern of existing `c4StorageHandlers.ts`; `write-artifacts` is main-process-internal only and not exposed via IPC
3. `c4StorageHandlers.ts` (modified) — call `ReefStorageService.writeArtifacts()` after `storeSvg()` succeeds; error in `.reef/` write is logged but non-fatal (SQLite already has the data)
4. `FileWatcherService` (modified) — add `[/\\]\.reef[/\\]` to the chokidar `ignored` predicate; this is a correctness fix, not an optimization; must be done before any `.reef/` write code exists
5. `AddRepositoryModal.tsx` (modified) — `.reef/` detection branch after repo validation, before generation prompt; `hasArtifacts=true` → call `load-into-sqlite` → close modal; `hasArtifacts=false` → existing generation prompt flow

### Critical Pitfalls

1. **Chokidar self-trigger infinite loop** — add `[/\\]\.reef[/\\]` to the `ignored` predicate in `FileWatcherService` as the very first change; writing any file to `.reef/` without this exclusion marks diagrams stale immediately after generation, triggering another generation run indefinitely
2. **Git SVG merge conflicts** — commit a `.gitattributes` file marking `.reef/*.svg binary` alongside the first SVG write; PlantUML SVG output is non-deterministic across machines (embedded timestamps, session IDs), so two developers regenerating concurrently produce conflict markers inside SVG XML that `git merge` cannot resolve meaningfully
3. **Partial writes from race conditions** — use atomic temp-file-then-rename for all `.reef/` writes; `fs.writeFile` truncates the target before writing, so concurrent writes produce corrupt partial files; on Windows add `EPERM` retry or `fs.rmSync` before rename
4. **Missing `schemaVersion` in metadata** — embed `schemaVersion: 1` in every `meta.json` from the initial implementation; any future field rename or removal without versioning silently breaks all repos that have `.reef/` committed, triggering unnecessary regeneration
5. **Path traversal via IPC** — validate that all resolved `.reef/` paths begin with `path.resolve(repoPath)` before reading; never use values from `.reef/metadata.json` to construct subsequent file read paths; display SVGs via `<img src="data:image/svg+xml;base64,...">` not raw `innerHTML`

---

## Implications for Roadmap

Based on research, the build order follows a strict dependency chain. The service layer must exist and be tested before IPC wiring; the watcher fix must precede any write code; and the generation pipeline integration must precede the import flow (so `.reef/` artifacts exist to test the read path against).

### Phase 1: ReefStorageService and Folder Foundation

**Rationale:** All other phases read from or write to `.reef/`. The folder structure, file naming convention, and metadata schema are a public contract — changing them after teams have committed `.reef/` is a breaking change for every repo. The chokidar fix, atomic write pattern, schema versioning, and path security validation belong here because adding them later requires reworking every write call.
**Delivers:** Fully tested `ReefStorageService` with `checkExists()`, `readArtifacts()`, `writeArtifacts()`, `writeSvg()`, atomic write helpers, and `zod`-based schema validation. The `FileWatcherService` exclusion. A `metadata.json` / `meta.json` schema with `schemaVersion: 1`. Unit-testable with `fs` mocks alone — no IPC, no UI.
**Addresses:** Define `.reef/` folder structure (P1 table stakes)
**Avoids:** Chokidar self-trigger loop (Pitfall 1), SVG merge conflicts (Pitfall 2), atomic write race conditions (Pitfall 4), missing schema version (Pitfall 8), path traversal security (Pitfall 7)

### Phase 2: IPC Wiring and Generation Pipeline Write

**Rationale:** `ReefStorageService` (Phase 1) must exist before IPC handlers can reference it. The generation pipeline write is the highest-value integration: it means every new diagram generation automatically produces `.reef/` artifacts that can be committed and shared. This phase also resolves the SVG pipeline gap — confirming that the `c4-storage:store-svg` handler is the correct write point.
**Delivers:** `ReefStorageHandlers` registered in `main.ts`; `preload.ts` exposing `reefStorage` namespace; `c4StorageHandlers.ts` calling `ReefStorageService.writeArtifacts()` after `storeSvg()` completes. Every successful generation now auto-writes `.reef/`. Error in `.reef/` write is non-fatal; SQLite write is unaffected.
**Uses:** `simple-git` `checkIgnore()` for gitignore detection; `zod` for metadata validation; "SQLite-first, .reef/-second" dual-write ordering
**Implements:** Dual-write pattern; non-fatal error handling; auto-write of `.reef/.gitattributes` on first write

### Phase 3: Repo Import — Read from .reef/

**Rationale:** Depends on Phase 2 establishing that `.reef/` artifacts exist and are valid. The import path must handle SQLite sync from the start — never leaving both storages active without a defined precedence rule (`.reef/` wins on import; SQLite is the app's runtime source of truth).
**Delivers:** `AddRepositoryModal` checks for `.reef/` presence before showing generation prompt. If artifacts found, calls `reef-storage:load-into-sqlite`, populates SQLite + LRU cache, closes modal. Diagrams display instantly — no AI call, no PlantUML render. Graceful fallback to existing generation flow when `.reef/` absent.
**Addresses:** Read `.reef/` on repo import (P1 table stakes), Instant SVG display (P1 table stakes), Graceful fallback when `.reef/` absent (P1 table stakes)
**Avoids:** Dual storage divergence (Pitfall 3), stale badge after git pull (Pitfall 6), loading SVGs into LRU only while skipping SQLite (Architecture Anti-Pattern 2 — bypassing SQLite breaks the entire state machine)

### Phase 4: Manual Regenerate and Save UI

**Rationale:** Depends on Phase 2 (write path) and Phase 3 (read path) both working. The user needs an explicit "Regenerate and Save" action to share updated diagrams with teammates after code changes. This is the team-sharing workflow completion.
**Delivers:** Toolbar button with context-sensitive label ("Generate and Save to .reef/" on first use, "Regenerate and Update .reef/" on subsequent use). Triggers existing `c4-generation:enqueue` IPC path; `.reef/` write happens automatically on completion via Phase 2 integration. User can then `git commit .reef/` via Reef's existing git panel.
**Addresses:** Manual "Regenerate and Save" (P1 table stakes), Consistent diagrams across team (P1 table stakes)

### Phase 5: Polish — Stale Detection and Conflict Resolution

**Rationale:** Core read/write loop is working and tested. These are v1.4.x polish features that improve the team-sharing experience without blocking the core milestone.
**Delivers:** Stale-on-import detection (compare `meta.json:generatedAt` vs `git log` date via `simple-git`; show "Diagrams may be outdated" badge + "Regenerate and Save" CTA). Auto-write `.gitattributes` with `linguist-generated=true` on first "Save to Repo". Import conflict resolution prompt when local SQLite data is newer than `.reef/`.
**Addresses:** Stale-on-import detection (P2), Auto-write `.gitattributes` (P2), Import conflict resolution (P2)

### Phase Ordering Rationale

- `ReefStorageService` must be unit-tested in isolation before IPC wiring — this keeps Phase 1 verifiable with pure `fs` mocks, no Electron required
- The chokidar fix (Phase 1) must precede all write code (Phase 2) — reversed order causes an infinite generation loop during development that is difficult to diagnose
- The generation write path (Phase 2) must precede the import read path (Phase 3) — valid `.reef/` artifacts must exist before the import flow can be tested end-to-end
- The "Regenerate and Save" UI (Phase 4) is the user-facing completion of the feature; polish it once the underlying write/read roundtrip is solid
- Stale detection and `.gitattributes` automation (Phase 5) are additive; deferring them prevents scope creep on the core milestone while leaving a clear v1.4.x backlog

### Research Flags

Phases with well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1:** Pure Node.js `fs/promises` file I/O — all APIs verified against Node.js 22 docs; atomic write pattern is established; `zod.safeParse()` is fully documented; no novel patterns
- **Phase 2:** IPC wiring follows exact pattern of existing `c4StorageHandlers.ts` in the codebase — no new architectural decisions required
- **Phase 4:** Toolbar button addition is straightforward React; reuses existing `c4-generation:enqueue` IPC path with no modifications

Phases that may benefit from targeted source review during planning:
- **Phase 3:** The "load into SQLite from .reef/" path touches multiple services (`C4StorageService`, LRU cache, state machine). Read `c4StorageService.ts` and `c4StorageHandlers.ts` before implementing the import flow to confirm the `storeDiagram()` + `storeSvg()` call sequence and the state transitions that follow.
- **Phase 5:** `simple-git` `log` API for getting last commit date — verify the exact call signature in the installed v3.28.0 TypeScript types before implementing stale detection; the `--format="%ai"` option needs to be confirmed against the installed library version.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against installed `node_modules/` TypeScript definitions and existing codebase patterns; zero new dependencies confirmed; all API methods verified present in installed versions |
| Features | HIGH | Grounded in direct codebase audit of v1.0–v1.3 source and explicit PROJECT.md scope boundaries; features map directly to existing service APIs |
| Architecture | HIGH | Based on direct analysis of ~40,000 lines of project source code; all integration points identified and verified; SVG pipeline gap is documented with a ranked resolution |
| Pitfalls | HIGH | All critical pitfalls are grounded in specific codebase patterns (chokidar `ignored` regex, `fs.writeFile` non-atomicity, `contextIsolation` Electron model) with referenced external sources; not inferred from generalities |

**Overall confidence:** HIGH

### Gaps to Address

- **`metadata.json` vs per-level `meta.json` schema divergence:** STACK.md proposes a single `metadata.json` per repo; ARCHITECTURE.md proposes per-level `<level>.meta.json` files. Resolve this in Phase 1 before any files are written — per-level `.meta.json` files are recommended because they allow per-level `git log` history and avoid a single-file write contention point during parallel level generation.
- **SVG pipeline gap — confirm Option A:** The architecture identifies three options for where to call `ReefStorageService.writeArtifacts()`. Option A (inside the `c4-storage:store-svg` IPC handler) is recommended. Confirm during Phase 2 that the PlantUML source can be fetched synchronously from SQLite at that point via one indexed SELECT without measurable latency impact.
- **Windows atomic rename behavior:** `fs.rename()` on Windows fails with `EPERM` if the destination file already exists (unlike POSIX where rename atomically overwrites). Phase 1 must include a Windows-specific workaround. Validate in CI on Windows before shipping Phase 1.
- **SVG display security:** Architecture research recommends `<img src="data:image/svg+xml;base64,...">` over `innerHTML`. Confirm the existing `PlantUMLRenderer` component already uses this pattern or plan to update it in Phase 3 when `.reef/` SVGs are first displayed.

---

## Sources

### Primary (HIGH confidence)
- Node.js v22 `fs/promises` API — https://nodejs.org/api/fs.html — `mkdir`, `writeFile`, `readFile`, `access`, `stat`, `readdir` verified available; `rename` atomic on POSIX
- `simple-git` v3.28.0 TypeScript definitions — `/node_modules/simple-git/dist/typings/simple-git.d.ts` — `add()`, `commit()`, `checkIgnore()` verified present in installed package
- `zod` v4.3.6 — https://zod.dev — `z.object()`, `z.literal()`, `z.enum()`, `.safeParse()` verified in installed version
- Reef v1.0–v1.3 codebase direct analysis — `c4StorageService.ts`, `generationQueueService.ts`, `c4StorageHandlers.ts`, `fileWatcherService.ts`, `AddRepositoryModal.tsx`, `preload.ts`, `main.ts` — HIGH confidence; all integration points read from source
- Git `.gitattributes` documentation — https://git-scm.com/docs/gitattributes — SVG binary merge strategy and `linguist-generated` attribute
- Electron security documentation — https://www.electronjs.org/docs/latest/tutorial/security — `contextIsolation`, path traversal patterns in IPC handlers

### Secondary (MEDIUM confidence)
- Structurizr DSL repository patterns — https://docs.structurizr.com/dsl — per-repo workspace file pattern informed `.reef/` folder design approach
- Version Control Your Diagrams (community) — establishes `.puml` + `.svg` file pair convention used in CI workflows
- chokidar npm package — https://www.npmjs.com/package/chokidar — `ignored` function predicate pattern and `awaitWriteFinish` stability threshold
- JSON Schema versioning strategies — https://yokota.blog/2021/03/29/understanding-json-schema-compatibility/ — additive-only schema change guidance; `schemaVersion` field pattern

### Tertiary (context only)
- Swark VS Code extension — https://github.com/swark-io/swark — on-demand-only approach studied as alternative pattern to rule out; no persistence
- GitDiagram — on-demand-only approach; no persistence; confirms Reef's differentiated value of local repo storage
- Managing Large Git Repositories (GitHub Well-Architected) — SVG file bloat prevention in version-controlled repos

---

*Research completed: 2026-03-26*
*Ready for roadmap: yes*
