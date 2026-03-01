# Phase 7: Enhanced Change Detection - Research

**Researched:** 2026-02-26
**Domain:** File-to-C4-element mapping, debounced change tracking, hierarchical state propagation
**Confidence:** HIGH

## Summary

Phase 7 builds on the existing `FileWatcherService` (chokidar 4.0.3) and `C4StorageService` (better-sqlite3) infrastructure from Phase 5. The current watcher emits a single `c4-storage:state-changed` IPC event when *any* file changes, marking the entire diagram level as `stale`. Phase 7 enhances this to: (a) collect which specific files changed, (b) map those files to named C4 elements using heuristics already baked into `C4PlantUMLGenerator`, (c) propagate that mapping up the C4 hierarchy (code → component → container), and (d) debounce bursts of rapid saves into a single aggregated update so the renderer gets one clean event rather than dozens.

The key new artefact is a `ChangeTrackingService` in `src/main/services/` that sits between `FileWatcherService` and the IPC event pipeline. It accumulates changed files, maps each to one or more C4 element IDs using path-based heuristics (the same logic already in `detectComponents`, `getContainerPath`, and `sanitizeId` in `C4PlantUMLGenerator`), debounces with a configurable window (1 000 ms recommended), then emits a richer `c4-storage:state-changed` payload that adds `changedFiles` and `affectedElements` fields. The renderer's existing `onStateChanged` handler and `diagramStateStore` need minor additions: store the affected element list per level so the UI (already wired for `changedFiles`) can display element counts.

The mapping heuristic problem is the single highest-risk item. The existing `detectComponents` logic maps file paths to component names by matching the directory segment after the container root. That heuristic is deterministic and already proven; Phase 7 can reuse it directly to map file → container/component. Code-level elements are classes, extracted by `StaticAnalyzerService` (`classInfo.file` → `classInfo.name`). Because the mapping runs in the main process (Node.js), using `ts-morph` for partial re-analysis on change is feasible but expensive; a simpler path-based heuristic is preferred and sufficient for the success criteria.

**Primary recommendation:** Create `ChangeTrackingService` that debounces file events, maps via path heuristics, persists the `affectedElements` JSON blob to a new `diagram_change_tracking` SQLite table, then broadcasts the enriched `c4-storage:state-changed` event to the renderer.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHNG-01 | User sees stale indicator when files have changed since last diagram generation | Existing `c4-storage:state-changed` IPC + `DiagramStateBadge` already handles stale state. Phase 7 must ensure the event fires within 2 s. Chokidar `stabilityThreshold: 100` + 1 000 ms debounce window totals < 2 s. |
| CHNG-02 | Changed files map to specific C4 elements (Code, Component, Container) | New `ChangeTrackingService.mapFileToElements()` using path-based heuristics derived from existing `C4PlantUMLGenerator` logic. |
| CHNG-03 | Changes bubble up hierarchy (Code change marks parent Component, parent Container) | `propagateUp()` function walks the C4 hierarchy: code → component → container. Three-level propagation, context level excluded (system-level changes are too coarse). |
| CHNG-04 | File changes are debounced and aggregated to prevent rapid-fire updates | Debounce via `setTimeout`/`clearTimeout` inside `ChangeTrackingService`. Window: 1 000 ms (within the 2 s SLA). No new library needed. |
| CHNG-05 | User can see count of changed elements at each C4 level | `affectedElements` payload includes count per level. Frontend `diagramStateStore` extended with `changedElementCounts: Map<string, number>`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chokidar | 4.0.3 (installed) | File system watching | Already in use; `awaitWriteFinish.stabilityThreshold: 100` handles write-complete detection |
| better-sqlite3 | ^11.10.0 (installed) | Persisting change tracking data | Already the project's SQLite driver; WAL mode in place |
| Zustand | ^4.4.7 (installed) | Frontend state for affected elements | `diagramStateStore` already uses Zustand; extend existing store |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ts-morph | ^23.0.0 (installed) | AST-based file→class mapping | Use only for code-level element resolution; path heuristics cover component/container |
| Node.js `path` module | built-in | Path normalization | Already used throughout |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `setTimeout` debounce | `lodash.debounce` | `lodash.debounce` is not installed; plain `setTimeout` is adequate and zero-dependency |
| Path-based heuristic mapping | Full ts-morph re-analysis on every change | ts-morph re-analysis is ~0.5–3 s per file; path heuristics are < 1 ms; heuristics are sufficient for CHNG-02 |
| New IPC channel `c4-change:elements-changed` | Extend existing `c4-storage:state-changed` | Extending existing channel avoids new preload surface area; add `changedFiles` + `affectedElements` fields |

