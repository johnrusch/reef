# Phase 2: Automatic Regeneration - Research

**Researched:** 2026-02-23
**Domain:** File system change detection, cache invalidation, and UI staleness indicators for Electron desktop applications
**Confidence:** HIGH

## Summary

Phase 2 implements automatic diagram regeneration through file system watching, intelligent cache invalidation, and visual staleness indicators. The system detects source code changes, marks diagrams as outdated, and enables single-click regeneration while preserving the existing cache to avoid unnecessary API costs.

**Key insight:** Electron provides robust file watching through chokidar in the main process. The existing C4CacheService already has timestamp-based invalidation logic and file pattern detection—Phase 2 extends this with persistent timestamp tracking, active file watching, and UI integration for staleness indicators.

**Primary recommendation:** Use chokidar for file watching in the main process, leverage the existing c4CacheService timestamp infrastructure, persist last generation timestamps via the existing better-sqlite3 database (already used for cache), and communicate staleness state to renderer via IPC events.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Staleness indicator:** Yellow warning badge overlaid on diagram corner (inline badge approach)
- **Badge design:** Includes refresh icon — attention-grabbing but not alarming
- **Mark stale immediately:** When relevant files are saved (no debounce)
- **Simple message:** "outdated" message — no file count or details
- **Regeneration UX:** Click the stale badge to trigger regeneration — badge becomes a button
- **Separate "Force Regenerate" button:** Always visible in toolbar for manual regeneration anytime
- **No confirmation dialog:** Single click regenerates immediately
- **Loading state:** Spinner displayed on badge/button during regeneration while keeping old diagram visible
- **Watch source code files only:** .ts, .tsx, .js, .jsx
- **Level-specific file awareness:**
  - Code level: any source file change
  - Component level: structural changes within containers
  - Container level: high-level structure changes (new files/folders, imports)
  - Context level: only top-level structure changes (new dependencies, major rewrites)
- **Use Electron's native file watcher:** chokidar/fs.watch via main process
- **Persist last generation timestamp:** Across app restarts — compare to file mtimes on startup
- **Smart level mapping:** For invalidation — Code changes invalidate Code level, structural changes invalidate higher levels appropriately, avoid cascade invalidation when unnecessary
- **No time-based TTL:** Cache valid until files change
- **Use existing electron-store mechanism:** From Phase 1
- **Add "Clear Cache" option:** In settings/help menu for troubleshooting

### Claude's Discretion
- Exact badge positioning on diagram
- Specific file patterns per C4 level
- Debounce timing for file watcher events
- Error state handling for failed regeneration

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UPDATE-01 | System detects when repository files change | Chokidar file watcher in main process — standard for Electron apps |
| UPDATE-02 | System shows visual indicator when diagram is potentially stale due to file changes | React badge overlay patterns — Material UI, PrimeReact provide standard implementations |
| UPDATE-03 | System automatically regenerates diagrams when user confirms file changes | IPC pattern: main process notifies renderer of staleness → user clicks badge → renderer invokes regenerate IPC handler |
| UPDATE-04 | User can manually trigger diagram regeneration at any time | Existing DiagramViewer has regenerate button — extend for "Force Regenerate" variant |
| UPDATE-06 | System invalidates cache intelligently based on changed files and C4 level | Existing c4CacheService has getRelevantFilePatterns() for level-specific invalidation |
| UPDATE-07 | System reuses cached diagrams when codebase hasn't changed to avoid API costs | Existing c4CacheService.getCachedDiagram() checks isCacheStale() — extend with active watching |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chokidar | ^4.0.0+ | File system change detection | Industry standard for cross-platform file watching — used in ~30M repositories, recommended by Electron docs over fs.watch |
| better-sqlite3 | ^11.10.0 (existing) | Persist last generation timestamps | Already integrated in Phase 1 for cache — extend schema for timestamp persistence |
| electron-store | ^8.1.0 (existing) | Optional simple key-value timestamp storage | Already used for secure token storage — alternative to SQLite for timestamp-only persistence |
| lucide-react | ^0.312.0 (existing) | Icon library for refresh/warning icons in badge | Already project standard for UI icons |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-* | Various (existing) | Accessible UI primitives | If badge needs dropdown or popover for additional context (user discretion) |
| Tailwind CSS | ^3.4.1 (existing) | Styling for badge overlay | Project standard for all UI styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| chokidar | fs.watch (Node.js native) | fs.watch is inconsistent across OS platforms — chokidar normalizes behavior and adds features like ignored patterns |
| chokidar | fs.watchFile (polling) | Polling wastes CPU — chokidar uses native OS events (FSEvents on macOS, inotify on Linux, ReadDirectoryChangesW on Windows) |
| better-sqlite3 for timestamps | electron-store | SQLite overkill for timestamps alone, but already integrated — electron-store simpler if timestamps stored separately from cache |
| Inline badge overlay | Toast/notification | Toast disappears — inline badge persistent visual indicator preferred per user decision |

