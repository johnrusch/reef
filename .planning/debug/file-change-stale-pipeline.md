---
status: diagnosed
trigger: "File changes in a watched repo do not trigger stale state on diagrams. Tests 2 and 3 from UAT both fail."
created: 2026-02-27T00:10:00Z
updated: 2026-02-27T00:25:00Z
---

## Current Focus

hypothesis: CONFIRMED - Chokidar v4 removed glob support; FileWatcherService passes glob patterns that chokidar v4 treats as literal paths (matching nothing)
test: Ran chokidar.watch() with glob patterns and verified watcher.getWatched() returns empty {}
expecting: Events fire for glob patterns
next_action: Return root cause diagnosis

## Symptoms

expected: File save in watched repo -> ChangeTrackingService debounces -> maps to elements -> persists to SQLite -> updates state to 'stale' -> emits enriched IPC event -> renderer picks up and shows stale indicator
actual: Nothing happens when files change. Stale state never triggers.
errors: None reported (no crashes, no error logs)
reproduction: Edit and save a source file in a watched repo that has generated diagrams
started: After Phase 07 implementation (07-02 wiring)

## Eliminated

- hypothesis: IPC wiring broken between ChangeTrackingService and renderer
  evidence: Code analysis shows IPC event emission and listener are correctly wired via c4-storage:state-changed channel. The preload bridge, Zustand store, and DiagramStateBadge rendering logic are all correct.
  timestamp: 2026-02-27T00:15:00Z

- hypothesis: SQLite path normalization mismatch between stored diagrams and lookup queries
  evidence: Both storeDiagram and getDiagram normalize paths using the same normalizePath function. Paths come from the same renderer source (repository.path).
  timestamp: 2026-02-27T00:15:00Z

- hypothesis: Timestamp comparison issue in handleFileChange (updated_at parsing)
  evidence: Tested timestamp parsing logic - SQLite CURRENT_TIMESTAMP with 'Z' suffix parses correctly. File mtime would be greater than stored timestamp for any file saved after generation.
  timestamp: 2026-02-27T00:16:00Z

- hypothesis: ChangeTrackingService constructor or wiring issue in main.ts
  evidence: main.ts line 253-256 correctly instantiates ChangeTrackingService with getStorageService() and passes it to initializeFileWatcherService(). The FileWatcherService constructor stores it. Timing is correct (before createWindow).
  timestamp: 2026-02-27T00:17:00Z

## Evidence

- timestamp: 2026-02-27T00:10:00Z
  checked: Full pipeline code read (6 files)
  found: Pipeline wiring is architecturally correct - the break must be at the chokidar level
  implication: Need to verify chokidar actually fires events

- timestamp: 2026-02-27T00:20:00Z
  checked: chokidar.watch() with glob pattern /Users/.../src/**/*.ts
  found: watcher.getWatched() returns empty {} - no files being watched
  implication: Chokidar v4 does not expand glob patterns

- timestamp: 2026-02-27T00:20:00Z
  checked: chokidar.watch() with directory path /Users/.../src/main
  found: watcher.getWatched() returns correct entries, change events fire correctly
  implication: Directory watching works, only glob patterns are broken

- timestamp: 2026-02-27T00:21:00Z
  checked: chokidar.watch() with concrete file path /Users/.../package.json
  found: watcher.getWatched() returns the file correctly
  implication: Concrete file paths work, only glob patterns are broken

- timestamp: 2026-02-27T00:22:00Z
  checked: Installed chokidar version
  found: chokidar v4.0.3 (package.json specifies "^4.0.3")
  implication: Chokidar v4 removed glob support as a breaking change. FileWatcherService was written assuming v3 glob behavior.

- timestamp: 2026-02-27T00:23:00Z
  checked: FileWatcherService.getFilePatterns() return values
  found: 5 of 7 unique patterns use globs (src/**/*.ts, src/**/*.tsx, src/**/*.js, src/**/*.jsx, src/main/**/*, src/renderer/**/*, src/**/main.*). Only package.json and tsconfig.json are concrete paths.
  implication: Component and code level watching is 100% broken. Container is mostly broken. Context is partially broken.

## Resolution

root_cause: |
  Chokidar v4.0.3 (installed) removed glob pattern support as a breaking change from v3.
  FileWatcherService.getFilePatterns() at src/main/services/fileWatcherService.ts:238-271
  returns glob patterns like 'src/**/*.ts' for component/code levels.
  Chokidar v4 treats these as literal paths, which don't exist, so nothing is watched.
  watcher.getWatched() returns {} (empty) for glob-based patterns.
  This means handleFileChange() is NEVER called, so ChangeTrackingService.recordChange()
  is NEVER called, and no stale events are ever emitted.
fix: TBD
verification: TBD
files_changed: []
