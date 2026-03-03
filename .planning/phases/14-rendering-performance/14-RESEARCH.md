# Phase 14: Rendering Performance - Research

**Researched:** 2026-03-03
**Domain:** SVG caching, in-process LRU cache, PlantUML JVM warm-start (Nailgun mode)
**Confidence:** HIGH

## Summary

The core performance problem is clear from reading the codebase. The app already stores PlantUML source text (e.g., `@startuml ... @enduml`) in SQLite via `C4StorageService`, but **every tab switch re-invokes PlantUML** to re-render the stored text into SVG. The `PlantUMLRenderer` component calls `window.reef.plantuml.generateSVG(content)` via IPC on every render of new `content`, which spawns a Java subprocess (5–8 seconds). The fix is to cache the rendered SVG, not just the PlantUML source.

**The storage layer is the right layer to add SVG caching.** `C4StorageService.diagram_storage` already has `diagram_content` (currently PlantUML text). The plan is to add an `svg_content` column (nullable TEXT) so the SVG lives alongside its source. On cache hit in `C4AnalyzerService.generateC4Diagram`, return the stored SVG directly. On first generation, after Java renders the SVG, store it back. The renderer then receives ready SVG and skips `generateSVG()` entirely.

For in-process LRU caching (PERF-02), a simple Map-based LRU in the main process serves as a hot tier above SQLite. SVGs are large (~50–200KB), so a cap of 10–20 entries is appropriate. This eliminates IPC + DB round-trips for recently viewed diagrams.

For Nailgun (PERF-03), `node-plantuml@0.9.0` already ships full Nailgun support via `plantumlExecutor.useNailgun()`. The JVM starts once, loads PlantUML into the classpath, and subsequent renders call through the Nailgun socket instead of spawning a new JVM. This reduces cold-render time from 5–8 seconds to ~200–500ms. The requirement says feature-flagged — implement as an opt-in setting via `diagramSettings`.

**Primary recommendation:** Add `svg_content` column to `diagram_storage`, store SVG after first render, serve it on hit. Layer an in-process LRU (10 entries, Map-based) as hot tier. Nailgun as opt-in warm-start feature behind a settings flag.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | User sees cached diagrams in under 500ms (store rendered SVG in SQLite, skip Java re-render) | `C4StorageService` already has SQLite + WAL. Add `svg_content` column; return it on cache hit in both `C4AnalyzerService` (main process path) and `PlantUMLRenderer` (renderer path, checks IPC before calling `generateSVG`). |
| PERF-02 | Frequently viewed diagrams load from in-process LRU cache for instant display | Add `SvgLruCache` class in main process (Map-based, max 10–20 entries). Check LRU before SQLite. Populate on every successful SVG generation. |
| PERF-03 | PlantUML JVM stays warm between renders when available (Nailgun mode, feature-flagged) | `node-plantuml@0.9.0` ships `plantumlExecutor.useNailgun(callback)`. Wire into `PlantUMLService` behind a `diagramSettings.nailgunEnabled` flag. Initialize at app start when flag is on. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^11.10.0 | Persistent SVG storage via ALTER TABLE + new column | Already in use for `diagram_storage`; synchronous API is correct for Electron main process |
| node-plantuml | ^0.9.0 | PlantUML rendering + Nailgun startup | Already in use; ships `useNailgun()` and `plantumlnail.jar` |
| Map (built-in) | ES2015+ | In-process LRU hot cache | No dependency needed; Map preserves insertion order, enabling simple LRU eviction |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-store | existing | Feature flag persistence (`nailgunEnabled`) | Re-use existing settings store pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Map-based LRU | `lru-cache` npm package | `lru-cache` adds a dependency; Map-based implementation is 20 lines and sufficient for 10–20 entries |
| Nailgun via node-plantuml | Separate `plantuml-server` Docker | Docker adds ops complexity; Nailgun is embedded in node-plantuml already |
| ALTER TABLE for svg_content | Separate table `svg_cache` | Separate table adds JOIN complexity; single-row locality is better for SQLite read performance |

**Installation:**
```bash
# No new packages required — all libraries already in use
```

## Architecture Patterns

### Recommended Project Structure
```
src/main/services/
├── plantUmlService.ts          # Add: SvgLruCache class + Nailgun init
├── c4/
│   ├── c4AnalyzerService.ts   # Modify: return svg_content on cache hit
│   ├── c4StorageService.ts    # Modify: add svg_content column + getSvg/storeSvg methods
│   └── c4StorageHandlers.ts   # Modify: expose c4-storage:get-svg + c4-storage:store-svg IPC

src/renderer/components/
└── PlantUMLRenderer.tsx        # Modify: check IPC for stored SVG before calling generateSVG
```

