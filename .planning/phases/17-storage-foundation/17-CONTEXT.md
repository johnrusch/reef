# Phase 17: Storage Foundation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Define the `.reef/` folder contract, build `ReefStorageService` for all file I/O with atomic writes, schema validation, and chokidar exclusion. This phase establishes the storage foundation before any write or read paths are implemented.

**Key architectural shift:** `.reef/` is the source of truth for diagram storage, not SQLite. SQLite will be eliminated in a future milestone. For v1.4, dual-write with `.reef/` authoritative on conflict.

</domain>

<decisions>
## Implementation Decisions

### Folder Structure
- **D-01:** Flat per-level layout for context and container (`.reef/context.puml`, `.reef/context.svg`, `.reef/context.meta.json`, etc.)
- **D-02:** Nested subdirectories for component and code sub-diagrams: `.reef/component/{containerId}/diagram.puml`, `.reef/code/{componentId}/diagram.puml`
- **D-03:** Full folder contract defined in Phase 17 — includes nested sub-diagram structure even though sub-diagram writes may come later
- **D-04:** No root manifest file — `schemaVersion` lives in each `.meta.json` independently (each file is self-contained)
- **D-05:** Unrecognized `schemaVersion` treated as missing — queue regeneration for that level (no warnings, just regenerate)
- **D-06:** `.reef/` directory created lazily on first write, not eagerly on repo add
- **D-07:** Per-level independent writes — each level's files written independently, not as an all-or-nothing batch

### Atomic Write Strategy
- **D-08:** Temp-then-rename pattern: write to `.tmp` suffix, then `fs.rename()` to final path. On Windows EPERM, delete destination first then retry rename
- **D-09:** Individual atomic renames per file (write+rename `.puml`, then `.svg`, then `.meta.json`) — not grouped
- **D-10:** SQLite-first, `.reef/`-second dual-write ordering for v1.4 — `.reef/` write failure is non-fatal

### Chokidar Exclusion
- **D-11:** Extend existing `ignored` function predicate in `FileWatcherService` — add `\.reef[/\\]` to the regex alongside `node_modules`, `.git`, etc.
- **D-12:** No separate `.tmp` file exclusion needed — `.reef/` directory exclusion covers temp files inside it

### .gitattributes Generation
- **D-13:** Created on first `.reef/` write, idempotent (skip if already exists)
- **D-14:** Marks both `*.svg` and `*.puml` as binary to prevent merge conflicts

### Source of Truth Model
- **D-15:** `.reef/` is the authoritative source of truth for diagram artifacts, not SQLite
- **D-16:** SQLite to be eliminated eventually — for v1.4, dual-write with `.reef/` winning on conflict
- **D-17:** Sub-diagrams (component per-container, code per-component) stored in `.reef/`, not SQLite-only

### Claude's Discretion
- Error visibility for `.reef/` write failures (log warning vs toast notification) — Claude decides based on complexity/benefit tradeoff

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Storage Service
- `src/main/services/c4/c4StorageService.ts` — Current SQLite-based storage service (singleton, WAL mode). ReefStorageService will complement/replace this
- `src/main/services/c4/c4StorageHandlers.ts` — IPC handlers for storage operations; write insertion point for `.reef/` writes

### File Watching
- `src/main/services/fileWatcherService.ts` — Chokidar v4 watcher with function predicate `ignored` pattern (line 57). `.reef/` exclusion goes here

### Types
- `src/main/services/c4/types/c4Types.ts` — C4Level type definition
- `src/shared/types/diagramState.ts` — DiagramState and StoredDiagram types

### Requirements
- `.planning/REQUIREMENTS.md` — STOR-01 through STOR-04 requirements for this phase

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `C4StorageService` (`c4StorageService.ts`): Existing SQLite storage — ReefStorageService follows similar service pattern (constructor, registerHandlers)
- `FileWatcherService` (`fileWatcherService.ts`): Chokidar v4 function predicate pattern for ignored paths — extend regex
- `ElementIdRegistry`: Canonical element IDs that will serve as subdirectory names for component/code sub-diagrams

### Established Patterns
- Service classes with `this.registerHandlers()` for IPC exposure
- Singleton pattern for storage services
- `better-sqlite3` with WAL mode for concurrent reads
- PascalCase service files with Service suffix

### Integration Points
- `c4StorageHandlers.ts` `c4-storage:store-svg` handler — where `.reef/` writes will be triggered (Phase 18)
- `FileWatcherService.ignored` predicate — where `.reef/` exclusion is added (this phase)
- `generationQueueService.ts` — background generation that will eventually write to `.reef/`

</code_context>

<specifics>
## Specific Ideas

- Hybrid folder layout: flat for context/container (single diagrams), nested for component/code (multiple sub-diagrams keyed by parent element ID)
- Element IDs from `ElementIdRegistry` serve as directory names for sub-diagrams
- `.gitattributes` content: `*.svg binary` and `*.puml binary`

</specifics>

<deferred>
## Deferred Ideas

- Full SQLite elimination — future milestone after `.reef/` proves stable as source of truth
- Conflict resolution guidance for `.reef/` merge conflicts (TEAM-02 requirement — future release)
- Per-branch `.reef/` variants (ADV-02 — out of scope)

</deferred>

---

*Phase: 17-storage-foundation*
*Context gathered: 2026-03-26*
