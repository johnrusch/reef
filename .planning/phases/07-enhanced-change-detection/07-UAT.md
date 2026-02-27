---
status: diagnosed
phase: 07-enhanced-change-detection
source: 07-01-SUMMARY.md, 07-02-SUMMARY.md
started: 2026-02-26T21:30:00Z
updated: 2026-02-27T00:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Unit Tests Pass
expected: Run `npm run test:unit` — all tests pass, including the new ChangeTrackingService and diagramStateStore tests. Zero failures.
result: pass

### 2. File Change Triggers Stale State
expected: With the app running and a repo added with diagrams generated, edit and save a source file in that repo. Within ~2 seconds the diagram state indicator should transition to "stale" for the affected level(s).
result: issue
reported: "nothing happens when files change"
severity: major

### 3. Debounced Batch Processing
expected: Rapidly edit and save 3+ files in quick succession (within 1 second). The diagram should transition to stale only once after the burst, not flicker between states for each individual save.
result: issue
reported: "fails just like test 2"
severity: major

### 4. Generation Not Interrupted by File Changes
expected: Trigger diagram generation (e.g. click regenerate). While generation is in progress, save a file in the repo. Generation should complete successfully without being interrupted or restarted.
result: pass

### 5. Cold Launch Recovery
expected: With the app running and stale diagrams showing change tracking data, quit the app completely and relaunch. The previously detected changes should still be reflected — the stale state should persist from the previous session without requiring new file edits.
result: skipped
reason: Cannot test — stale state never triggers (blocked by Test 2 issue)

### 6. TypeScript Compiles Clean
expected: Run `npm run typecheck` — zero TypeScript errors across the entire project.
result: pass

## Summary

total: 6
passed: 3
issues: 2
pending: 0
skipped: 1

## Gaps

- truth: "File changes in a watched repo trigger stale state on affected diagram levels within ~2 seconds"
  status: failed
  reason: "User reported: nothing happens when files change"
  severity: major
  test: 2
  root_cause: "Chokidar v4.0.3 removed glob pattern support. FileWatcherService.getFilePatterns() returns globs like src/**/*.ts which v4 treats as literal paths. No matching files exist, so watcher watches nothing — zero events fire."
  artifacts:
    - path: "src/main/services/fileWatcherService.ts"
      issue: "getFilePatterns() (lines 238-271) returns glob patterns; startWatching() (lines 46-65) passes them to chokidar.watch() which silently ignores them in v4"
    - path: "package.json"
      issue: "chokidar ^4.0.3 — v4 removed glob expansion"
  missing:
    - "Replace glob patterns with directory paths + file extension filtering in handleFileChange callback"
  debug_session: ".planning/debug/file-change-stale-pipeline.md"

- truth: "Multiple rapid file changes are debounced into a single stale transition"
  status: failed
  reason: "User reported: fails just like test 2 — same root cause, stale state never triggers"
  severity: major
  test: 3
  root_cause: "Same as Test 2 — chokidar v4 glob incompatibility. Debounce logic in ChangeTrackingService is correct but never invoked because FileWatcherService never receives file change events."
  artifacts:
    - path: "src/main/services/fileWatcherService.ts"
      issue: "No events emitted due to chokidar v4 glob issue"
  missing:
    - "Fix chokidar watcher setup (same fix as Test 2)"
  debug_session: ".planning/debug/file-change-stale-pipeline.md"