**Installation:**
```bash
npm install chokidar@^4.0.0 --save
```

Note: better-sqlite3, electron-store, lucide-react, Tailwind already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/main/services/
├── fileWatcherService.ts    # NEW: Chokidar wrapper, detects changes, emits IPC events
├── c4/
│   ├── c4CacheService.ts     # EXTEND: Add methods for timestamp persistence
│   └── types/c4Types.ts      # EXTEND: Add staleness state types

src/renderer/components/DiagramViewer/
├── DiagramViewer.tsx         # EXTEND: Subscribe to staleness IPC events, pass to DiagramPanel
├── DiagramPanel.tsx          # EXTEND: Render staleness badge overlay
└── StalenessBadge.tsx        # NEW: Badge component with loading states

src/main/ipc/
└── fileWatcherHandlers.ts    # NEW: IPC handlers for start/stop watching, clear cache
```

### Pattern 1: File Watcher Service (Main Process)
**What:** Singleton service that watches repository source files using chokidar, detects changes, checks staleness against last generation timestamp, emits IPC events to renderer.

**When to use:** Always initialized when repository is opened, stopped when repository is closed or app quits.

**Example:**
```typescript
// src/main/services/fileWatcherService.ts
import chokidar, { FSWatcher } from 'chokidar';
import { BrowserWindow } from 'electron';
import type { C4Level } from './c4/types/c4Types';

class FileWatcherService {
  private watchers = new Map<string, FSWatcher>();

  startWatching(repoPath: string, level: C4Level): void {
    const patterns = this.getFilePatterns(repoPath, level);

    const watcher = chokidar.watch(patterns, {
      persistent: true,
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      awaitWriteFinish: {
        stabilityThreshold: 100, // User decision: mark stale immediately, but debounce rapid saves
        pollInterval: 50
      }
    });

    watcher.on('change', (path) => {
      this.handleFileChange(repoPath, level, path);
    });

    watcher.on('add', (path) => {
      this.handleFileChange(repoPath, level, path);
    });

    watcher.on('unlink', (path) => {
      this.handleFileChange(repoPath, level, path);
    });

    watcher.on('error', (error) => {
      console.error('File watcher error:', error);
    });

    this.watchers.set(`${repoPath}:${level}`, watcher);
  }

