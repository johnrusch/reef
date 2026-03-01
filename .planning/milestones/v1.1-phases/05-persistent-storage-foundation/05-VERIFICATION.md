---
phase: 05-persistent-storage-foundation
verified: 2026-02-25T22:00:00Z
status: human_needed
score: 4/4 must-haves verified (automated)
re_verification: true
previous_status: gaps_found
previous_score: 6/6 automated (1 human test failed — gap-stale-badge)
gaps_closed:
  - "Stale badge pipeline rewired: FileWatcherService now reads generation timestamps from C4StorageService (diagram_storage.db) and emits c4-storage:state-changed IPC so Zustand diagramStateStore and DiagramStateBadge receive stale transitions"
gaps_remaining: []
regressions: []
human_verification:
  - test: "Stale state badge with file changes (UAT gap-stale-badge)"
    expected: "After modifying files in a repo with a fresh diagram, the header badge changes from green 'Up to date' to amber 'Outdated - Click to regenerate' within a few seconds"
    why_human: "Requires real file modification and running app — cannot simulate chokidar events in unit tests. Full pipeline: chokidar detects change → FileWatcherService.handleFileChange() reads diagram_storage.db → updateState('stale') → emitStateChangedEvent emits c4-storage:state-changed IPC → VisualMapTab/DiagramViewer onStateChanged subscription → Zustand diagramStateStore → DiagramStateBadge renders amber"
  - test: "End-to-end diagram persistence across app restart"
    expected: "Generate a diagram, quit the app completely, reopen it, navigate to the same repository's Visual Map tab — the diagram is displayed immediately without regeneration, green 'Up to date' badge visible"
    why_human: "Previously PASSED in 05-06 re-verification. Regression check only — confirm still works after 05-07 changes."
---

# Phase 5: Persistent Storage Foundation Verification Report

**Phase Goal:** Diagrams survive app restarts without regeneration
**Verified:** 2026-02-25T22:00:00Z
**Status:** human_needed (all automated checks pass; one human re-test required for closed gap)
**Re-verification:** Yes — after 05-07 stale badge pipeline fix (commit d15cbb5)

## Re-Verification Context

Previous verification (2026-02-25T21:00:00Z) was `gaps_found` with the following open gap:

**gap-stale-badge:** The stale badge never transitioned from green "Up to date" to amber "Outdated" when source files were modified. Root cause: `FileWatcherService` was reading generation timestamps from `C4CacheService` (c4-cache.db), which receives no writes since `C4AnalyzerService` now writes to `C4StorageService` (diagram_storage.db). Additionally, `emitStaleEvent` sent the old `diagram:stale` IPC event, which only set a local `isStale` boolean in `DiagramViewer` — it never updated the Zustand `diagramStateStore`, so `DiagramStateBadge` never changed.

**05-07 fix (commit d15cbb5):**
- Replaced `C4CacheService` dependency in `FileWatcherService` with `C4StorageService`
- Rewrote `handleFileChange` to call `this.storageService.getDiagram()` (reads `updated_at` from diagram_storage.db)
- Rewrote `emitStaleEvent` → `emitStateChangedEvent` which sends `c4-storage:state-changed` IPC (the new pipeline)
- Added `this.storageService.updateState(repoPath, level, 'stale')` before emitting the IPC event
- Exported `getStorageService` from `c4StorageHandlers.ts` for FileWatcherService access
- Updated `main.ts` initialization order: `registerC4StorageHandlers()` runs before `initializeFileWatcherService(getStorageService())`

**TypeScript compilation:** PASSES (zero errors — confirmed with `npm run typecheck`)

## Goal Achievement