**Installation:** No new packages required. All necessary libraries are already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/main/services/
├── changeTrackingService.ts   # NEW: accumulate, debounce, map, emit
├── fileWatcherService.ts      # MODIFIED: call changeTrackingService instead of emitting directly
├── c4/
│   ├── c4StorageService.ts    # MODIFIED: add change_tracking table methods
│   └── c4StorageHandlers.ts   # MODIFIED: expose getChangeTracking IPC handler
src/shared/types/
└── changeTracking.ts          # NEW: shared types (AffectedElement, ChangeTrackingPayload)
src/renderer/stores/
└── diagramStateStore.ts       # MODIFIED: add affectedElements + changedElementCounts
```

### Pattern 1: ChangeTrackingService — accumulate + debounce + map + emit

**What:** A service that wraps the `FileWatcherService` change callback. It collects raw file paths into a per-`repoPath:level` accumulator, starts/resets a debounce timer, then on timer fire: maps files to elements, propagates hierarchy, persists to DB, emits enriched IPC event.

**When to use:** Called from `FileWatcherService.handleFileChange()` instead of directly emitting `c4-storage:state-changed`.

```typescript
// src/main/services/changeTrackingService.ts
import { BrowserWindow } from 'electron';
import type { C4Level } from './c4/types/c4Types';
import type { C4StorageService } from './c4/c4StorageService';

interface AffectedElement {
  level: C4Level;
  elementId: string;   // sanitized PlantUML ID, e.g. "Services"
  elementName: string; // human-readable, e.g. "services"
  isDirect: boolean;   // true = file directly in this element; false = propagated from child
}

interface ChangeAccumulator {
  files: Set<string>;
  timer: ReturnType<typeof setTimeout> | null;
}

export class ChangeTrackingService {
  private accumulators = new Map<string, ChangeAccumulator>(); // key = repoPath:level
  private readonly debounceMs: number;
  private storage: C4StorageService;

  constructor(storage: C4StorageService, debounceMs = 1000) {
    this.storage = storage;
    this.debounceMs = debounceMs;
  }

  recordChange(repoPath: string, level: C4Level, changedPath: string): void {
    const key = `${repoPath}:${level}`;
    let acc = this.accumulators.get(key);
    if (!acc) {
      acc = { files: new Set(), timer: null };
      this.accumulators.set(key, acc);
    }

    acc.files.add(changedPath);

    // Reset debounce timer
    if (acc.timer) clearTimeout(acc.timer);
    acc.timer = setTimeout(() => {
      this.flush(repoPath, level, key);
    }, this.debounceMs);
  }

  private flush(repoPath: string, level: C4Level, key: string): void {
    const acc = this.accumulators.get(key);
    if (!acc) return;

    const files = Array.from(acc.files);
    acc.files.clear();
    acc.timer = null;

    // Map files to C4 elements
    const directElements = this.mapFilesToElements(repoPath, level, files);
    // Propagate up hierarchy
    const allElements = this.propagateUp(directElements);

    // Persist to DB
    this.storage.upsertChangeTracking(repoPath, level, files, allElements);

    // Update diagram state to stale
    this.storage.updateState(repoPath, level, 'stale');

    // Broadcast enriched event
    this.emitChangeEvent(repoPath, level, files, allElements);
  }

