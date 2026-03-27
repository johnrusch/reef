# Phase 20: Regeneration and Stale Detection - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can explicitly refresh stored diagrams after code changes and see a clear indicator when `.reef/` data is older than recent commits. This phase wires stale detection into the existing file-watching pipeline and connects the existing Regenerate button to a flow that only regenerates stale levels and auto-writes results to `.reef/`.

</domain>

<decisions>
## Implementation Decisions

### Stale Detection Trigger
- **D-01:** Staleness checked on file change events (chokidar) — real-time awareness, user sees "Outdated" as soon as they save a file
- **D-02:** Per-level staleness — each C4 level has its own sourceHash in `.meta.json`, so a change to a deep utility file might make Code stale but not Context
- **D-03:** Hash-based comparison — recompute `computeSourceHash()` for affected levels when files change, compare against stored `.meta.json` sourceHash
- **D-04:** Debounce staleness checks 2-3 seconds — wait for file changes to settle before recomputing hashes (prevents thrashing during branch switches)

### Regenerate-and-Save Flow
- **D-05:** Regenerate all stale levels in one click — aligns with existing "Generate All Diagrams" pattern from v1.3
- **D-06:** Keep confirmation dialog — regeneration triggers AI API calls (costs money); existing dialog already in place, update text to show stale level count
- **D-07:** Auto-write to `.reef/` — Phase 18 write-through already saves to `.reef/` on every generation; no new save code needed
- **D-08:** Skip fresh levels during regeneration — only regenerate levels whose sourceHash doesn't match current files; saves API costs

### Stale Indicator UX
- **D-09:** Diagram overlay badge only — StalenessBadge (yellow "Outdated" badge) on the diagram viewer; no sidebar tree markers or toolbar icons
- **D-10:** Clicking StalenessBadge triggers regeneration directly — opens confirmation dialog, then regenerates stale levels; existing onClick handler already wired
- **D-11:** Badge text stays simple "Outdated" — no level counts or level names in the badge

### Post-Regeneration Feedback
- **D-12:** Toast + auto-refresh viewer on completion — toast: "Regenerated N levels — .reef/ updated"; viewer auto-refreshes to show new SVG; badge disappears
- **D-13:** Badge changes to "Regenerating..." during progress — existing StalenessBadge `isRegenerating` state with spinning icon; toolbar Regenerate button also shows spinner
- **D-14:** Partial failure is non-blocking — error toast for failed levels ("Failed to regenerate Container level"), badge stays for failed levels, successfully regenerated levels update normally

### Carried from Prior Phases
- **D-15:** Atomic temp-then-rename per file, sequential within a level (Phase 17 D-08/D-09)
- **D-16:** `.reef/` write is non-fatal; SQLite remains operational (Phase 17 D-10)
- **D-17:** Source hash computed from files the analyzer actually read for that level (Phase 18 D-03/D-04)
- **D-18:** `computeSourceHash()` already exists in `sourceHashService.ts` (Phase 18)

### Claude's Discretion
- Exact debounce timing within the 2-3 second range
- How to map file change events to affected C4 levels for per-level staleness checking
- Whether to use the existing `ChangeTrackingService` file-to-element mapping or build a simpler file-to-level mapping

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Stale detection infrastructure
- `src/main/services/reef/sourceHashService.ts` — `computeSourceHash()` function for hashing analyzed source files
- `src/main/services/reef/reefStorageTypes.ts` — `ReefMetaSchema` with `sourceHash` field in `.meta.json`
- `src/main/services/reef/reefStorageService.ts` — `readMeta()` for reading stored `.meta.json` data
- `src/main/services/fileWatcherService.ts` — Chokidar v4 file watcher with `.reef/` exclusion; triggers change events
- `src/main/services/changeTrackingService.ts` — Existing file-to-element change mapping (may inform file-to-level mapping)

### Diagram viewer and controls
- `src/renderer/components/DiagramViewer/DiagramControls.tsx` — Existing Regenerate button with confirmation dialog
- `src/renderer/components/DiagramViewer/StalenessBadge.tsx` — Yellow "Outdated" badge with `isStale`/`isRegenerating` states
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` — Main viewer component
- `src/renderer/components/DiagramViewer/DiagramPanel.tsx` — Panel containing diagram display

### State management
- `src/renderer/stores/diagramStateStore.ts` — Tracks diagram states including `stale` state
- `src/shared/types/diagramState.ts` — DiagramState type definitions

### Generation pipeline (regeneration path)
- `src/main/services/c4/c4StorageHandlers.ts` — IPC handlers including `writeReefArtifacts`; write-through to `.reef/`
- `src/main/services/c4/generationQueueService.ts` — Background generation queue for level processing
- `src/renderer/components/tabs/VisualMapTab.tsx` — SVG fast path and generation trigger

### Prior phase context
- `.planning/phases/17-storage-foundation/17-CONTEXT.md` — Storage layout, atomic writes, chokidar exclusion
- `.planning/phases/18-write-path/18-CONTEXT.md` — Write timing, source hash scope, SVG pipeline
- `.planning/phases/19-read-path/19-CONTEXT.md` — Import flow, LRU cache population

### Requirements
- `.planning/REQUIREMENTS.md` — REGEN-01 (manual regenerate-and-save) and REGEN-02 (stale indicator)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeSourceHash()` in `sourceHashService.ts` — Already computes SHA-256 hash of analyzed file paths; direct reuse for staleness comparison
- `StalenessBadge` component — Already renders yellow "Outdated" badge with `isStale` and `isRegenerating` prop states
- `DiagramControls` — Existing Regenerate button with confirmation dialog; extend to show stale level count
- `diagramStateStore` — Already tracks `stale` diagram state; wire to per-level staleness results
- `generationQueueService` — Background queue for level generation; reuse for selective stale-level regeneration
- `writeReefArtifacts()` in `c4StorageHandlers.ts` — Existing write-through from Phase 18; regeneration output auto-saves

### Established Patterns
- IPC handler pattern in `c4StorageHandlers.ts` — all C4 storage flows go through this module
- Chokidar change events → `ChangeTrackingService` → UI state updates (existing change detection pipeline)
- Toast notifications for async completion (Phase 19 pattern)
- Background generation queue with per-level progress tracking

### Integration Points
- `FileWatcherService` change events → new staleness check service (debounced hash comparison)
- `diagramStateStore` → `StalenessBadge` → confirmation dialog → `generationQueueService` (regeneration trigger)
- `generationQueueService` completion → toast notification + viewer refresh + badge state update

</code_context>

<specifics>
## Specific Ideas

- Staleness check flow: file change → debounce 2-3s → recompute sourceHash for affected levels → compare against `.meta.json` → update diagramStateStore `stale` flag per level
- Regeneration flow: user clicks badge/button → confirmation dialog ("Regenerate N stale levels?") → enqueue only stale levels to generationQueueService → Phase 18 write-through handles `.reef/` → toast on completion → viewer refreshes → badge disappears
- The `analyzedFilePathsCache` from Phase 18 (module-level Map keyed by repoPath:level:elementId) can inform which files map to which levels for per-level staleness

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-regeneration-and-stale-detection*
*Context gathered: 2026-03-27*
