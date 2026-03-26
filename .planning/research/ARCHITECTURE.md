# Architecture Research

**Domain:** Repo-Stored C4 Diagram Artifacts — Electron Desktop App (v1.4)
**Researched:** 2026-03-26
**Confidence:** HIGH (based on direct codebase analysis of ~40,000 lines)

## Standard Architecture

### System Overview (v1.4 target state)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MAIN PROCESS (Node.js)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              C4 GENERATION PIPELINE (unchanged)                │  │
│  │  ┌──────────────┐   ┌───────────────┐   ┌──────────────────┐  │  │
│  │  │ Static       │──▶│ AI Enrichment │──▶│ PlantUML         │  │  │
│  │  │ Analyzer     │   │ Service       │   │ Generator        │  │  │
│  │  │ (ts-morph)   │   │ (Claude API)  │   │ (syntax gen)     │  │  │
│  │  └──────────────┘   └──────────────┘   └────────┬─────────┘  │  │
│  └───────────────────────────────────────────────────┼───────────┘  │
│                                                       │              │
│  ┌────────────────────────────────────────────────────▼───────────┐  │
│  │                 C4AnalyzerService (modified)                    │  │
│  │  storeDiagram() → C4StorageService (SQLite) [existing]         │  │
│  │  writeArtifacts() → ReefStorageService (.reef/ files) [NEW]    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────┐  ┌────────────────────────────────────┐   │
│  │ ReefStorageService   │  │ C4StorageService (existing)        │   │
│  │ [NEW]                │  │ - SQLite WAL mode                  │   │
│  │ - read .reef/        │  │ - diagram_storage table            │   │
│  │ - write .reef/       │  │ - svg_content column               │   │
│  │ - detect presence    │  │ - change_tracking table            │   │
│  │ - validate schema    │  │                                    │   │
│  └──────────┬───────────┘  └──────────────────┬─────────────────┘   │
│             │                                 │                     │
│  ┌──────────▼───────────────────────────────── ▼──────────────────┐  │
│  │               IPC HANDLERS (preload bridge)                    │  │
│  │  c4-storage:*  c4-generation:*  reef-storage:*  [NEW channel]  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────┘
                                       │ IPC (contextBridge)
┌──────────────────────────────────────▼──────────────────────────────┐
│                        RENDERER PROCESS (React)                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  AddRepositoryModal (modified)               │    │
│  │  1. repo selected → 2. check .reef/ exists [NEW step]       │    │
│  │  3a. .reef/ found → load from files, skip generation        │    │
│  │  3b. .reef/ absent → show generation prompt (existing)      │    │
│  └──────────────────────────────────┬──────────────────────────┘    │
│                                     │                                │
│  ┌──────────────────────────────────▼──────────────────────────┐    │
│  │              DiagramViewer / VisualMapTab (unchanged)        │    │
│  │              PlantUMLRenderer (unchanged)                    │    │
│  │              C4HierarchyTree sidebar (unchanged)             │    │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  ZUSTAND STORES                                               │   │
│  │  repositoryStore (unchanged)                                  │   │
│  │  diagramStateStore (unchanged)                                │   │
│  │  generationQueueStore (unchanged)                             │   │
│  └───────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

REPOSITORY FILE SYSTEM (on disk, version-controlled)
┌─────────────────────────────────────────────────────────────────────┐
│  <repo-root>/                                                        │
│  ├── .reef/                                                          │
│  │   ├── context.puml        PlantUML source (context level)        │
│  │   ├── context.svg         Pre-rendered SVG                        │
│  │   ├── context.meta.json   AI enrichment metadata + generation info│
│  │   ├── container.puml                                              │
│  │   ├── container.svg                                               │
│  │   ├── container.meta.json                                         │
│  │   ├── component.<id>.puml  Per-container component diagrams       │
│  │   ├── component.<id>.svg                                          │
│  │   ├── component.<id>.meta.json                                    │
│  │   ├── code.<id>.puml       Per-component code diagrams (optional) │
│  │   ├── code.<id>.svg                                               │
│  │   └── code.<id>.meta.json                                         │
│  └── src/                                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `C4AnalyzerService` | Orchestrates generation pipeline; calls ReefStorageService after SQLite write | Modified |
| `ReefStorageService` | Reads/writes .reef/ folder; file naming, schema validation, atomic writes | New |
| `ReefStorageHandlers` | IPC handlers for `reef-storage:*` channel | New |
| `C4StorageService` | SQLite persistence for app-local state; unchanged role | Unchanged |
| `generationQueueService` | Background queue; calls reef write after each level completes | Modified |
| `FileWatcherService` | Must exclude `.reef/` from change detection to prevent regeneration loop | Modified |
| `AddRepositoryModal` | Check `.reef/` on repo add; branch into load-from-file vs generate prompt | Modified |
| `preload.ts` | Expose `reef-storage:*` IPC channel to renderer | Modified |

