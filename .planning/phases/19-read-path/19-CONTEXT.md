# Phase 19: Read Path - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Load existing `.reef/` artifacts on repo import so diagrams display instantly without AI regeneration or PlantUML rendering. When a repo is added with `.reef/` data, the app detects it, imports into SQLite, and skips the generation prompt. Partial `.reef/` folders get available levels imported and missing levels auto-queued.

</domain>

<decisions>
## Implementation Decisions

### Detection & Import Flow
- **D-01:** Check for `.reef/` during the AddRepositoryModal flow (on repo add), before the generation prompt decision
- **D-02:** Import `.reef/` data into SQLite during repo add — after import, the existing `getSvg` fast path works unchanged
- **D-03:** Import is async/background — modal closes immediately, import happens in background. Diagrams appear as they're loaded

### SVG Loading Strategy
- **D-04:** Full import — store `.puml` source, SVG, and metadata from `.meta.json` into SQLite. Enables Phase 20 regeneration from stored source
- **D-05:** After SQLite import, also populate the 15-entry in-process LRU cache so first diagram view is truly instant (no SQLite read needed)

### Partial .reef/ Handling
- **D-06:** A level is importable if it has an `.svg` file. Missing `.meta.json` and `.puml` are acceptable — diagram can still display without them
- **D-07:** After importing available levels, automatically enqueue generation for any levels without SVGs. User sees available diagrams immediately, missing ones generate in background
- **D-08:** No visual distinction between imported and freshly generated levels in the sidebar — the source doesn't matter to the user

### Generation Prompt UX
- **D-09:** When `.reef/` has complete diagrams (all top-level C4 levels), skip the generation prompt entirely. Show a toast: "Loaded diagrams from .reef/"
- **D-10:** When `.reef/` has partial diagrams, show a toast: "Loaded N diagrams from .reef/, generating N missing levels..." and auto-queue missing levels
- **D-11:** When `.reef/` exists but is empty or all data is invalid/corrupt, fall through to the normal generation prompt as if `.reef/` doesn't exist

### Carried from Prior Phases
- **D-12:** Flat layout for context/container, nested for component/code (Phase 17 D-01/D-02)
- **D-13:** Unrecognized schemaVersion treated as missing — queue regeneration (Phase 17 D-05)
- **D-14:** `.reef/` is the authoritative source of truth, not SQLite (Phase 17 D-15)

### Claude's Discretion
- Read method implementation details (how to scan `.reef/` directory structure)
- IPC channel design for the import flow (new channel vs extending existing)
- Error handling granularity during import (per-file vs per-level error boundaries)
- Toast notification wording and timing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Storage service (Phase 17 foundation)
- `.planning/phases/17-storage-foundation/17-CONTEXT.md` — All storage layout decisions, atomic write strategy, folder structure
- `src/main/services/reef/reefStorageService.ts` — ReefStorageService with `writeLevelFiles`, `writeSubDiagramFiles`, and `readMeta` methods
- `src/main/services/reef/reefStorageTypes.ts` — `REEF_DIR` constant, `ReefMetaSchema`, `FlatLevel`, `NestedLevel` types

### Write path (Phase 18 — what gets written)
- `.planning/phases/18-write-path/18-CONTEXT.md` — Write timing, source hash scope, SVG write pipeline decisions
- `src/main/services/c4/c4StorageHandlers.ts` — IPC handlers including `writeReefArtifacts` function and `storeSvg`/`storeDiagram` handlers

### Diagram display (viewer fast path)
- `src/renderer/components/tabs/VisualMapTab.tsx` lines 49-81 — Existing SVG fast path: checks `getSvg()` from SQLite, falls back to PlantUML source
- `src/main/services/c4/c4StorageService.ts` — SQLite storage with `getSvg`, `storeSvg`, `storeDiagram` methods and LRU cache

### Repo add flow (insertion point)
- `src/renderer/components/AddRepositoryModal.tsx` lines 72-114 — `handleAddRepository` flow with `autoGenerateOnRepoAdd` setting check
- `src/renderer/stores/repositoryStore.ts` — `addRepository` action

### Generation queue
- `src/main/services/c4/generationQueueService.ts` — Background generation queue for missing levels

### Requirements
- `.planning/REQUIREMENTS.md` §Read Path — READ-01 (import with .reef/), READ-02 (instant SVG display), READ-03 (partial .reef/ handling)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ReefStorageService.readMeta()` — Already reads and validates `.meta.json` with Zod schema parsing. Can be extended to read SVG and PUML files
- `C4StorageService.getSvg()` / `storeSvg()` — SQLite SVG storage with LRU cache. Import target for `.reef/` data
- `C4StorageService.storeDiagram()` — Stores PlantUML source + metadata in SQLite. Import target for `.puml` data
- `VisualMapTab` SVG fast path — Already checks SQLite for cached SVG before rendering. After import, this path serves `.reef/` data automatically
- `generationQueueService.enqueue()` — Background generation queue. Can queue missing levels after partial import

### Established Patterns
- IPC handler pattern in `c4StorageHandlers.ts` — all C4 storage flows go through this module
- `autoGenerateOnRepoAdd` setting in `AddRepositoryModal` — existing decision point where `.reef/` detection hooks in
- Toast notifications for generation completion — reuse pattern for import notifications
- Async background operations via generation queue

### Integration Points
- `AddRepositoryModal.handleAddRepository()` — Insert `.reef/` detection before the `autoGenerateOnRepoAdd` check
- `C4StorageService` — Import target for SVG, PUML, and metadata from `.reef/` files
- `generationQueueService` — Queue missing levels after partial import
- Preload API — May need new IPC channel for `.reef/` scan/import

</code_context>

<specifics>
## Specific Ideas

- Import flow: scan `.reef/` directory → for each level with an SVG → read files → write to SQLite via existing `storeSvg`/`storeDiagram` → populate LRU cache
- Toast patterns: "Loaded diagrams from .reef/" (complete), "Loaded N diagrams from .reef/, generating N missing levels..." (partial)
- The AddRepositoryModal already has a branching flow based on `autoGenerateOnRepoAdd` setting — the `.reef/` check should be a new branch that runs before that check

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-read-path*
*Context gathered: 2026-03-27*