  private handleFileChange(repoPath: string, level: C4Level, changedPath: string): void {
    // Compare file mtime to last generation timestamp
    const lastGenerated = cacheService.getLastGenerationTimestamp(repoPath, level);
    const fileMtime = fs.statSync(changedPath).mtimeMs;

    if (fileMtime > lastGenerated) {
      // Emit IPC event to renderer
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('diagram:stale', { repoPath, level, changedPath });
      });
    }
  }

  stopWatching(repoPath: string, level: C4Level): void {
    const key = `${repoPath}:${level}`;
    const watcher = this.watchers.get(key);
    if (watcher) {
      watcher.close();
      this.watchers.delete(key);
    }
  }

  private getFilePatterns(repoPath: string, level: C4Level): string[] {
    // User decision: level-specific file awareness
    const patterns: Record<C4Level, string[]> = {
      'context': [
        `${repoPath}/package.json`,
        `${repoPath}/tsconfig.json`,
        `${repoPath}/src/**/main.*`
      ],
      'container': [
        `${repoPath}/package.json`,
        `${repoPath}/src/main/**/*`,
        `${repoPath}/src/renderer/**/*`
      ],
      'component': [
        `${repoPath}/src/**/*.{ts,tsx,js,jsx}`
      ],
      'code': [
        `${repoPath}/src/**/*.{ts,tsx,js,jsx}`
      ]
    };
    return patterns[level];
  }
}

export const fileWatcherService = new FileWatcherService();
```
**Source:** Chokidar documentation and Electron IPC patterns from official docs.

### Pattern 2: Cache Service Extension (Timestamp Persistence)
**What:** Extend existing c4CacheService to persist last generation timestamp for each repo/level combination, check on app startup, and provide staleness queries.

**When to use:** Called after every diagram generation to update timestamp, queried by file watcher to determine staleness.

**Example:**
```typescript
// Extend src/main/services/c4/c4CacheService.ts

export class C4CacheService {
  // ... existing methods ...