  private mapFilesToElements(
    repoPath: string,
    level: C4Level,
    files: string[]
  ): AffectedElement[] {
    // Path-based heuristic: extract the directory segment after the container root
    // e.g. src/main/services/gitService.ts → "Services" component in Main Process container
    // Mirrors the logic in C4PlantUMLGenerator.detectComponents()
    const elements: AffectedElement[] = [];
    const seen = new Set<string>();

    for (const file of files) {
      const relative = file.replace(repoPath, '').replace(/\\/g, '/');

      if (level === 'code') {
        // Code level: element = filename without extension
        const fileName = relative.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || '';
        if (fileName && !seen.has(fileName)) {
          seen.add(fileName);
          elements.push({ level: 'code', elementId: sanitizeId(fileName), elementName: fileName, isDirect: true });
        }
      } else if (level === 'component') {
        // Component level: element = first directory after container root
        const parts = relative.replace(/^\//, '').split('/');
        const containerIdx = parts.findIndex(p => p === 'main' || p === 'renderer');
        if (containerIdx >= 0 && containerIdx + 1 < parts.length) {
          const name = parts[containerIdx + 1];
          if (!seen.has(name)) {
            seen.add(name);
            const cap = name.charAt(0).toUpperCase() + name.slice(1);
            elements.push({ level: 'component', elementId: sanitizeId(cap), elementName: cap, isDirect: true });
          }
        }
      } else if (level === 'container') {
        // Container level: element = 'Main Process' or 'Renderer Process'
        if (relative.includes('/main/')) {
          if (!seen.has('main')) { seen.add('main'); elements.push({ level: 'container', elementId: 'Main_Process', elementName: 'Main Process', isDirect: true }); }
        } else if (relative.includes('/renderer/')) {
          if (!seen.has('renderer')) { seen.add('renderer'); elements.push({ level: 'container', elementId: 'Renderer_Process', elementName: 'Renderer Process', isDirect: true }); }
        }
      }
    }

    return elements;
  }

  private propagateUp(direct: AffectedElement[]): AffectedElement[] {
    // C4 hierarchy: code → component → container
    // Direct code changes mark parent component and container
    const all = [...direct];
    const levels: C4Level[] = ['code', 'component', 'container'];

    for (const el of direct) {
      const levelIndex = levels.indexOf(el.level);
      // Propagate to all parent levels
      for (let i = levelIndex + 1; i < levels.length; i++) {
        // Derive parent element from child — simplified: mark the whole parent level as affected
        all.push({ level: levels[i], elementId: el.elementId, elementName: el.elementName, isDirect: false });
      }
    }

    return all;
  }

  private emitChangeEvent(repoPath: string, level: C4Level, files: string[], elements: AffectedElement[]): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send('c4-storage:state-changed', {
        repoPath,
        level,
        state: 'stale',
        changedFiles: files,
        affectedElements: elements,
      });
    }
  }
}

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
}
```

### Pattern 2: SQLite `diagram_change_tracking` Table

**What:** Stores the most recent change snapshot per `(repo_path, level)` so the renderer can query it after a cold launch or tab switch.

**When to use:** `upsertChangeTracking()` called inside `ChangeTrackingService.flush()`. The table uses `INSERT OR REPLACE`.

```sql
CREATE TABLE IF NOT EXISTS diagram_change_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_path TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('context','container','component','code')),
  changed_files TEXT NOT NULL,      -- JSON array of file paths
  affected_elements TEXT NOT NULL,  -- JSON array of AffectedElement objects
  element_counts TEXT NOT NULL,     -- JSON: {container: N, component: N, code: N}
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(repo_path, level)
);

CREATE INDEX IF NOT EXISTS idx_change_tracking_repo
  ON diagram_change_tracking(repo_path);
```

### Pattern 3: Enriched `c4-storage:state-changed` IPC Payload

**What:** Extend the existing payload (already `{ repoPath, level, state, elementId?, errorMessage? }`) with two optional fields. Backwards-compatible: existing handlers ignore unknown fields.

```typescript
// src/shared/types/changeTracking.ts
import type { C4Level } from '../../main/services/c4/types/c4Types';

export interface AffectedElement {
  level: C4Level;
  elementId: string;
  elementName: string;
  isDirect: boolean;
}

export interface StateChangedPayload {
  repoPath: string;
  level: C4Level;
  state: string;
  elementId?: string;
  errorMessage?: string;
  // Phase 7 additions:
  changedFiles?: string[];
  affectedElements?: AffectedElement[];
}
```

### Pattern 4: Zustand Store Extension

**What:** Add `affectedElements` and `changedElementCounts` to `diagramStateStore`.

```typescript
// Addition to DiagramStateStore interface
interface DiagramStateStore {
  // ... existing fields ...

  /** Map of "repoPath:level" → affected element list */
  affectedElements: Map<string, AffectedElement[]>;

  /** Map of "repoPath:level" → count of changed elements at that level */
  changedElementCounts: Map<string, number>;

  /** Set affected elements (called when state-changed event arrives) */
  setAffectedElements: (repoPath: string, level: C4Level, elements: AffectedElement[]) => void;