## .reef/ Folder Schema

### File Naming Convention

```
context.puml                   — context level PlantUML source
context.svg                    — context level rendered SVG
context.meta.json              — context level metadata

container.puml
container.svg
container.meta.json

component.<elementId>.puml     — per-container component diagram
component.<elementId>.svg
component.<elementId>.meta.json

code.<elementId>.puml          — per-component code diagram
code.<elementId>.svg
code.<elementId>.meta.json
```

`<elementId>` matches the sanitized IDs produced by `ElementIdRegistry.sanitizeId()` — the same IDs used for SQLite keys and SVG click detection. Reusing this ID system ensures consistency without a new naming scheme.

### meta.json Schema

```json
{
  "version": "1",
  "level": "context",
  "elementId": null,
  "generatedAt": "2026-03-26T10:00:00.000Z",
  "modelUsed": "claude-haiku-20240307",
  "promptVersion": "1.0",
  "reefVersion": "1.4.0",
  "tokensUsed": 12400,
  "analysisMetadata": {
    "filesAnalyzed": 42,
    "totalFiles": 55,
    "coveragePercent": 76
  }
}
```

The `analysisMetadata` block is derived from the `AnalysisResult.metadata` object already produced by `StaticAnalyzerService`. No new analysis is needed.

## Recommended Project Structure (new files)

```
src/main/services/
├── c4/
│   ├── c4AnalyzerService.ts        (modified — call ReefStorageService)
│   ├── c4StorageService.ts         (unchanged)
│   ├── c4StorageHandlers.ts        (unchanged)
│   ├── c4PlantUMLGenerator.ts      (unchanged)
│   ├── generationQueueService.ts   (modified — call reef write after each level)
│   ├── reefStorageService.ts       [NEW] core read/write logic
│   └── reefStorageHandlers.ts      [NEW] IPC registration for reef-storage:*

src/main/services/
├── fileWatcherService.ts           (modified — exclude .reef/ from watched paths)

src/renderer/components/
├── AddRepositoryModal.tsx          (modified — .reef/ detection branch)
```

## Architectural Patterns

### Pattern 1: Dual-Write After Generation

After each level completes generation, the pipeline writes to two destinations sequentially: SQLite first (existing path, fast, reliable), then `.reef/` files second (new path, may fail gracefully).

**What:** Write SQLite entry, then write `.reef/` files in the same post-generation step.
**When to use:** Any time a diagram is generated or regenerated.
**Trade-offs:** If the `.reef/` write fails (disk full, permissions), SQLite still has the data so the app continues working. The failure is logged and surfaced to the user without blocking the generation.

```typescript
// In generationQueueService.ts — after each level:
await analyzer.generateC4Diagram(repoPath, level);  // writes SQLite internally
await reefStorage.writeDiagramArtifacts(repoPath, level, {
  plantUML: result.diagram,
  svg: renderedSvg,
  metadata: buildMetadata(result),
});
```

### Pattern 2: Read-First on Repo Import

When a repository is added, check for `.reef/` before triggering the generation prompt. If valid artifacts exist, load them into SQLite and skip generation entirely.

**What:** `reef-storage:check-exists` IPC call in `AddRepositoryModal` between step "repo validated" and step "show generation prompt".
**When to use:** Every repo add, whether manual or first-time.
**Trade-offs:** Adds ~5ms async check per repo add (filesystem stat). Eliminates multi-second generation for repos that already have `.reef/` artifacts from teammates.

```typescript
// In AddRepositoryModal.tsx — modified handleAddRepository:
const reefCheck = await window.reef.reefStorage.checkExists(selectedPath);
if (reefCheck.hasArtifacts) {
  await window.reef.reefStorage.loadIntoSqlite(selectedPath);
  onClose();
} else {
  // Existing flow: show generation prompt
  setShowGenerationPrompt(true);
}
```

### Pattern 3: .reef/ Exclusion from File Watching

`FileWatcherService` must explicitly skip the `.reef/` directory, or any SVG/PUML write to `.reef/` would trigger "diagram stale" state — an infinite regeneration loop.