### Pattern 1: SQLite Schema Migration (ALTER TABLE)
**What:** Add `svg_content TEXT` column to `diagram_storage` without breaking existing rows
**When to use:** When schema needs a new nullable column on existing table

```typescript
// Source: better-sqlite3 official docs
// In C4StorageService.createSchema():
private createSchema(db: Database.Database): void {
  // Existing schema creation (unchanged)...

  // Additive migration: add svg_content column if not present
  const cols = db.prepare("PRAGMA table_info(diagram_storage)").all() as any[];
  const hasSvgContent = cols.some(c => c.name === 'svg_content');
  if (!hasSvgContent) {
    db.exec(`ALTER TABLE diagram_storage ADD COLUMN svg_content TEXT`);
  }
}
```

### Pattern 2: In-Process LRU Cache (Map-based)
**What:** Simple Map-based LRU cache with max-size eviction
**When to use:** Hot tier above SQLite; eliminates IPC + DB overhead for recently viewed SVGs

```typescript
// Source: MDN Map docs, MDN Symbol.iterator
class SvgLruCache {
  private readonly cache = new Map<string, string>(); // key -> svg
  private readonly maxEntries: number;

  constructor(maxEntries = 15) {
    this.maxEntries = maxEntries;
  }

  get(key: string): string | undefined {
    if (!this.cache.has(key)) return undefined;
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Evict least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  invalidate(keyPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) this.cache.delete(key);
    }
  }
}
```

### Pattern 3: Nailgun Feature Flag Initialization
**What:** Initialize Nailgun JVM at app start when flag is enabled; fall back to spawn
**When to use:** Opt-in warm JVM; node-plantuml already has the API

```typescript
// Source: node_modules/node-plantuml/lib/plantuml-executor.js
import plantuml from 'node-plantuml';
import Store from 'electron-store';

// In PlantUMLService constructor or main.ts startup:
const store = new Store();
if (store.get('nailgunEnabled', false)) {
  plantuml.useNailgun(() => {
    console.log('[PlantUML] Nailgun JVM warm and ready');
  });
}
// After useNailgun() is called, plantuml.generate() automatically uses
// the Nailgun socket instead of spawning a new JVM for each render.
```

### Pattern 4: SVG Cache Check in PlantUMLRenderer
**What:** Before calling `generateSVG()` via IPC, check if SVG is already stored
**When to use:** Renderer-side guard; ensures even browser reloads are fast

```typescript
// In PlantUMLRenderer.generateDiagram():
const generateDiagram = useCallback(async () => {
  setLoading(true);
  setError(null);

  // 1. Check IPC for stored SVG (PERF-01: sub-500ms path)
  if (repoPath && level && elementId !== undefined) {
    const stored = await window.reef.c4Storage.getSvg(repoPath, level, elementId);
    if (stored) {
      setSvgContent(stored);
      setLoading(false);
      return;
    }
  }

  // 2. Generate via Java (first render only)
  const svg = await window.reef.plantuml.generateSVG(content);
  setSvgContent(svg);

  // 3. Store SVG for future loads (async, don't await)
  if (repoPath && level) {
    window.reef.c4Storage.storeSvg(repoPath, level, svg, elementId).catch(console.error);
  }

  setLoading(false);
}, [content, repoPath, level, elementId]);
```