  /** Get element count for a specific level */
  getChangedElementCount: (repoPath: string, level: C4Level) => number;
}
```

### Anti-Patterns to Avoid

- **Triggering ts-morph re-analysis on every file change:** ts-morph `analyzeProject()` takes 500–3 000 ms. With debounce, the SLA is < 2 s from save to stale indicator. Use path heuristics; they run in < 1 ms.
- **Emitting one `c4-storage:state-changed` event per file change:** Without debounce, rapid saves trigger event storms and SQLite write contention. Always debounce before emitting.
- **Adding element mapping to `FileWatcherService` directly:** `FileWatcherService` is already responsible for watching. Separation of concerns dictates a dedicated `ChangeTrackingService`.
- **Watching the same patterns at code and component level:** The current `getFilePatterns()` uses identical glob patterns for `component` and `code` levels. Phase 7 does not need to change this — the mapping heuristic runs post-collection, so receiving the same file event for both levels is expected and handled.
- **Context level change tracking:** Context-level diagrams represent the full system boundary (package.json, tsconfig.json). Individual file→element mapping at this level is meaningless. CHNG-02 specifies Code, Component, Container — context level is intentionally excluded from element mapping.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File system watching | Custom `fs.watch` polling | chokidar 4.0.3 (already installed) | chokidar handles platform differences, rename→write sequences, `awaitWriteFinish` |
| Debouncing | Custom debounce with complex state | Plain `setTimeout`/`clearTimeout` | Sufficient for this case; avoid adding lodash |
| SQLite schema migration | Manual ALTER TABLE | better-sqlite3 `user_version` pragma (already used) | Increment `user_version` to 2 to signal new table presence |
| IPC event broadcasting | Multiple `webContents.send()` calls scattered | `BrowserWindow.getAllWindows()` loop (already used in project) | Consistent with existing `emitStateChangedEvent` pattern |

**Key insight:** The existing `FileWatcherService` + `C4StorageService` + `diagramStateStore` pipeline is already end-to-end. Phase 7 is an enrichment of that pipeline, not a replacement.

## Common Pitfalls

### Pitfall 1: Timer Leak on Service Shutdown
**What goes wrong:** Pending debounce timers keep the Node.js process alive or fire after `fileWatcherService.stopAllWatchers()`.
**Why it happens:** `setTimeout` callbacks hold references.
**How to avoid:** `ChangeTrackingService` must expose a `shutdown()` method that calls `clearTimeout` on all pending accumulators, then clear the map.
**Warning signs:** App takes > 2 s to exit after `before-quit`.

### Pitfall 2: stale State Overwriting generating State
**What goes wrong:** A file change arrives while a diagram is generating. `ChangeTrackingService` calls `updateState(..., 'stale')`, overwriting `generating`.
**Why it happens:** State machine has no guard.
**How to avoid:** In `ChangeTrackingService.flush()`, check `storage.getState(repoPath, level)` before calling `updateState`. If state is `generating`, skip the state update but still emit the change event so element counts are tracked.
**Warning signs:** Generating spinner disappears mid-generation when user saves a file.

### Pitfall 3: Path Normalization Mismatch
**What goes wrong:** `changedPath` from chokidar uses OS-native separators on Windows; comparison with stored `repoPath` (which is normalized to `/`) fails silently.
**Why it happens:** `path.join()` on Windows returns `\` separators.
**How to avoid:** Always normalize `changedPath` with `.replace(/\\/g, '/')` before storing or comparing. This pattern is already used in `C4StorageService.normalizePath()` — apply same logic in `ChangeTrackingService`.
**Warning signs:** Files never appear in `changedFiles` on Windows.

### Pitfall 4: False-Positive stale on App Launch
**What goes wrong:** `checkStalenessOnStartup()` fires, marks diagram stale, then `ChangeTrackingService` has no file list (because it only accumulates during the current session).
**Why it happens:** The startup staleness check is timestamp-based, not file-based.
**How to avoid:** On startup staleness, still emit `c4-storage:state-changed` with `changedFiles: []` and `affectedElements: []`. The renderer shows the stale indicator but no element-level breakdown — which is correct since we don't know which files changed while the app was closed. The DB `diagram_change_tracking` table will have data from the previous session if changes were tracked before app close.
**Warning signs:** Element count badge shows 0 on startup staleness even when DB has a prior tracking record.

### Pitfall 5: SQLite WAL and Two Instances Calling `updateState`
**What goes wrong:** Both `ChangeTrackingService` (via `C4StorageService.updateState`) and `C4AnalyzerService` (its own `C4StorageService` instance) write state concurrently.
**Why it happens:** The existing decision (Phase 05 Plan 05) already accepts that `C4AnalyzerService` creates its own `C4StorageService` instance and WAL handles concurrent access. Phase 7 doesn't change this — the same WAL mode protects concurrent writes.
**How to avoid:** No change needed. WAL mode is already enabled (`journal_mode = WAL`, `synchronous = FULL`). Document this decision in planning.
**Warning signs:** SQLite `SQLITE_BUSY` errors in console.

### Pitfall 6: Element ID Mapping Accuracy
**What goes wrong:** The path heuristic maps `src/main/services/gitService.ts` to component "services", which doesn't match the PlantUML element ID `Services` generated for a container diagram. Phase 8 needs to highlight `Services` in the SVG.
**Why it happens:** The `detectComponents` logic groups by directory name, but the actual rendered component name depends on what the `C4PlantUMLGenerator` used at generation time. If the generator named the element "Services", the tracking service must produce the same sanitized ID.
**How to avoid:** Reuse `sanitizeId` logic verbatim (or share it as a utility). The heuristic `cap = Services`, `sanitizeId("Services") = "Services"` — this will match.
**Warning signs:** Phase 8 SVG highlighting never highlights any elements.

## Code Examples

Verified patterns from existing codebase:

### Extending the state-changed payload (backwards-compatible)

```typescript
// In ChangeTrackingService.emitChangeEvent():
win.webContents.send('c4-storage:state-changed', {
  repoPath,
  level,
  state: 'stale',
  elementId: undefined,
  errorMessage: undefined,
  // NEW fields — existing handlers ignore them (no destructuring errors)
  changedFiles: files,
  affectedElements: elements,
});
```

### Handling the enriched payload in diagramStateStore (renderer)

```typescript
// In DiagramViewer.tsx — existing handler:
const unsubscribe = window.reef.c4Storage.onStateChanged((_, data) => {
  if (data.repoPath === repoPath) {
    setState(data.repoPath, data.level, data.state, data.elementId, data.errorMessage);
    // NEW: store element mapping
    if (data.affectedElements) {
      setAffectedElements(data.repoPath, data.level, data.affectedElements);
    }
  }
});
```

### Debounce pattern (plain Node.js)

```typescript
// Existing similar pattern in fileWatcherService uses chokidar's awaitWriteFinish.
// For ChangeTrackingService, use explicit setTimeout:
if (acc.timer) clearTimeout(acc.timer);
acc.timer = setTimeout(() => this.flush(repoPath, level, key), this.debounceMs);
```

### Getting element counts for UI (CHNG-05)

```typescript
// In DiagramStateStore:
getChangedElementCount: (repoPath, level) => {
  const key = generateKey(repoPath, level);
  const elements = get().affectedElements.get(key) || [];
  // Count only direct elements at this level
  return elements.filter(e => e.level === level && e.isDirect).length;
},
```

### SQLite upsert for change tracking

```typescript
// In C4StorageService.upsertChangeTracking():
const stmt = this.db.prepare(`
  INSERT OR REPLACE INTO diagram_change_tracking
    (repo_path, level, changed_files, affected_elements, element_counts, recorded_at)
  VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);
stmt.run(
  this.normalizePath(repoPath),
  level,
  JSON.stringify(changedFiles),
  JSON.stringify(affectedElements),
  JSON.stringify(elementCounts),
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| v1.0 TTL-based cache invalidation | v1.1 explicit state machine (`never_generated`, `generating`, `fresh`, `stale`, `error`) | Phase 5 | State machine is already in place; Phase 7 adds element-level granularity to the `stale` state |
| `diagram:stale` IPC event (raw path/level) | `c4-storage:state-changed` (full state object via `DiagramStateStore`) | Phase 5 | New pipeline already established; Phase 7 enriches the payload |
| `changedFiles` passed to `DiagramPanel` as `string[]` | Same — but currently always `[]` in production (never populated) | v1.0 stub | Phase 7 actually populates this array |

**Deprecated/outdated:**
- `diagram:stale` IPC channel: A legacy channel still listened to in `DiagramViewer.tsx:283`. It is dead code since Phase 5 switched to `c4-storage:state-changed`. Phase 7 can ignore it; Phase 9 cleanup is fine.

## Open Questions

1. **Should context level be excluded from element mapping entirely?**
   - What we know: CHNG-02 says "Code, Component, or Container elements". Context level is not listed.
   - What's unclear: Should a `package.json` change at context level still show stale without element breakdown?
   - Recommendation: Yes — context level emits `stale` state but `affectedElements: []`. This is consistent with the requirement wording.

2. **File-to-element mapping accuracy for non-TypeScript codebases**
   - What we know: `StaticAnalyzerService` uses ts-morph and only handles TypeScript/JavaScript. The `FileWatcherService` patterns watch `*.ts, *.tsx, *.js, *.jsx`.
   - What's unclear: The STATE.md blocker flags "element ID mapping accuracy" as needing validation with real TypeScript/React codebases.
   - Recommendation: The path-based heuristic (directory segment approach) is tested against Reef itself and is deterministic. The planner should include a manual validation step in the verification plan.

3. **Should `diagram_change_tracking` rows be cleared on diagram regeneration?**
   - What we know: After regeneration, state transitions to `fresh`. The change tracking data is stale.
   - What's unclear: Does leaving stale change-tracking rows confuse Phase 8 visualization?
   - Recommendation: Clear `diagram_change_tracking` rows when state transitions to `fresh` or `generating`. Add `clearChangeTracking(repoPath, level)` to `C4StorageService`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (root level) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHNG-01 | Stale indicator appears within 2 s of file save | unit | `npm run test:unit -- --grep "CHNG-01"` | ❌ Wave 0 |
| CHNG-02 | Changed files map to Code/Component/Container elements | unit | `npm run test:unit -- --grep "CHNG-02"` | ❌ Wave 0 |
| CHNG-03 | Changes bubble up hierarchy | unit | `npm run test:unit -- --grep "CHNG-03"` | ❌ Wave 0 |
| CHNG-04 | File changes debounced, no API spam | unit | `npm run test:unit -- --grep "CHNG-04"` | ❌ Wave 0 |
| CHNG-05 | Count of changed elements per C4 level | unit | `npm run test:unit -- --grep "CHNG-05"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/main/services/changeTrackingService.test.ts` — covers CHNG-01, CHNG-02, CHNG-03, CHNG-04
- [ ] `tests/unit/main/services/storageService.changeTracking.test.ts` — covers CHNG-05 (DB persistence of element counts)
- [ ] `tests/unit/renderer/stores/diagramStateStore.affectedElements.test.ts` — covers CHNG-05 (store extension)

## Sources

### Primary (HIGH confidence)
- Codebase direct read — `src/main/services/fileWatcherService.ts` — chokidar 4.0.3 usage, debounce pattern, IPC emission
- Codebase direct read — `src/main/services/c4/c4StorageService.ts` — SQLite schema, WAL mode, `updateState` API
- Codebase direct read — `src/main/services/c4/c4PlantUMLGenerator.ts` — `detectComponents`, `sanitizeId`, `getContainerPath` heuristics
- Codebase direct read — `src/renderer/stores/diagramStateStore.ts` — Zustand store structure, key format, state transitions
- Codebase direct read — `src/main/preload.ts` — existing IPC API surface
- Codebase direct read — `src/shared/types/diagramState.ts` — `DiagramState` type, `StoredDiagram` interface
- Codebase direct read — `.planning/STATE.md` — Phase 7 readiness blockers documented

### Secondary (MEDIUM confidence)
- chokidar v4 GitHub README — `awaitWriteFinish` option is confirmed stable in v4; `stabilityThreshold` unit is milliseconds

### Tertiary (LOW confidence)
- General knowledge: `setTimeout`-based debounce is universally supported in Node.js — no verification source needed; this is built-in language behavior

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in active use in this codebase
- Architecture: HIGH — derived directly from existing patterns in `fileWatcherService`, `c4StorageService`, and `c4PlantUMLGenerator`
- Pitfalls: HIGH — pitfalls 1–3 derived from code reading; pitfalls 4–6 from understanding the existing state machine and concurrent access decisions documented in STATE.md

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — stable domain, no fast-moving dependencies)