**What:** Add `.reef` to the chokidar `ignored` predicate in `fileWatcherService.ts`.
**When to use:** Always — this is a correctness fix, not an optimization.

```typescript
// In fileWatcherService.ts — existing ignored predicate:
ignored: (filePath: string) =>
  /node_modules|\.git[/\\]|[/\\]dist[/\\]|dist-electron|\.cache|[/\\]build[/\\]|[/\\]coverage[/\\]|[/\\]\.reef[/\\]/.test(filePath),
```

### Pattern 4: Atomic File Writes

Write `.reef/` files atomically by writing to `.reef/<file>.tmp` first, then renaming. This prevents partially-written files from being read by a teammate's Reef instance.

**What:** `fs.writeFileSync(tmpPath)` then `fs.renameSync(tmpPath, finalPath)` for each artifact.
**When to use:** Every `.reef/` write.
**Trade-offs:** Two syscalls instead of one. Rename is atomic on POSIX; on Windows it may fail if destination exists — use `fs.rmSync` before rename on Windows.

## Data Flow

### Flow 1: First-Time Generation (no .reef/ present)

```
User selects directory
    ↓
AddRepositoryModal: git validate → addRepository()
    ↓
reef-storage:check-exists → .reef/ absent → show GenerationPromptModal
    ↓
User clicks "Generate"
    ↓
c4-generation:enqueue (IPC) → generationQueueService
    ↓
For each level (context→container→component→code):
  C4AnalyzerService.generateC4Diagram()
    ├─ Phase 1: StaticAnalyzerService (ts-morph)
    ├─ Phase 2: AIEnricherService (Claude API)
    └─ Phase 3: C4PlantUMLGenerator
         ↓
  C4StorageService.storeDiagram()        → SQLite (diagram_content)
         ↓
  PlantUMLService.generateSVG()          → rendered SVG string
         ↓
  C4StorageService.storeSvg()            → SQLite (svg_content)
  svgLruCache.set()                      → in-process LRU
         ↓
  ReefStorageService.writeDiagramArtifacts() → .reef/ files (puml + svg + meta.json)
         ↓
  IPC broadcast: c4-storage:state-changed (state: 'fresh')
    ↓
Renderer: diagramStateStore updates, DiagramViewer fetches SVG from LRU/SQLite
```

### Flow 2: Repo Import with Existing .reef/ (teammate sharing)

```
User selects directory (teammate's repo with .reef/)
    ↓
AddRepositoryModal: git validate → addRepository()
    ↓
reef-storage:check-exists → .reef/ present + valid schema
    ↓
reef-storage:load-into-sqlite (IPC)
    ↓
ReefStorageService.loadArtifacts()
  ├─ For each artifact: read .puml, .svg, .meta.json
  └─ C4StorageService.storeDiagram() + storeSvg() for each
    ↓
svgLruCache populated from loaded SVGs
    ↓
IPC broadcast: c4-storage:state-changed (state: 'fresh') for each level
    ↓
AddRepositoryModal closes — no generation prompt shown
    ↓
DiagramViewer fetches SVG instantly from LRU cache
```

### Flow 3: Manual Regenerate-and-Save

```
User clicks "Regenerate" button (existing toolbar)
    ↓
c4-generation:enqueue (existing flow)
    ↓
GenerationQueueService runs full pipeline (same as Flow 1)
    ↓
ReefStorageService.writeDiagramArtifacts() overwrites existing .reef/ files
    ↓
User can git commit .reef/ changes to share updated diagrams with team
```

### Flow 4: Stale State (code changed, .reef/ now outdated)

```
FileWatcherService detects source file change (NOT .reef/)
    ↓
ChangeTrackingService.recordChange()
    ↓
C4StorageService.updateState('stale')
    ↓
IPC broadcast → diagramStateStore → "stale" badge in UI
    ↓
.reef/ files remain on disk (stale but present — team members still see last good diagrams)
    ↓
User clicks "Regenerate" → Flow 3 runs → .reef/ updated to fresh
```

### State Management

```
diagramStateStore (Zustand)
  ↓ (subscribes)
DiagramViewer, C4HierarchyTree ← (actions) → IPC calls → Main Process
```

No new Zustand store is needed. The existing `diagramStateStore` already tracks state per repo+level. The `reefStorage` check result is ephemeral to the import flow and does not need global state.

## Integration Points

### Modified Components