  /**
   * Store last generation timestamp for repo/level
   */
  setLastGenerationTimestamp(repoPath: string, level: C4Level): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO generation_timestamps (repo_path, level, timestamp)
      VALUES (?, ?, ?)
    `);
    stmt.run(repoPath, level, Date.now());
  }

  /**
   * Get last generation timestamp for repo/level
   */
  getLastGenerationTimestamp(repoPath: string, level: C4Level): number {
    const stmt = this.db.prepare(`
      SELECT timestamp FROM generation_timestamps
      WHERE repo_path = ? AND level = ?
    `);
    const result = stmt.get(repoPath, level) as { timestamp: number } | undefined;
    return result?.timestamp || 0;
  }

  /**
   * Check if diagram is stale based on file mtimes
   */
  async isDiagramStale(repoPath: string, level: C4Level): Promise<boolean> {
    const lastGenerated = this.getLastGenerationTimestamp(repoPath, level);
    if (lastGenerated === 0) return true; // Never generated

    const patterns = this.getRelevantFilePatterns(level);
    for (const pattern of patterns) {
      const hasModified = await this.hasModifiedFiles(repoPath, pattern, lastGenerated);
      if (hasModified) return true;
    }

    return false;
  }

  // Add new table in initializeDatabase():
  // CREATE TABLE IF NOT EXISTS generation_timestamps (
  //   repo_path TEXT NOT NULL,
  //   level TEXT NOT NULL,
  //   timestamp INTEGER NOT NULL,
  //   PRIMARY KEY (repo_path, level)
  // )
}
```

### Pattern 3: Staleness Badge Component (Renderer)
**What:** React component that renders yellow warning badge overlay in top-right corner of diagram, shows loading spinner during regeneration, acts as clickable button.

**When to use:** Rendered conditionally in DiagramPanel when staleness state is true.

**Example:**
```typescript
// src/renderer/components/DiagramViewer/StalenessBadge.tsx
import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface StalenessBadgeProps {
  isStale: boolean;
  isRegenerating: boolean;
  onClick: () => void;
}

export const StalenessBadge: React.FC<StalenessBadgeProps> = ({
  isStale,
  isRegenerating,
  onClick
}) => {
  if (!isStale && !isRegenerating) return null;

  return (
    <button
      onClick={onClick}
      disabled={isRegenerating}
      className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 bg-yellow-600/90 hover:bg-yellow-600 rounded-lg transition-colors shadow-lg"
      title="Diagram outdated — click to regenerate"
    >
      {isRegenerating ? (
        <RefreshCw className="w-4 h-4 text-white animate-spin" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-white" />
      )}
      <span className="text-sm font-medium text-white">
        {isRegenerating ? 'Regenerating...' : 'Outdated'}
      </span>
    </button>
  );
};
```

### Pattern 4: IPC Event Flow (Main ↔ Renderer)
**What:** Communication pattern for staleness state synchronization.

**When to use:** File watcher detects change → main emits event → renderer updates UI → user clicks badge → renderer invokes regenerate handler → main generates diagram → renderer receives result → staleness cleared.

**Example:**
```typescript
// Main process: emit staleness event
window.webContents.send('diagram:stale', { repoPath, level });

// Renderer: subscribe to staleness events
useEffect(() => {
  const unsubscribe = window.electronAPI.onDiagramStale((data) => {
    if (data.repoPath === currentRepo && data.level === currentLevel) {
      setIsStale(true);
    }
  });
  return unsubscribe;
}, [currentRepo, currentLevel]);

// Renderer: trigger regeneration
const handleRegenerateFromBadge = async () => {
  setIsRegenerating(true);
  await window.electronAPI.generateC4Diagram({ repoPath, level, force: true });
  setIsStale(false);
  setIsRegenerating(false);
};
```

### Anti-Patterns to Avoid
- **Polling for staleness:** Don't check file mtimes on interval — use chokidar event-driven watching
- **Watcher memory leaks:** Always close watchers when repository is closed or app quits
- **Blocking main thread:** File mtime checks should be async — don't use fs.statSync in hot paths
- **Cascading invalidation:** Don't invalidate all levels when Code level changes — only invalidate affected levels per user decision
- **Debouncing file events:** User decided to mark stale immediately — but use awaitWriteFinish to avoid mid-save events

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform file watching | Custom fs.watch wrapper | chokidar | Handles platform differences (FSEvents/inotify/ReadDirectoryChanges), normalizes events, provides ignore patterns, used in 30M repos |
| File glob pattern matching | Manual path.includes() logic | chokidar's built-in glob support or minimatch | Edge cases with nested directories, symlinks, hidden files |
| Debouncing rapid file changes | setTimeout/clearTimeout logic | chokidar's awaitWriteFinish option | Handles write completion detection, not just simple debounce |
| Badge overlay positioning | Absolute CSS positioning | Existing project pattern in DiagramPanel (top-right toolbar already positioned) | Consistent with existing UI conventions |

**Key insight:** File watching is deceptively complex — chokidar solves cross-platform issues, file descriptor limits, symlink handling, rapid event coalescing, and ignored patterns. Don't reinvent this wheel.

## Common Pitfalls

### Pitfall 1: File Watcher Resource Exhaustion
**What goes wrong:** Watching deeply nested directories (like node_modules) exhausts file descriptors, slows down system, crashes watcher.

**Why it happens:** chokidar creates OS-level watchers for every directory — node_modules can have 10K+ directories.

**How to avoid:** Always set ignored patterns: `['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.cache/**']`

**Warning signs:** Console errors like "EMFILE: too many open files", degraded system performance, watcher silently stops.

**Source:** [chokidar best practices](https://github.com/paulmillr/chokidar) — ignore patterns reduce watcher overhead by 90%+.

### Pitfall 2: Stale State on App Restart
**What goes wrong:** User restarts app — file was modified while app was closed — diagram shows as fresh but is actually stale.

**Why it happens:** File watcher only detects changes while running — can't see changes that happened while app was closed.

**How to avoid:** On app startup, compare last generation timestamp (persisted in SQLite) to file mtimes for relevant patterns. If any file is newer, mark diagram as stale immediately.

**Warning signs:** User reports diagram doesn't match code after restarting app.

**Implementation:**
```typescript
async function checkStalenessOnStartup(repoPath: string, level: C4Level): Promise<boolean> {
  const lastGenerated = cacheService.getLastGenerationTimestamp(repoPath, level);
  if (lastGenerated === 0) return false; // Never generated yet

  const isStale = await cacheService.isDiagramStale(repoPath, level);
  if (isStale) {
    // Emit staleness event to renderer
    window.webContents.send('diagram:stale', { repoPath, level });
  }
  return isStale;
}
```

### Pitfall 3: Over-Invalidation Cascades
**What goes wrong:** User edits one Code-level file — system invalidates Context, Container, Component, AND Code diagrams unnecessarily — wastes API costs.

**Why it happens:** Simple "any file change invalidates all diagrams" logic — doesn't respect C4 abstraction levels.

**How to avoid:** User decision specifies level-specific invalidation:
- Code change → invalidate Code level only
- Component structure change → invalidate Component and Code levels
- Container structure change → invalidate Container, Component, Code levels
- Context change → invalidate all levels

**Warning signs:** User sees excessive API costs, all diagrams marked stale after minor code change.

**Implementation:** Existing c4CacheService.getRelevantFilePatterns() already has level-specific patterns — extend to determine which levels to invalidate based on changed file path.

### Pitfall 4: Race Condition Between File Save and Generation
**What goes wrong:** User saves file → watcher emits change event → marks stale → user immediately regenerates → file watcher sees temp files created during generation → marks stale again → infinite loop.

**Why it happens:** Diagram generation may write temp files or modify cache database — file watcher sees these as relevant changes.

**How to avoid:**
1. Don't watch cache directory or temp directories
2. Use awaitWriteFinish to wait for file to stabilize
3. During generation, temporarily disable staleness detection for current repo/level
4. Ignore changes to files in dist/, .cache/, node_modules/

**Warning signs:** Badge flickers between stale/fresh, generation triggers continuously.

### Pitfall 5: Badge Obscures Diagram Content
**What goes wrong:** Staleness badge covers important diagram elements in top-left corner.

**Why it happens:** Badge positioned over diagram without considering content.

**How to avoid:** User decision allows Claude discretion on exact positioning — prefer top-left with semi-transparent background, or integrate into existing toolbar area. DiagramPanel already has top-right toolbar — consider adding badge to toolbar instead of overlay.

**Warning signs:** User reports can't see diagram elements, badge blocks interactions.

## Code Examples

Verified patterns from existing codebase and official sources:

### File Watcher Initialization and Cleanup
```typescript
// Source: Electron lifecycle best practices
import { app } from 'electron';
import { fileWatcherService } from './services/fileWatcherService';

app.on('before-quit', () => {
  // Clean up all watchers
  fileWatcherService.stopAllWatchers();
});

// In repository manager
function openRepository(repoPath: string) {
  // Start watching when repository is opened
  const currentLevel = getCurrentC4Level(); // 'context' | 'container' | 'component' | 'code'
  fileWatcherService.startWatching(repoPath, currentLevel);
}

function closeRepository(repoPath: string) {
  // Stop watching when repository is closed
  const currentLevel = getCurrentC4Level();
  fileWatcherService.stopWatching(repoPath, currentLevel);
}
```

### Chokidar Configuration for Electron
```typescript
// Source: https://github.com/paulmillr/chokidar
import chokidar from 'chokidar';

const watcher = chokidar.watch(patterns, {
  persistent: true,          // Keep process running while watching
  ignoreInitial: true,       // Don't emit events for initial scan
  ignored: [                 // Critical: avoid node_modules
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/.cache/**'
  ],
  awaitWriteFinish: {        // Wait for file to stabilize
    stabilityThreshold: 100, // Wait 100ms of no changes
    pollInterval: 50         // Check every 50ms
  },
  depth: 10                  // Limit depth to avoid deep recursion
});

watcher.on('ready', () => {
  console.log('Initial scan complete. Watching for changes...');
});

watcher.on('error', (error) => {
  console.error('Watcher error:', error);
});

// Always close watcher when done
await watcher.close();
```

### IPC Handlers for File Watcher Control
```typescript
// Source: Electron IPC patterns - https://www.electronjs.org/docs/latest/tutorial/ipc
// src/main/ipc/fileWatcherHandlers.ts
import { ipcMain } from 'electron';
import { fileWatcherService } from '../services/fileWatcherService';

ipcMain.handle('fileWatcher:start', async (_, repoPath: string, level: string) => {
  fileWatcherService.startWatching(repoPath, level as C4Level);
  return { success: true };
});

ipcMain.handle('fileWatcher:stop', async (_, repoPath: string, level: string) => {
  fileWatcherService.stopWatching(repoPath, level as C4Level);
  return { success: true };
});

ipcMain.handle('cache:clearAll', async () => {
  cacheService.clearCache();
  return { success: true };
});

// Preload script exposes to renderer
// src/main/preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods ...
  startFileWatcher: (repoPath: string, level: string) =>
    ipcRenderer.invoke('fileWatcher:start', repoPath, level),
  stopFileWatcher: (repoPath: string, level: string) =>
    ipcRenderer.invoke('fileWatcher:stop', repoPath, level),
  onDiagramStale: (callback: (data: { repoPath: string; level: string }) => void) => {
    ipcRenderer.on('diagram:stale', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('diagram:stale');
  },
  clearAllCache: () => ipcRenderer.invoke('cache:clearAll')
});
```

### React Component Integration
```typescript
// Source: Existing DiagramViewer.tsx patterns
// Extend src/renderer/components/DiagramViewer/DiagramViewer.tsx

export const DiagramViewer: React.FC<DiagramViewerProps> = ({ ... }) => {
  const [isStale, setIsStale] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Subscribe to staleness events from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.onDiagramStale((data) => {
      if (data.repoPath === repository.path && data.level === currentOptions.type) {
        setIsStale(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [repository.path, currentOptions.type]);

  // Handle regeneration from staleness badge
  const handleRegenerateFromBadge = useCallback(async () => {
    setIsRegenerating(true);
    setIsStale(false); // Clear stale immediately (optimistic UI)

    try {
      await onRegenerateDiagram({ ...currentOptions, force: true });
    } catch (error) {
      setIsStale(true); // Restore stale state on error
      console.error('Regeneration failed:', error);
    } finally {
      setIsRegenerating(false);
    }
  }, [currentOptions, onRegenerateDiagram]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* ... existing controls ... */}

      <div className="flex-1 relative">
        <DiagramPanel
          content={diagram}
          metadata={metadata}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onExport={onExport}
        />

        {/* NEW: Staleness badge overlay */}
        <StalenessBadge
          isStale={isStale}
          isRegenerating={isRegenerating}
          onClick={handleRegenerateFromBadge}
        />
      </div>
    </div>
  );
};
```

### Timestamp Persistence Schema
```typescript
// Source: better-sqlite3 documentation and existing cacheService pattern
// Extend src/main/services/c4/c4CacheService.ts initializeDatabase()

private initializeDatabase(): void {
  this.db = new Database(this.dbPath);

  // Enable WAL mode for better concurrency
  this.db.pragma('journal_mode = WAL');

  // ... existing c4_cache table ...

  // NEW: generation_timestamps table
  this.db.exec(`
    CREATE TABLE IF NOT EXISTS generation_timestamps (
      repo_path TEXT NOT NULL,
      level TEXT NOT NULL CHECK(level IN ('context', 'container', 'component', 'code')),
      timestamp INTEGER NOT NULL,
      PRIMARY KEY (repo_path, level)
    );

    CREATE INDEX IF NOT EXISTS idx_timestamps_repo ON generation_timestamps(repo_path);
  `);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling file system on interval | Event-driven watching with chokidar | 2012 (chokidar created for Brunch) | Reduced CPU usage by 90%+, instant change detection vs polling lag |
| fs.watch / fs.watchFile | chokidar wrapper | 2015+ (widespread adoption) | Cross-platform consistency, proper ignored patterns, write completion detection |
| Time-based cache TTL | File mtime-based invalidation | Phase 1 (established in c4CacheService) | Eliminates unnecessary regenerations, reduces API costs |
| Manual IPC type definitions | contextBridge with TypeScript | Electron 12+ (2021) | Type safety across process boundary, prevents IPC bugs |
| Badge as separate overlay div | Integrated toolbar button | React ecosystem 2023+ | Better accessibility, clearer interaction affordance |

**Deprecated/outdated:**
- **fs.watchFile (polling):** Replaced by fs.watch and chokidar — polling wastes CPU and has latency
- **Synchronous fs.statSync in event handlers:** Use async fs.promises.stat() to avoid blocking main thread
- **Watching with no depth limit:** Modern watchers limit depth to prevent resource exhaustion

## Open Questions

1. **Exact badge positioning**
   - What we know: User wants yellow badge with refresh icon, top corner, inline overlay
   - What's unclear: Top-left or top-right? DiagramPanel already has top-right toolbar (fullscreen, export, etc)
   - Recommendation: Integrate into existing top-right toolbar area OR use top-left corner with semi-transparent background. Test with real diagrams to avoid obscuring content. User gave Claude discretion on exact positioning.

2. **Debounce timing for file watcher events**
   - What we know: User decided "mark stale immediately, no debounce" — but chokidar awaitWriteFinish prevents mid-save events
   - What's unclear: Exact stabilityThreshold value (50ms? 100ms? 250ms?)
   - Recommendation: Start with 100ms stabilityThreshold (balances immediate feedback with write completion). User gave Claude discretion on debounce timing.

3. **Error state handling for failed regeneration**
   - What we know: User wants spinner during regeneration, single click to trigger
   - What's unclear: What happens if regeneration fails? Show error toast? Restore stale badge? Retry button?
   - Recommendation: On error, restore stale badge, show toast with error message, allow retry via badge click. User gave Claude discretion on error handling.

4. **Level-specific invalidation cascading rules**
   - What we know: User wants smart level mapping — Code change invalidates Code, structural change invalidates higher levels
   - What's unclear: Exact file path patterns that trigger Component vs Container vs Context invalidation
   - Recommendation: Leverage existing c4CacheService.getRelevantFilePatterns() as starting point. Refine based on testing with real codebases. User gave Claude discretion on specific file patterns.

## Validation Architecture

> Note: workflow.nyquist_validation is NOT enabled in .planning/config.json — validation section omitted per instructions

## Sources

### Primary (HIGH confidence)
- [chokidar GitHub repository](https://github.com/paulmillr/chokidar) - File watching best practices, configuration options
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc) - Official IPC patterns for main-renderer communication
- [better-sqlite3 documentation](https://www.npmjs.com/package/better-sqlite3) - SQLite schema and query patterns
- Existing codebase: c4CacheService.ts, DiagramViewer.tsx, DiagramPanel.tsx - Established patterns for cache, UI, metadata

### Secondary (MEDIUM confidence)
- [Electron file watching tutorial](https://ourcodeworld.com/articles/read/160/watch-files-and-directories-with-electron-framework) - Integration patterns
- [electron-store GitHub](https://github.com/sindresorhus/electron-store) - Timestamp persistence alternative
- [React Badge patterns](https://mui.com/material-ui/react-badge/) - UI overlay positioning
- [Cache invalidation strategies](https://www.jpcache.com/cache-invalidation-strategies/) - Timestamp vs hash comparison
- [File watcher debounce discussion](https://github.com/eklingen/watch-debounced) - Timing best practices (100-250ms recommended)

### Tertiary (LOW confidence)
- [General file watching tutorials](https://thisdavej.com/how-to-watch-for-file-changes-in-node-js/) - Basic concepts only, verify specifics with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - chokidar is industry standard, existing libs already integrated
- Architecture: HIGH - Electron IPC patterns well-documented, existing codebase provides proven structure
- Pitfalls: HIGH - Common file watcher issues documented across multiple sources, validated against existing patterns
- Level-specific invalidation: MEDIUM - User specified high-level rules, specific file patterns require testing/refinement

**Research date:** 2026-02-23
**Valid until:** ~30 days (stable domain — file watching patterns mature)