### Observable Truths (from 05-07-PLAN.md must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When a source file changes in a repo with a fresh diagram, the badge transitions from green to amber within a few seconds | VERIFIED (code) | `handleFileChange` at line 163 calls `this.storageService.getDiagram()` → reads `updatedAt` timestamp → if file newer, calls `updateState('stale')` at line 191 then `emitStateChangedEvent` at line 194. `emitStateChangedEvent` at line 212 sends `c4-storage:state-changed` IPC. VisualMapTab and DiagramViewer both subscribe at `window.reef.c4Storage.onStateChanged` → call `setState()` on Zustand store → `DiagramPanel` passes `currentState` to `DiagramStateBadge` → badge renders amber. Human test required to confirm runtime behavior. |
| 2 | FileWatcherService reads generation timestamps from C4StorageService (diagram_storage.db), not C4CacheService (c4-cache.db) | VERIFIED | `fileWatcherService.ts` line 19: `import { C4StorageService } from './c4/c4StorageService'`. No `C4CacheService` import present. Grep of `fileWatcherService.ts` for `C4CacheService` returns zero matches. |
| 3 | File change events update both the database state to 'stale' and the Zustand diagramStateStore via c4-storage:state-changed IPC | VERIFIED | `handleFileChange` line 191: `this.storageService.updateState(repoPath, level, 'stale')` writes to database. Line 194: `this.emitStateChangedEvent(repoPath, level, 'stale')` sends IPC. Preload bridge at `preload.ts` lines 203-206 maps `c4-storage:state-changed` → `onStateChanged` callback → Zustand `setState()`. |
| 4 | Previously passing features remain unbroken: diagram persistence, GeneratePromptCard, generating indicator, fresh badge | VERIFIED | TypeScript compiles zero errors. VisualMapTab rendering paths (lines 468-511) unchanged from 05-06. C4StorageService persistence unchanged. `c4-storage:state-changed` IPC channel used throughout (same channel 05-06 established). |

**Score:** 4/4 truths verified (automated code analysis)

### Required Artifacts (from 05-07-PLAN.md)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/main/services/fileWatcherService.ts` | Wired to C4StorageService; reads updated_at; emits c4-storage:state-changed | VERIFIED | Line 19: `import { C4StorageService }`. Line 24: `private storageService: C4StorageService`. Line 163: `this.storageService.getDiagram()`. Line 191: `updateState('stale')`. Line 194: `emitStateChangedEvent`. Line 212: `window.webContents.send('c4-storage:state-changed', ...)`. 321 lines, substantive. |
| `src/main/services/c4/c4StorageHandlers.ts` | Exports getStorageService for FileWatcherService access | VERIFIED | Line 10: `export const getStorageService = (): C4StorageService => { ... }`. Previously `const` (module-private), now exported. |
| `src/main/main.ts` | FileWatcherService initialized with C4StorageService instead of C4CacheService | VERIFIED | Line 20: `import { registerC4StorageHandlers, cleanupC4Storage, getStorageService }`. Lines 243-247: `registerC4StorageHandlers()` then `initializeFileWatcherService(getStorageService())`. C4CacheService import retained at line 18 (still used by `cache:clearAll` handler at line 352). |

### Key Link Verification (from 05-07-PLAN.md)

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `fileWatcherService.ts` | `c4StorageService.ts` | `getDiagram()` to read `updatedAt` timestamp | WIRED | Line 163: `const stored = this.storageService.getDiagram(repoPath, level)`. Line 176-178: `stored.updatedAt` timestamp extracted. |
| `fileWatcherService.ts` | `c4-storage:state-changed` IPC | `emitStateChangedEvent` sends event to all BrowserWindows | WIRED | `emitStateChangedEvent` at lines 207-225: iterates `BrowserWindow.getAllWindows()`, calls `window.webContents.send('c4-storage:state-changed', {repoPath, level, state})`. |
| `c4-storage:state-changed` IPC | `diagramStateStore.ts` | VisualMapTab and DiagramViewer `onStateChanged` subscriptions | WIRED | VisualMapTab line 113: `window.reef.c4Storage.onStateChanged((_, data) => setState(...))`. DiagramViewer line 264: same pattern. Preload bridge lines 203-206 confirm IPC → callback mapping. |
| `diagramStateStore.ts` | `DiagramStateBadge.tsx` | `DiagramPanel` reads `currentState` from Zustand and passes to `DiagramStateBadge` | WIRED | DiagramViewer line 436: `diagramState={currentState}`. DiagramPanel lines 96-104: renders `DiagramStateBadge state={diagramState}`. DiagramStateBadge line 54-63: renders amber button for `state === 'stale'`. |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| STOR-01 | 05-00 through 05-07 | User can close and reopen app without losing generated diagrams | SATISFIED | C4StorageService persists to diagram_storage.db (SQLite). VisualMapTab loads on mount via `window.reef.c4Storage.getDiagram()` IPC. Previously human-tested as PASSED. 05-07 changes do not affect persistence path. |
| STOR-02 | 05-00, 05-01, 05-03, 05-04 | App migrates v1.0 TTL-based cache to persistent storage on first launch | SATISFIED | MigrationService unchanged from original 05-00/05-01 verification. 05-07 changes do not touch migration code. |
| STOR-03 | 05-00, 05-01 | Database uses WAL mode for concurrent read performance | SATISFIED | C4StorageService WAL configuration unchanged. 05-07 changes do not modify C4StorageService implementation. |
| STOR-04 | 05-00 through 05-07 | App tracks diagram state (never_generated, generating, fresh, stale, error) | SATISFIED (code verified, stale human-pending) | All five states tracked. `never_generated` renders GeneratePromptCard. `generating` renders blue spinner badge. `fresh` rendered after generation. `stale` now flows through full pipeline (file watcher → C4StorageService → IPC → Zustand → DiagramStateBadge). `error` handled by updateState('error'). Human test for stale transition required to confirm runtime. |