| Component | Change | Risk |
|-----------|--------|------|
| `c4AnalyzerService.ts` | Call `ReefStorageService.writeDiagramArtifacts()` after `storeDiagram()` | LOW — additive, fallback on error |
| `generationQueueService.ts` | Pass rendered SVG to reef write step; SVG is currently available in handler | MEDIUM — must extract SVG from pipeline |
| `fileWatcherService.ts` | Add `\.reef` to ignored predicate | LOW — one-line regex change |
| `AddRepositoryModal.tsx` | Add `.reef/` check before showing generation prompt | LOW — new branch, existing flow unchanged |
| `preload.ts` | Add `reefStorage` namespace with 4 methods | LOW — additive |
| `main.ts` | Import and register `reefStorageHandlers` | LOW — follows existing pattern |

### New Components

| Component | Purpose | Notes |
|-----------|---------|-------|
| `reefStorageService.ts` | Core read/write/validate logic for `.reef/` folder | No new npm deps; uses built-in `fs`, `path` |
| `reefStorageHandlers.ts` | IPC registration; follows exact pattern of `c4StorageHandlers.ts` | Exposes 4 channels: check-exists, load-into-sqlite, write-artifacts, clear |

### IPC Channels (new)

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `reef-storage:check-exists` | Renderer→Main | Does `.reef/` exist and have valid artifacts? |
| `reef-storage:load-into-sqlite` | Renderer→Main | Read `.reef/` files, populate SQLite + LRU |
| `reef-storage:write-artifacts` | Main internal | Write generation output to `.reef/` (not exposed to renderer) |
| `reef-storage:clear` | Renderer→Main | Delete `.reef/` folder (for "reset" workflows) |

`write-artifacts` does not need an IPC channel — it is called directly by `generationQueueService` and `c4AnalyzerService` in the main process. Only the renderer-triggered operations need IPC exposure.

### SVG Pipeline Gap (critical)

Currently, the SVG rendering step occurs in `plantUmlService.ts` and the result is stored via `c4-storage:store-svg` IPC — which means the SVG is available in the handler context in `c4StorageHandlers.ts`, but not inside `c4AnalyzerService.ts` where the PlantUML string is produced. For v1.4, the SVG must be available at the point where `.reef/` files are written.

**Resolution options (ranked by risk):**

1. **Option A (recommended):** Write `.reef/` at the `c4-storage:store-svg` IPC handler in `c4StorageHandlers.ts` — the handler already has the SVG string and knows the repo+level+elementId key. Call `ReefStorageService.writeSvg()` here. The PlantUML source must also be passed through or fetched from SQLite at that point.

2. **Option B:** Return the rendered SVG from `generateC4Diagram()` and write artifacts in `generationQueueService` after the level completes. Requires threading SVG through `DiagramResult` (adds one field) or fetching from SQLite immediately after store.

3. **Option C:** Separate "write .reef/" IPC call triggered after `store-svg` returns. Adds network round-trip complexity without benefit.

**Recommendation: Option A.** The `c4-storage:store-svg` handler is the correct write point — it already has both repo+level key and the SVG content. Fetching the PlantUML source from SQLite at that moment adds one SELECT query (already indexed), is safe, and avoids threading new parameters through the generation pipeline.

## Suggested Build Order (considering dependencies)

### Phase 1: ReefStorageService (no dependencies)

Build the new service first, in isolation. No IPC, no UI changes.

- Create `reefStorageService.ts` with: `checkExists()`, `readArtifacts()`, `writeArtifacts()`, `writeSvg()`, `buildMetaJson()`, atomic write helpers
- Unit-testable with just `fs` mocks
- Validates: file naming, meta.json schema, partial artifact detection

**Deliverable:** Fully tested service class with no external dependencies.

### Phase 2: ReefStorageHandlers + preload.ts (depends on Phase 1)

Wire the service into IPC.

- Create `reefStorageHandlers.ts` registering `reef-storage:check-exists` and `reef-storage:load-into-sqlite`
- Modify `preload.ts` to expose `reefStorage` namespace
- Modify `main.ts` to call `registerReefStorageHandlers()`
- `load-into-sqlite` calls `ReefStorageService.readArtifacts()` then `C4StorageService.storeDiagram()` + `storeSvg()` for each artifact

**Deliverable:** IPC surface working, testable end-to-end with a real `.reef/` folder.

### Phase 3: FileWatcherService fix (no dependencies, low risk)

- One-line regex change to exclude `.reef/` from chokidar watched paths
- Must be done before Phase 4 or the first generated `.reef/` write will mark diagrams as stale

**Deliverable:** No regeneration loop when `.reef/` files are written.