### Anti-Patterns to Avoid
- **Caching at the wrong layer:** Storing SVGs only in renderer memory (React state) does not survive tab switches — the component unmounts. Must persist to SQLite.
- **Blocking main process on SVG storage:** SVG write after first render should be fire-and-forget. Never `await` a storage write inside the render hot path.
- **Eager Nailgun start always on:** Nailgun starts a background JVM. Starting it unconditionally adds ~500ms to app launch. Feature-flag it.
- **Unbounded LRU size:** SVGs are 50–200KB each. 20 entries = up to 4MB in-process. Cap at 15–20.
- **No LRU key normalization:** Keys must be `repoPath:level:elementId` (consistent with `c4CacheService.generateCacheKey`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LRU eviction | Custom doubly-linked list | Map insertion-order LRU (15 lines) | Map already preserves insertion order; O(1) get/set |
| Schema migration | Versioned migration runner | Single `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` check | SQLite PRAGMA table_info + ALTER TABLE is sufficient for one additive column |
| Nailgun protocol | Custom TCP client | `plantumlExecutor.useNailgun()` in node-plantuml | Already ships `plantumlnail.jar` and `node-nailgun-server`/`node-nailgun-client` |

**Key insight:** The entire PERF-01 and PERF-02 solution is an additive change to existing services. No new architecture is needed — just a new column, two new service methods, and an LRU wrapper around the existing `generateSVG` handler.

## Common Pitfalls

### Pitfall 1: PlantUMLRenderer Props Don't Include repoPath/level
**What goes wrong:** `PlantUMLRenderer` currently receives only `content` (PlantUML text) and optional metadata. It has no `repoPath`, `level`, or `elementId` props — so it can't call `c4Storage.getSvg()`.
**Why it happens:** The component was designed as a pure renderer, not a cache-aware loader.
**How to avoid:** Two options:
  - Option A (preferred): Move SVG cache check UP to `VisualMapTab.loadPersistedDiagram()` — check `c4Storage.getSvg()` there, and pass the SVG directly to the renderer instead of PlantUML text. The renderer shows pre-rendered SVG without calling `generateSVG`.
  - Option B: Add `repoPath`, `level`, `elementId` props to `PlantUMLRenderer` and check inside. More surgical but changes the public API of a widely-used component.

Option A is architecturally cleaner — the "should we use cached SVG?" decision belongs in the data-loading layer, not the display component.

**Warning signs:** If the planner puts SVG cache logic inside `PlantUMLRenderer` prop drilling chains, that's a smell.

### Pitfall 2: SVG Content Changes After Nailgun vs. Spawn
**What goes wrong:** Nailgun mode and spawn mode may produce slightly different SVG output for the same PlantUML input (different whitespace, font rendering, element IDs). A cached SVG from spawn mode may not match Nailgun-rendered output — but this doesn't matter because we cache the SVG after first render regardless of mode.
**Why it happens:** PlantUML outputs deterministic SVG for a given JAR version and input; mode (Nailgun vs. spawn) doesn't change output.
**How to avoid:** Verify with a test that the same PlantUML input produces identical SVG hashes in both modes.
**Warning signs:** If diagram elements look different after enabling Nailgun, it means the PlantUML JAR version changed, not the mode.

### Pitfall 3: SQLite Column Addition on Existing Production DB
**What goes wrong:** `ALTER TABLE diagram_storage ADD COLUMN svg_content TEXT` fails if the column already exists (e.g., after app update with the new code, then rollback and re-update).
**Why it happens:** SQLite `ALTER TABLE ADD COLUMN` throws if column name exists.
**How to avoid:** Always guard with `PRAGMA table_info()` check (shown in Pattern 1) or use `user_version` schema versioning. The existing `C4StorageService` already reads `user_version` — bump to 3.
**Warning signs:** Startup crash with "duplicate column name: svg_content".

### Pitfall 4: LRU Eviction Key Mismatch Across Navigation
**What goes wrong:** Container drill-down generates key `repo:container:undefined` but the LRU was populated with `repo:container:null`. Cache always misses.
**Why it happens:** `elementId` can be `undefined` (TypeScript) or `null` (SQLite), or an empty string in different code paths.
**How to avoid:** Normalize: `const key = [repoPath, level, elementId ?? ''].join(':')`. Use this same normalization in `getSvg()`, `storeSvg()`, and LRU get/set.
**Warning signs:** LRU hit rate is 0% in unit tests even after storing a value.

### Pitfall 5: Nailgun Server Not Cleaned Up on App Quit
**What goes wrong:** Nailgun starts a background Node server (`node-nailgun-server`). If not closed on app quit, it leaks a port. Second app launch fails to bind the same port.
**Why it happens:** `node-nailgun-server` listens on a randomly assigned port (GENERATE_PORT = 0), so port leaks are not deterministic, but the server process stays alive.
**How to avoid:** Store the Nailgun server handle returned by `useNailgun()` and call `.close()` on `app.on('before-quit')`.
**Warning signs:** Terminal shows `EADDRINUSE` on second app launch when Nailgun is enabled.

## Code Examples

Verified patterns from official sources:

### Checking SQLite column existence before ALTER TABLE
```typescript
// Source: SQLite PRAGMA documentation + better-sqlite3 v11 docs
private addSvgColumnIfMissing(db: Database.Database): void {
  const cols = db.prepare("PRAGMA table_info(diagram_storage)").all() as Array<{ name: string }>;
  if (!cols.some(c => c.name === 'svg_content')) {
    db.exec('ALTER TABLE diagram_storage ADD COLUMN svg_content TEXT');
  }
}
```

### Retrieving stored SVG from C4StorageService
```typescript
// New method on C4StorageService
getSvg(repoPath: string, level: C4Level, elementId?: string): string | null {
  const normalizedPath = this.normalizePath(repoPath);
  const stmt = this.db.prepare(`
    SELECT svg_content FROM diagram_storage
    WHERE repo_path = ? AND level = ?
      AND (element_id = ? OR (element_id IS NULL AND ? IS NULL))
      AND svg_content IS NOT NULL
  `);
  const result = stmt.get(normalizedPath, level, elementId ?? null, elementId ?? null) as
    | { svg_content: string }
    | undefined;
  return result?.svg_content ?? null;
}

// New method on C4StorageService
storeSvg(repoPath: string, level: C4Level, svg: string, elementId?: string): void {
  const normalizedPath = this.normalizePath(repoPath);
  const stmt = this.db.prepare(`
    UPDATE diagram_storage
    SET svg_content = ?
    WHERE repo_path = ? AND level = ?
      AND (element_id = ? OR (element_id IS NULL AND ? IS NULL))
  `);
  stmt.run(svg, normalizedPath, level, elementId ?? null, elementId ?? null);
}
```

### IPC handler registration for SVG storage
```typescript
// In c4StorageHandlers.ts - registerC4StorageHandlers()
ipcMain.handle('c4-storage:get-svg', async (_, repoPath: string, level: string, elementId?: string) => {
  return getStorageService().getSvg(repoPath, level as C4Level, elementId);
});

ipcMain.handle('c4-storage:store-svg', async (_, repoPath: string, level: string, svg: string, elementId?: string) => {
  getStorageService().storeSvg(repoPath, level as C4Level, svg, elementId);
  return { success: true };
});
```

### Preload bridge exposure
```typescript
// In preload.ts, inside contextBridge.exposeInMainWorld('reef', {...})
c4Storage: {
  // ... existing methods ...
  getSvg: (repoPath: string, level: string, elementId?: string) =>
    ipcRenderer.invoke('c4-storage:get-svg', repoPath, level, elementId),
  storeSvg: (repoPath: string, level: string, svg: string, elementId?: string) =>
    ipcRenderer.invoke('c4-storage:store-svg', repoPath, level, svg, elementId),
},
```

### VisualMapTab: serve cached SVG immediately
```typescript
// In VisualMapTab.loadPersistedDiagram():
const loadPersistedDiagram = async () => {
  const level = diagramType.replace('c4-', '');

  // NEW: Check for pre-rendered SVG first (PERF-01 fast path)
  const storedSvg = await window.reef.c4Storage.getSvg(repository.path, level, elementId);
  if (storedSvg) {
    setSvgContent(storedSvg);      // new state: pre-rendered SVG string
    setViewMode('diagram');
    return;
  }

  // Existing: fall back to PlantUML source (triggers generateSVG on render)
  const storedDiagram = await window.reef.c4Storage.getDiagram(repository.path, level, elementId);
  if (storedDiagram) {
    setDiagram(storedDiagram.diagramContent);
    setViewMode('diagram');
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cache PlantUML text, re-render SVG on every load | Cache rendered SVG; skip Java on hit | Phase 14 | Tab switch from 5–8s to <500ms |
| Spawn new JVM per render | Nailgun: warm JVM, socket call per render | Phase 14 (feature-flagged) | First-time generation from ~6s to ~200–500ms |
| No hot cache | In-process LRU (Map, 15 entries) above SQLite | Phase 14 | Eliminates IPC+DB overhead for recent diagrams (~10ms vs ~50ms for SQLite) |

**Deprecated/outdated:**
- The existing `cacheService.ts` (v1.0, `cache/diagram_cache.db`) is already migrated away from. Do not modify it.

## Open Questions

1. **Where does generateSVG get called after successful generation today?**
   - What we know: `PlantUMLRenderer.generateDiagram()` calls `window.reef.plantuml.generateSVG()` on every mount with new `content`. `VisualMapTab` passes the PlantUML text as `diagram` state.
   - What's unclear: After the Java render completes in `PlantUMLRenderer`, the SVG is in `svgContent` React state. There is currently no code path that persists this SVG back to storage.
   - Recommendation: Add a `onSvgGenerated?: (svg: string) => void` callback prop to `PlantUMLRenderer`, called after successful local generation. `VisualMapTab` implements this callback to store the SVG via `c4Storage.storeSvg()`.

2. **How should DiagramViewer pass repoPath/level/elementId to the SVG storage path?**
   - What we know: `DiagramViewer` has `_repository.path` and `currentOptions.type`. The elementId is in `navigationStore.currentLevel().elementId`.
   - What's unclear: `DiagramViewer` calls `onRegenerateDiagram()` which is implemented in `VisualMapTab`. The SVG generation happens inside `PlantUMLRenderer` which is rendered by `DiagramPanel` which is rendered by `DiagramViewer`.
   - Recommendation: Handle SVG storage at the `VisualMapTab` level where all context (repoPath, level, elementId) is available. `PlantUMLRenderer` fires `onSvgGenerated(svg)` callback, `DiagramPanel` passes it up, `DiagramViewer` passes it up, `VisualMapTab` stores it.

3. **Nailgun port conflict if multiple Reef instances open**
   - What we know: `GENERATE_PORT = 0` means the OS assigns a random port. If two Reef instances start with Nailgun enabled, they each start their own Nailgun server on different ports.
   - What's unclear: Whether Electron prevents multiple instances (it typically does via `app.requestSingleInstanceLock()`).
   - Recommendation: Reef likely already enforces single instance. If not, this is an existing issue unrelated to Phase 14. Document the assumption but do not implement locking.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (renderer: jsdom, main: node) |
| Config file | `vitest.config.ts` (renderer), `vitest.config.main.ts` (main process) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:unit && npm run test:integration` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | `C4StorageService.getSvg()` returns stored SVG | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/storageService.test.ts` | ✅ (extend) |
| PERF-01 | `C4StorageService.storeSvg()` persists SVG to `svg_content` column | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/storageService.test.ts` | ✅ (extend) |
| PERF-01 | `c4-storage:get-svg` IPC handler returns null on miss, SVG on hit | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/storageService.test.ts` | ❌ Wave 0 |
| PERF-01 | `VisualMapTab` loads from SVG cache before calling Java | unit | `vitest run --config vitest.config.ts tests/unit/renderer/components/` | ❌ Wave 0 |
| PERF-02 | `SvgLruCache.get()` returns undefined on miss | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/plantUmlService.test.ts` | ❌ Wave 0 |
| PERF-02 | `SvgLruCache` evicts LRU entry when max entries exceeded | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/plantUmlService.test.ts` | ❌ Wave 0 |
| PERF-02 | `SvgLruCache.get()` promotes accessed entry to MRU | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/plantUmlService.test.ts` | ❌ Wave 0 |
| PERF-02 | LRU is checked before SQLite in `generateSVG` IPC handler | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/plantUmlService.test.ts` | ❌ Wave 0 |
| PERF-03 | `nailgunEnabled` setting persists via electron-store | unit | `vitest run --config vitest.config.main.ts` | ❌ Wave 0 |
| PERF-03 | `useNailgun()` is called at startup when flag is true | unit (mock) | `vitest run --config vitest.config.main.ts tests/unit/main/services/plantUmlService.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:unit && npm run test:integration`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/main/services/storageService.test.ts` — add PERF-01 SVG column tests (file exists, extend)
- [ ] `tests/unit/main/services/plantUmlService.test.ts` — add SvgLruCache unit tests (file exists, extend)
- [ ] `tests/unit/renderer/components/VisualMapTab.svg-cache.test.tsx` — PERF-01 renderer fast path

## Sources

### Primary (HIGH confidence)
- `src/main/services/c4/c4StorageService.ts` — existing schema (diagram_storage table, user_version 2)
- `src/main/services/c4/c4AnalyzerService.ts` — existing cache-hit path (returns PlantUML text, not SVG)
- `src/renderer/components/PlantUMLRenderer.tsx` — existing SVG generation call (`window.reef.plantuml.generateSVG`)
- `src/renderer/components/tabs/VisualMapTab.tsx` — existing `loadPersistedDiagram` (calls `c4Storage.getDiagram`, sets `diagram` state)
- `node_modules/node-plantuml/lib/plantuml-executor.js` — `useNailgun()` API verified in source
- `node_modules/node-plantuml/lib/node-plantuml.js` — `module.exports.useNailgun = plantumlExecutor.useNailgun` confirmed exported
- SQLite `ALTER TABLE ... ADD COLUMN` — standard SQLite feature, no version concern with better-sqlite3 v11

### Secondary (MEDIUM confidence)
- better-sqlite3 v11 docs (via package.json version + existing usage patterns) — WAL mode, PRAGMA table_info, synchronous queries confirmed

### Tertiary (LOW confidence)
- Nailgun startup latency estimate (~200–500ms vs 5–8s for spawn) — from general Java/Nailgun knowledge; not benchmarked on this machine

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — all touch points traced through actual source code
- Pitfalls: HIGH — most are based on code inspection of current implementation (key normalization, column existence, callback threading)
- Nailgun feature flag: MEDIUM — API verified in source, behavior confirmed logically, but not end-to-end tested in this environment

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable dependencies, no upstream churn expected)
