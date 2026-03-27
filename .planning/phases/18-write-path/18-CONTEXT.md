# Phase 18: Write Path - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Every successful C4 diagram generation automatically writes PlantUML source, rendered SVG, and source-code hash to `.reef/` — no user action required. This phase hooks the existing generation pipeline to ReefStorageService. Read path, staleness UI, and regeneration are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Write timing
- **D-01:** Per-level incremental writes — `.puml`, `.svg`, and `.meta.json` are written to `.reef/` as soon as each C4 level finishes rendering, not batched after all levels complete
- **D-02:** Partial writes are kept on failure — if a later level (e.g., component) errors out, already-written files for earlier levels (context, container) remain in `.reef/`

### Source hash scope
- **D-03:** Hash only the files the C4 static analyzer actually read for that level — not all repo files, not a git tree hash
- **D-04:** The analyzer already tracks which files it reads; this list feeds the hash computation for `.meta.json`

### SVG write pipeline
- **D-05:** Piggyback on the existing `c4Storage.storeSvg()` IPC flow — after the renderer renders SVG and sends it to main via `storeSvg`, extend the handler in `c4StorageHandlers.ts` to also write to `.reef/` via ReefStorageService
- **D-06:** No new IPC channels needed — the existing `storeSvg` handler already receives the SVG string, repository path, and level info

### Carried from Phase 17
- **D-07:** Flat layout for context/container levels, nested for component/code (17-D-01/D-02)
- **D-08:** `.reef/` directory created lazily on first write (17-D-06)
- **D-09:** Atomic temp-then-rename per file, sequential within a level (17-D-08/D-09)
- **D-10:** SQLite-first, `.reef/`-second — `.reef/` write failure is non-fatal (17-D-10)
- **D-11:** `.gitattributes` auto-generated with SVG+PUML marked as binary (17-D-13/D-14)

### Claude's Discretion
- Error visibility for `.reef/` write failures (log warning vs toast notification) — carried from Phase 17
- Exact hash algorithm (SHA-256 recommended but Claude decides)
- How to collect the analyzed file list from the analyzer (callback, return value, or shared state)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The key insight is that the write path should be invisible to the user: diagrams generate as before, and `.reef/` files appear as a side effect.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Storage service (Phase 17 foundation)
- `.planning/phases/17-storage-foundation/17-CONTEXT.md` — All storage layout decisions, atomic write strategy, `.gitattributes` policy
- `src/main/services/reef/reefStorageService.ts` — ReefStorageService implementation with `writeLevelFiles` and `writeSubDiagramFiles` methods

### Generation pipeline (write insertion points)
- `src/main/services/c4/c4StorageHandlers.ts` — IPC handlers for `storeSvg` and `storeDiagram` — the primary insertion point for `.reef/` writes
- `src/main/services/c4/generationQueueService.ts` — Queue-based generation orchestrator, processes levels sequentially
- `src/main/services/c4/c4AnalyzerService.ts` — Static analyzer that produces PlantUML; tracks which source files were analyzed

### Renderer SVG flow
- `src/renderer/components/PlantUMLRenderer.tsx` — Renders PlantUML to SVG (Java or server), calls `onSvgGenerated` callback
- `src/renderer/components/tabs/VisualMapTab.tsx` — `handleSvgGenerated` (line ~196) sends SVG to main via `c4Storage.storeSvg()`

### Requirements
- `.planning/REQUIREMENTS.md` §Write Path — WRITE-01 (auto-write artifacts) and WRITE-02 (source hash in metadata)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ReefStorageService.writeLevelFiles()` — Already writes `.puml`, `.svg`, `.meta.json` atomically for a level; just needs to be called from the pipeline
- `ReefStorageService.writeSubDiagramFiles()` — Handles component/code nested sub-diagrams
- `c4StorageHandlers.storeSvg` handler — Already receives repository path, level, SVG string, and optional elementId via IPC

### Established Patterns
- IPC handler pattern in `c4StorageHandlers.ts` — all C4 storage flows go through this module
- Generation queue processes levels one at a time — aligns with per-level incremental write decision
- Analyzer results include file lists in the analysis metadata

### Integration Points
- `c4StorageHandlers.ts` `storeSvg` handler — extend to call `ReefStorageService.writeLevelFiles()` after SQLite write succeeds
- `c4StorageHandlers.ts` `storeDiagram` handler — has access to PlantUML source and analysis metadata (including source file list for hashing)
- May need to coordinate between `storeDiagram` (has puml + file list) and `storeSvg` (has SVG) since they're called at different times — storeSvg should trigger the `.reef/` write using puml already stored in SQLite

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-write-path*
*Context gathered: 2026-03-27*
