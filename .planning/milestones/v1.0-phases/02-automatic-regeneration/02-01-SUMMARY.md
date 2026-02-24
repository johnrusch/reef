---
phase: 02-automatic-regeneration
plan: 01
subsystem: automatic-regeneration
tags: [file-watching, cache-invalidation, staleness-detection, backend-foundation]
dependencies:
  requires:
    - 01-c4-foundation/01-03 (C4CacheService base implementation)
  provides:
    - FileWatcherService for file change detection
    - Generation timestamp persistence
    - Staleness detection API
  affects:
    - C4CacheService (extended with timestamps table)
tech-stack:
  added:
    - chokidar@^4.0.3 (file watching)
  patterns:
    - Level-specific file pattern watching
    - Generation timestamp tracking
    - IPC event emission for staleness
key-files:
  created:
    - src/main/services/fileWatcherService.ts (273 lines)
    - tests/integration/fileWatcher.test.ts (350 lines)
  modified:
    - src/main/services/c4/c4CacheService.ts (+80 lines)
    - package.json (chokidar dependency)
decisions:
  - Used chokidar for reliable cross-platform file watching with 100ms debounce
  - Implemented level-specific file patterns (context/container/component/code)
  - Added generation_timestamps SQLite table for persistent timestamp tracking
  - IPC events emitted to renderer when diagrams become stale
  - Singleton pattern with factory functions for FileWatcherService initialization
metrics:
  duration: 5m
  tasks_completed: 3
  tests_added: 14
  commits: 2
completed: 2026-02-23
---

# Phase 2 Plan 1: File Watcher and Timestamp Persistence Summary

Backend foundation for automatic diagram regeneration through file watching and staleness detection.

## What Was Built

Created FileWatcherService with chokidar integration and extended C4CacheService with generation timestamp persistence. System can now detect when repository source files change and determine if cached diagrams are stale by comparing file modification times to generation timestamps.

## Implementation Details

### FileWatcherService

**Core functionality:**
- Chokidar-based file watching with level-specific patterns
- 100ms debounce via awaitWriteFinish for stability
- IPC event emission to renderer on staleness detection
- Startup staleness checks via generation timestamp comparison
- Per-repo-level watcher management (Map-based storage)

**Level-specific patterns:**
- **Context:** package.json, tsconfig.json, src/**/main.* (system boundaries)
- **Container:** package.json, src/main/**, src/renderer/** (high-level structure)
- **Component:** src/**/*.{ts,tsx,js,jsx} (all source files)
- **Code:** src/**/*.{ts,tsx,js,jsx} (most granular)

**Ignored paths:** node_modules, .git, dist, dist-electron, .cache, build, coverage

**Key methods:**
- `startWatching(repoPath, level)` - Start watching with level patterns
- `stopWatching(repoPath, level)` - Stop specific watcher
- `stopAllWatchers()` - Cleanup all watchers
- `checkStalenessOnStartup(repoPath, level)` - Compare file mtimes to timestamp
- `handleFileChange()` - Private method for file change events
- `emitStaleEvent()` - Send IPC event to renderer

**IPC event format:**
```typescript
{
  repoPath: string,
  level: C4Level,
  changedPath: string,
  timestamp: number
}
```

### C4CacheService Extensions

**New database table:**
```sql
CREATE TABLE generation_timestamps (
  repo_path TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('context', 'container', 'component', 'code')),
  timestamp INTEGER NOT NULL,
  PRIMARY KEY (repo_path, level)
);
```

**New public methods:**
- `setLastGenerationTimestamp(repoPath, level)` - Store generation timestamp
- `getLastGenerationTimestamp(repoPath, level)` - Retrieve timestamp (returns 0 if not found)
- `clearAllGenerationTimestamps(repoPath)` - Clear all timestamps for repo
- `clearAllCache()` - Clear all entries and timestamps (troubleshooting)

**Modified methods:**
- `setCachedDiagram()` - Now also calls `setLastGenerationTimestamp()`
- `clearCache()` - Now also clears generation timestamps
- `getRelevantFilePatterns()` - Changed from private to public

### Integration Tests

Created comprehensive test suite with 14 tests covering:

**C4CacheService Timestamp Persistence (6 tests):**
- Stores and retrieves generation timestamps
- Returns 0 for non-existent timestamps
- Clears timestamps when cache is cleared
- Updates timestamp when diagram is cached
- Stores different timestamps for different levels
- ClearAllCache clears both cache and timestamps

**FileWatcherService (4 tests):**
- Starts watching with correct patterns for each C4 level
- Stops watching when requested
- Stops all watchers on cleanup
- Doesn't start duplicate watchers

**Staleness Detection Integration (4 tests):**
- Returns false when diagram was never generated
- Detects diagram as stale when files are newer than timestamp
- Detects diagram as fresh when files are older than timestamp
- Handles different levels with level-specific patterns

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

1. **Chokidar configuration:** Used 100ms stabilityThreshold and 50ms pollInterval for optimal balance between responsiveness and stability.

2. **Singleton pattern:** FileWatcherService uses factory functions (`initializeFileWatcherService`, `getFileWatcherService`) instead of direct singleton export to ensure proper cache service injection.

3. **Error handling:** File watcher errors are logged but don't crash the service. Individual file events that fail are caught and logged, allowing the watcher to continue operating.

4. **IPC event emission:** Broadcast to all BrowserWindows to handle multi-window scenarios.

5. **Timing in tests:** Added 10ms delays in staleness detection tests to ensure generation timestamps are definitively after file creation times.

## Success Criteria Met

- ✅ FileWatcherService created with chokidar integration (UPDATE-01)
- ✅ Level-specific file patterns implemented (UPDATE-06)
- ✅ Generation timestamp persistence working (UPDATE-07)
- ✅ Cache staleness detection based on file mtimes
- ✅ IPC event emission for staleness notification
- ✅ All integration tests passing (14/14)
- ✅ Typecheck passes
- ✅ Lint passes
- ✅ Chokidar ^4.0.3 in package.json dependencies

## Files Changed

**Created:**
- `src/main/services/fileWatcherService.ts` (273 lines)
- `tests/integration/fileWatcher.test.ts` (350 lines)

**Modified:**
- `src/main/services/c4/c4CacheService.ts` (+80 lines)
- `package.json` (chokidar dependency)
- `package-lock.json` (lockfile update)

## Commits

1. `047b9ec` - feat(02-01): add FileWatcherService and generation timestamp persistence
2. `2791c7a` - test(02-01): add integration tests for file watcher and timestamp persistence

## Next Steps

Integration with main process:
1. Initialize FileWatcherService in main.ts with C4CacheService
2. Start/stop watchers when repositories are added/removed
3. Wire up IPC handlers for manual regeneration requests
4. Add UI components for staleness indicators (yellow badge)
5. Implement regeneration button functionality

## Self-Check: PASSED

**Created files verified:**
```bash
✅ src/main/services/fileWatcherService.ts exists
✅ tests/integration/fileWatcher.test.ts exists
```

**Commits verified:**
```bash
✅ 047b9ec: feat(02-01): add FileWatcherService and generation timestamp persistence
✅ 2791c7a: test(02-01): add integration tests for file watcher and timestamp persistence
```

**Key functionality verified:**
```bash
✅ Chokidar ^4.0.3 in package.json
✅ generation_timestamps table in C4CacheService
✅ FileWatcherService exports singleton pattern
✅ 14/14 integration tests passing
✅ TypeScript compilation successful
✅ ESLint passing
```