**Requirements Coverage:** 4/4 Phase 5 requirements satisfied in code.
**Orphaned Requirements:** None. REQUIREMENTS.md traceability table marks all four as "Complete" for Phase 5.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| No blocker patterns found in modified files | — | — | — | — |

Scanned `fileWatcherService.ts`, `c4StorageHandlers.ts`, and `main.ts` for TODO/FIXME/PLACEHOLDER, empty returns, and stub patterns. No issues found.

### Regression Check (Items That Previously Passed)

| Item | Status |
|------|--------|
| C4AnalyzerService writes to C4StorageService (storeDiagram) | CLEAR — unchanged |
| VisualMapTab loads from storage on mount (getDiagram IPC) | CLEAR — unchanged |
| GeneratePromptCard renders for never_generated state (VisualMapTab line 486) | CLEAR — unchanged |
| DiagramStateBadge generating indicator before DiagramViewer exists (VisualMapTab line 499) | CLEAR — unchanged |
| DiagramViewer onStateChanged subscription updates Zustand (line 264) | CLEAR — unchanged |
| TypeScript compilation | CLEAR — zero errors confirmed |
| Stale badge click → handleRegenerateFromBadge | CLEAR — DiagramStateBadge `onRegenerate={handleRegenerateFromBadge}` unchanged (DiagramPanel line 101) |
| `cache:clearAll` IPC handler (main.ts line 350) still uses C4CacheService | CLEAR — C4CacheService import retained at main.ts line 18 |

### Human Verification Required

#### 1. Stale Badge Transition After File Modification (UAT gap-stale-badge)

**Test:** Generate a C4 diagram for any repository and confirm the green "Up to date" badge appears. Then modify a source file in that repository (e.g., add a line to any `.ts` file in `src/`). Observe the diagram header badge.
**Expected:** Within a few seconds (chokidar `stabilityThreshold: 100ms`), the badge changes from green "Up to date" to amber with clock icon "Outdated - Click to regenerate".
**Why human:** Requires chokidar watching a real filesystem path, a real file write, and IPC event delivery to a live renderer. The pipeline is fully wired in code — this confirms the runtime behavior including timestamp comparison (`fileStat.mtimeMs > lastGenTimestamp`).

#### 2. Regression: Diagram Persistence Across App Restart (STOR-01)

**Test:** Generate a diagram, quit the app completely, reopen it, and navigate to the same repository's Visual Map tab.
**Expected:** Diagram displays immediately from SQLite without regeneration. Green "Up to date" badge visible.
**Why human:** Previously PASSED in 05-06 human testing. This is a regression check to confirm 05-07's main.ts initialization reorder (`registerC4StorageHandlers()` before `initializeFileWatcherService()`) did not break app startup or storage initialization.

## Gaps Summary

All automated gaps are closed. The previous `gap-stale-badge` has been fully addressed in code by the 05-07 plan:

**Root cause fixed:** `FileWatcherService` was reading timestamps from the wrong database (`c4-cache.db` via `C4CacheService`) and emitting the wrong IPC event (`diagram:stale` instead of `c4-storage:state-changed`). The fix wired it to `C4StorageService` and the new IPC pipeline.

**Pipeline is now end-to-end:**
```
File change detected by chokidar
  → FileWatcherService.handleFileChange()
    → storageService.getDiagram() reads updated_at from diagram_storage.db
    → timestamp comparison: fileStat.mtimeMs > lastGenTimestamp
    → storageService.updateState('stale') writes to database
    → emitStateChangedEvent sends 'c4-storage:state-changed' IPC
    → VisualMapTab/DiagramViewer onStateChanged subscription fires
    → Zustand diagramStateStore transitions to 'stale'
    → DiagramPanel re-renders DiagramStateBadge with state='stale'
    → Badge shows amber "Outdated - Click to regenerate"
```

One human test is required to confirm runtime behavior. The implementation is correct per automated analysis.

---

_Verified: 2026-02-25T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — after 05-07 stale badge pipeline fix (commit d15cbb5)_
