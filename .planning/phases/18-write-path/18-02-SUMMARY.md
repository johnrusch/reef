---
phase: 18
plan: 02
subsystem: c4-write-path
tags: [write-path, reef-storage, ipc, source-hash, tdd]
dependency_graph:
  requires: [Phase 18 Plan 01 sourceHashService, reefStorageTypes, ReefStorageService]
  provides: [writeReefArtifacts function, analyzedFilePathsCache in c4AnalyzerService]
  affects: [Phase 19 read-path staleness detection, .reef/ file artifacts on disk]
tech_stack:
  added: []
  patterns: [module-level cache Map, singleton service pattern, non-fatal try/catch write-through, TDD red-green]
key_files:
  created:
    - tests/unit/main/services/c4StorageHandlers.reef.test.ts
  modified:
    - src/main/services/c4/c4AnalyzerService.ts
    - src/main/services/c4/c4StorageHandlers.ts
decisions:
  - "analyzedFilePathsCache uses module-level Map keyed by repoPath:level:elementId to avoid return-type changes in generateC4Diagram"
  - "writeReefArtifacts extracted as named export for testability — handler calls it inside its own try/catch scope"
  - "ReefStorageService singleton follows same lazy-init pattern as C4StorageService singleton"
  - "clearAnalyzedFilePaths called after hash computation to prevent memory accumulation"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 18 Plan 02: Write-Through Pipeline to .reef/ Summary

store-svg IPC handler now writes .puml, .svg, and .meta.json to .reef/ after every successful SQLite write using ReefStorageService, with source hash computed from analyzed file paths cached by the C4AnalyzerService.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Surface analyzed file paths from C4AnalyzerService | 2bcfe94 | src/main/services/c4/c4AnalyzerService.ts |
| 2 | Extend store-svg handler to write .reef/ artifacts | e50b715 | src/main/services/c4/c4StorageHandlers.ts, tests/unit/main/services/c4StorageHandlers.reef.test.ts |

## What Was Built

### c4AnalyzerService.ts (modified)

- Added module-level `analyzedFilePathsCache = new Map<string, string[]>()` keyed by `repoPath:level:elementId`
- Exported `getAnalyzedFilePaths(repoPath, level, elementId?)` — getter consumed by store-svg handler
- Exported `clearAnalyzedFilePaths(repoPath, level, elementId?)` — cleanup after hash computed
- In `generateC4Diagram`: after static analysis succeeds, extracts unique file paths from `structure.classes`, `structure.interfaces`, `structure.functions` and stores them in the cache

### c4StorageHandlers.ts (modified)

New imports: `ReefStorageService`, `computeSourceHash`, `getAnalyzedFilePaths`, `clearAnalyzedFilePaths`, `REEF_SCHEMA_VERSION`, `FLAT_LEVELS`, `ReefMetaJson`, `FlatLevel`, `NestedLevel`

New `ReefStorageService` singleton (`reefStorage` / `getReefStorage()`):
- Lazy-initialized on first write, same pattern as `getStorageService()`

New exported `writeReefArtifacts(repoPath, level, svg, elementId?)`:
- Retrieves puml from SQLite via `getStorageService().getDiagram()`
- Skips write if no puml available (edge case: SVG stored before diagram)
- Computes `sourceHash` from `getAnalyzedFilePaths()` if available
- Calls `clearAnalyzedFilePaths()` after consuming paths
- Builds `ReefMetaJson` with `schemaVersion`, `level`, `generatedAt`, `modelUsed`, `promptVersion`, `sourceHash`
- Routes to `writeLevelFiles` for flat levels (context, container) or `writeSubDiagramFiles` for nested levels with elementId
- Wraps all logic in try/catch — failures logged as console.warn, not propagated (D-10)

Updated `c4-storage:store-svg` handler:
- Keeps SQLite-first write (unchanged)
- Adds `await writeReefArtifacts(...)` call after SQLite+LRU write

### Tests (9 passing)

`c4StorageHandlers.reef.test.ts`:
- writeLevelFiles called for context with correct puml, svg, meta, sourceHash
- writeLevelFiles called for container; writeSubDiagramFiles not called
- writeSubDiagramFiles called for component with elementId as parentId
- Skips write when getDiagram returns null
- Skips write when getDiagram returns empty diagramContent
- Does not throw when writeLevelFiles throws (non-fatal)
- Includes sourceHash in meta when filePaths available
- Omits sourceHash when no filePaths available
- clearAnalyzedFilePaths called after consuming file paths

## Deviations from Plan

### Worktree merge required

The worktree for this agent (agent-a5af16b8) was behind main and did not have the Phase 18 Plan 01 files (reefStorageService.ts, reefStorageTypes.ts, sourceHashService.ts). A `git merge main` fast-forward was performed before starting task execution to bring the worktree up to date.

### Mock architecture adjustment

The plan suggested mocking `c4StorageHandlers` itself with `importOriginal`, but this caused the `writeReefArtifacts` export to be undefined (circular self-mock). Instead, stable mock function variables (`mockWriteLevelFiles`, `mockWriteSubDiagramFiles`, `mockGetDiagram`) are defined at module scope so they persist across `beforeEach`/`vi.clearAllMocks()` cycles. Mock implementations are reset in `beforeEach` via `.mockResolvedValue()` without replacing the function reference.

## Known Stubs

None — writeReefArtifacts is fully wired to real ReefStorageService, computeSourceHash, and the analyzer cache.

## Self-Check: PASSED

- [x] src/main/services/c4/c4AnalyzerService.ts contains `analyzedFilePathsCache`
- [x] src/main/services/c4/c4AnalyzerService.ts exports `getAnalyzedFilePaths`
- [x] src/main/services/c4/c4AnalyzerService.ts exports `clearAnalyzedFilePaths`
- [x] src/main/services/c4/c4StorageHandlers.ts contains `writeReefArtifacts` export
- [x] src/main/services/c4/c4StorageHandlers.ts imports `ReefStorageService`
- [x] src/main/services/c4/c4StorageHandlers.ts imports `computeSourceHash`
- [x] src/main/services/c4/c4StorageHandlers.ts store-svg handler calls `writeReefArtifacts`
- [x] src/main/services/c4/c4StorageHandlers.ts contains `non-fatal` comment in try/catch
- [x] tests/unit/main/services/c4StorageHandlers.reef.test.ts has 9 test cases (>= 4)
- [x] Commit 2bcfe94 exists (Task 1)
- [x] Commit e50b715 exists (Task 2)
- [x] 31 tests pass (6 sourceHash + 16 reefStorage + 9 c4StorageHandlers.reef)
- [x] TypeScript compiles without errors