### Phase 4: Generation pipeline write (depends on Phase 1, Phase 3)

Wire `ReefStorageService.writeSvg()` into the `c4-storage:store-svg` IPC handler in `c4StorageHandlers.ts`.

- After `getStorageService().storeSvg()` succeeds, fetch the PlantUML source from SQLite via `getStorageService().getDiagram()` (synchronous SQLite call, < 1ms)
- Call `reefStorage.writeArtifacts({ plantUML: diagram.diagramContent, svg, metadata })` — atomic write
- Error in `.reef/` write is logged but does not throw (SQLite already has the data)

**Deliverable:** Every successful generation automatically creates/updates `.reef/` artifacts.

### Phase 5: AddRepositoryModal integration (depends on Phase 2)

- Add `reef-storage:check-exists` call immediately after `addRepository()` succeeds
- Branch: `hasArtifacts=true` → call `reef-storage:load-into-sqlite` → close modal
- Branch: `hasArtifacts=false` → existing generation prompt flow
- Update `GenerationPromptModal` skip text to clarify ".reef/ not found"

**Deliverable:** Import flow complete. Team sharing works end-to-end.

## Anti-Patterns

### Anti-Pattern 1: Watching .reef/ for Changes

**What people do:** Forget to exclude `.reef/` from chokidar watchers.
**Why it's wrong:** Every SVG write to `.reef/` fires a change event which calls `updateState('stale')` — the UI immediately shows diagrams as stale right after generation completes. This creates an infinite "generate → stale → generate" loop if auto-regenerate is enabled.
**Do this instead:** Add `[/\\]\.reef[/\\]` to the `ignored` predicate in `fileWatcherService.ts` before wiring up Phase 4.

### Anti-Pattern 2: Loading .reef/ into LRU Only (Skipping SQLite)

**What people do:** On repo import with existing `.reef/`, skip the SQLite write and read SVG from files directly at render time.
**Why it's wrong:** The rest of the app (DiagramViewer, state tracking, change tracking, LRU cache) reads from SQLite. Bypassing SQLite means state is inconsistent — diagrams appear "never_generated" to the state machine even though they display correctly.
**Do this instead:** Always load `.reef/` artifacts into SQLite on import. SQLite is the app's source of truth for state; `.reef/` is the transport layer.

### Anti-Pattern 3: Partial Write on Failure

**What people do:** Write `context.puml` and `context.svg` but fail before writing `context.meta.json`, leaving a partial artifact set.
**Why it's wrong:** On next repo import, `checkExists()` finds `.puml` files and skips generation, but loading fails due to missing metadata.
**Do this instead:** Validate presence of all three files (puml + svg + meta.json) in `checkExists()`. Write atomically using tmp-rename. If any write fails, clean up the partial set for that level.

### Anti-Pattern 4: Hardcoding .reef File Names

**What people do:** Use string literals like `"context.svg"` scattered across handlers and the service.
**Why it's wrong:** ElementId-keyed filenames for component/code levels need consistent derivation. Duplicating naming logic creates sync bugs when IDs change.
**Do this instead:** Centralize all filename derivation in `ReefStorageService.getFilePaths(level, elementId)` — one method, one source of truth for all callers.

## Scaling Considerations

This is a local desktop app. "Scale" means handling large repositories and many C4 levels gracefully.

| Concern | Approach |
|---------|----------|
| Many component diagrams | File system handles hundreds of `component.<id>.{puml,svg,meta.json}` files without issue. SQLite index on `(repo_path, level)` already efficient. |
| Large SVG files | SVGs from PlantUML are typically 50-200KB per diagram. Atomic rename ensures no partial reads. LRU cache (15 entries) already sized for this. |
| Multiple repos | Each repo has its own `.reef/` folder. SQLite path normalization already handles cross-platform paths. No shared state issues. |
| Corrupt .reef/ | `checkExists()` validates schema version and required fields. Falls back to "generate fresh" path gracefully. |

## Sources

- Direct analysis of `/Users/johnrusch/Code/reef/src/main/services/c4/` (all services)
- `c4StorageHandlers.ts` — IPC pattern to follow for `reefStorageHandlers.ts`
- `generationQueueService.ts` — entry point for generation pipeline wiring
- `fileWatcherService.ts` — chokidar ignored predicate location
- `AddRepositoryModal.tsx` — import flow branch point
- `preload.ts` — IPC surface exposure pattern

---
*Architecture research for: v1.4 Repo-Stored Diagrams (.reef/ folder integration)*
*Researched: 2026-03-26*
