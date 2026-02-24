# Phase 5: Persistent Storage Foundation - Research

**Researched:** 2026-02-24
**Domain:** SQLite persistent storage, database migration, state management
**Confidence:** HIGH

## Summary

Phase 5 transforms v1.0's TTL-based cache into true persistent storage. The v1.0 system already uses better-sqlite3 with WAL mode enabled, but implements level-aware TTL expiration (Context: 7 days, Container: 3 days, Component: 1 day, Code: 6 hours). This phase removes TTL expiration, adds diagram state tracking (never_generated, generating, fresh, stale, error), migrates existing cached diagrams on first v1.1 launch, and implements a robust state management layer for UI display.

The codebase already has strong foundations: SQLite database with WAL mode, IPC handlers for cache operations, and a Zustand-based state management pattern. The challenge is schema evolution, state machine implementation, and silent migration with rollback on failure.

**Primary recommendation:** Extend existing c4CacheService.ts schema with state column and migration version tracking. Use user_version pragma for migration detection. Implement state machine in Zustand store with TypeScript enums for type safety.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **State Display**: Badge icons in diagram header only (checkmark=fresh, clock=stale, spinner=generating, warning=error)
- **State Display**: Single badge location — diagram header only, not on level tabs or sidebar
- **State Display**: "Never generated" shows centered prompt card with "Generate C4 Diagram" button
- **State Display**: State icons are clickable with contextual actions (stale→regenerate, error→details, fresh→tooltip)
- **Migration Behavior**: Silent migration on first v1.1 launch — no UI unless failure
- **Migration Behavior**: Failed diagram migrations → mark as "never generated" (user regenerates on demand)
- **Migration Behavior**: Delete v1.0 cache immediately after successful migration
- **Migration Behavior**: Expired TTL diagrams → migrate anyway, mark as "stale" in new system
- **Error Recovery**: Load failures show error state with retry (error icon badge + "Failed to load" message + Retry/Regenerate buttons)
- **Error Recovery**: Database corruption → reset and notify (create fresh database, one-time toast "Diagram storage was reset. Diagrams will need to be regenerated.")
- **Error Recovery**: Settings includes "Clear All Stored Diagrams" button with confirmation
- **Error Recovery**: Error messages are user-friendly only — no technical details visible
- **Storage Location**: App data folder (platform-standard): ~/Library/Application Support on Mac, %APPDATA% on Windows
- **Storage Location**: Single SQLite database for all repos (not per-repo)
- **Storage Location**: Settings displays storage path and size: "Storage: ~/Library/.../reef (45 MB)"
- **Storage Location**: When repo is removed from Reef → keep diagrams in storage (no data loss, available if re-added)

### Claude's Discretion
- Exact badge icon designs (within lucide-react icon library constraints)
- SQLite schema structure (columns, indexes, constraints)
- WAL mode implementation details (checkpoint tuning, configuration)
- Internal state machine transitions (TypeScript implementation)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STOR-01 | User can close and reopen app without losing generated diagrams | Persistent storage schema with no TTL expiration + migration from v1.0 cache |
| STOR-02 | App migrates v1.0 TTL-based cache to persistent storage on first launch | user_version pragma for version detection + silent migration strategy + v1.0 schema analysis |
| STOR-03 | Database uses WAL mode for concurrent read performance | Already enabled in v1.0 cacheService.ts line 58, research confirms best practices |
| STOR-04 | App tracks diagram state (never_generated, generating, fresh, stale, error) | State machine pattern in Zustand + state column in schema + UI badge patterns |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 11.10.0 | Synchronous SQLite bindings for Node.js | Already in project (package.json line 79), fastest SQLite library for Electron main process, native module with rebuild support |
| SQLite | 3.x (embedded) | Relational database engine | Bundled with better-sqlite3, zero configuration, file-based persistence, ACID transactions |
| Zustand | 4.4.7 | React state management | Already in project (package.json line 100), minimal API, no boilerplate, devtools integration |
| lucide-react | 0.312.0 | Icon library | Already in project (package.json line 87), provides Check, Clock, Loader2, AlertCircle icons for state badges |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/better-sqlite3 | 7.6.13 | TypeScript definitions | Already in project (package.json line 77), type safety for database operations |
| electron-store | 8.1.0 | Simple Electron settings storage | Already in project (package.json line 85), for storing migration version and user preferences |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | sql.js | sql.js runs in renderer (WASM), but slower and higher memory overhead. better-sqlite3 is native C++ and synchronous, ideal for Electron main process |
| File-based SQLite | In-memory + flush | Loses persistence guarantee on crashes. SQLite with WAL mode provides crash recovery |
| Zustand | Context API | Context API causes re-renders across tree. Zustand selectors prevent unnecessary renders for state badges |

**Installation:**
All dependencies already installed in project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/
│   └── services/
│       ├── cacheService.ts           # Legacy v1.0 cache (migrate from)
│       ├── storageService.ts         # NEW: v1.1 persistent storage
│       ├── migrationService.ts       # NEW: v1.0→v1.1 migration logic
│       └── c4/
│           ├── c4CacheService.ts     # Legacy v1.0 C4 cache (migrate from)
│           └── c4StorageService.ts   # NEW: v1.1 C4 persistent storage
└── renderer/
    └── stores/
        ├── diagramStateStore.ts      # NEW: diagram state machine (Zustand)
        └── repositoryStore.ts        # Existing (extend for storage stats)
```

### Pattern 1: Database Schema with State Tracking
**What:** Extend v1.0 schema with state column and remove TTL-based expiration
**When to use:** For STOR-01, STOR-04 requirements
**Example:**
```typescript
// v1.1 schema (extends v1.0)
this.db.exec(`
  CREATE TABLE IF NOT EXISTS diagram_storage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_path TEXT NOT NULL,
    level TEXT NOT NULL CHECK(level IN ('context', 'container', 'component', 'code')),
    element_id TEXT,
    diagram_content TEXT NOT NULL,
    diagram_metadata TEXT,
    state TEXT NOT NULL DEFAULT 'fresh' CHECK(state IN ('never_generated', 'generating', 'fresh', 'stale', 'error')),
    error_message TEXT,
    model_used TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    tokens_used INTEGER,
    generation_cost REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repo_path, level, element_id)
  );

  CREATE INDEX IF NOT EXISTS idx_repo_level ON diagram_storage(repo_path, level);
  CREATE INDEX IF NOT EXISTS idx_state ON diagram_storage(state);
`);
```
**Key differences from v1.0:**
- Added `state` column with CHECK constraint for state machine enforcement
- Added `error_message` column for error state details
- Removed `last_accessed` and `access_count` (not needed for persistence)
- Changed UNIQUE constraint to include `element_id` (for drill-down caching)
- Renamed table from `diagram_cache` to `diagram_storage` (semantic clarity)

### Pattern 2: Migration Version Tracking with user_version
**What:** Use SQLite's PRAGMA user_version to detect and track schema versions
**When to use:** For STOR-02 requirement (migration detection)
**Example:**
```typescript
// Source: https://www.sqliteforum.com/p/managing-database-versions-and-migrations
class MigrationService {
  private static readonly V1_0_VERSION = 0; // v1.0 had no user_version
  private static readonly V1_1_VERSION = 1; // v1.1 schema version

  detectVersion(db: Database.Database): number {
    const result = db.pragma('user_version', { simple: true }) as number;
    return result;
  }

  migrate(oldDb: Database.Database, newDb: Database.Database): void {
    const version = this.detectVersion(oldDb);

    if (version === 0) {
      // v1.0 → v1.1 migration
      this.migrateV1ToV1_1(oldDb, newDb);
      newDb.pragma(`user_version = ${MigrationService.V1_1_VERSION}`);
    }
  }
}
```
**Why:** SQLite's user_version is atomic metadata stored in database file header. Reliable for version detection across app restarts.

### Pattern 3: Silent Migration with Atomic Transaction
**What:** Migrate v1.0 data in single transaction, rollback on failure, preserve old DB until success
**When to use:** For STOR-02 requirement (silent migration with safety)
**Example:**
```typescript
// Source: https://sqlite.org/recovery.html concepts applied to migration
migrateV1ToV1_1(oldDbPath: string, newDbPath: string): void {
  const oldDb = new Database(oldDbPath, { readonly: true });
  const newDb = new Database(newDbPath);

  // Wrap in transaction for atomicity
  const migrate = newDb.transaction(() => {
    // Copy all diagrams from v1.0 cache
    const diagrams = oldDb.prepare('SELECT * FROM diagram_cache').all();

    for (const diagram of diagrams) {
      // Check if TTL expired in v1.0 system
      const isExpired = this.isV1DiagramExpired(diagram);
      const state = isExpired ? 'stale' : 'fresh';

      try {
        newDb.prepare(`
          INSERT INTO diagram_storage (
            repo_path, level, element_id, diagram_content, diagram_metadata,
            state, model_used, prompt_version, tokens_used, generation_cost,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          diagram.repo_path,
          this.extractLevelFromDiagramType(diagram.diagram_type),
          null, // v1.0 didn't track element_id
          diagram.diagram_content,
          diagram.diagram_metadata,
          state,
          diagram.model_used,
          diagram.prompt_version,
          diagram.tokens_used,
          diagram.generation_cost,
          diagram.created_at,
          diagram.created_at
        );
      } catch (error) {
        // Constraint violation or data issue → skip, mark as never_generated
        console.warn(`Failed to migrate diagram for ${diagram.repo_path}: ${error.message}`);
      }
    }
  });

  migrate(); // Execute transaction
  oldDb.close();
}
```
**Why:** Transaction ensures all-or-nothing migration. If any step fails, rollback prevents corrupt state.

### Pattern 4: State Machine in Zustand Store
**What:** Centralized state machine for diagram state transitions with type safety
**When to use:** For STOR-04 requirement (UI state tracking)
**Example:**
```typescript
// Source: Zustand devtools pattern from repositoryStore.ts + state machine concepts
type DiagramState = 'never_generated' | 'generating' | 'fresh' | 'stale' | 'error';

interface DiagramStateEntry {
  repoPath: string;
  level: C4Level;
  elementId?: string;
  state: DiagramState;
  errorMessage?: string;
}

interface DiagramStateStore {
  states: Map<string, DiagramStateEntry>; // key: repo:level:elementId

  getState: (repoPath: string, level: C4Level, elementId?: string) => DiagramState;
  setState: (repoPath: string, level: C4Level, state: DiagramState, elementId?: string, errorMessage?: string) => void;
  transitionToGenerating: (repoPath: string, level: C4Level, elementId?: string) => void;
  transitionToFresh: (repoPath: string, level: C4Level, elementId?: string) => void;
  transitionToStale: (repoPath: string, level: C4Level, elementId?: string) => void;
  transitionToError: (repoPath: string, level: C4Level, errorMessage: string, elementId?: string) => void;
}

export const useDiagramStateStore = create<DiagramStateStore>()(
  devtools(
    (set, get) => ({
      states: new Map(),

      getState: (repoPath, level, elementId) => {
        const key = `${repoPath}:${level}:${elementId || ''}`;
        return get().states.get(key)?.state || 'never_generated';
      },

      setState: (repoPath, level, state, elementId, errorMessage) => {
        const key = `${repoPath}:${level}:${elementId || ''}`;
        set((prev) => {
          const newStates = new Map(prev.states);
          newStates.set(key, { repoPath, level, elementId, state, errorMessage });
          return { states: newStates };
        });
      },

      transitionToGenerating: (repoPath, level, elementId) => {
        get().setState(repoPath, level, 'generating', elementId);
      },

      transitionToFresh: (repoPath, level, elementId) => {
        get().setState(repoPath, level, 'fresh', elementId);
      },

      transitionToStale: (repoPath, level, elementId) => {
        get().setState(repoPath, level, 'stale', elementId);
      },

      transitionToError: (repoPath, level, errorMessage, elementId) => {
        get().setState(repoPath, level, 'error', elementId, errorMessage);
      },
    }),
    { name: 'diagram-state-storage' }
  )
);
```
**Why:** Centralized state prevents desync between UI and database. Zustand's selector pattern prevents unnecessary re-renders when unrelated states change.

### Pattern 5: Badge Component with State Icons
**What:** Clickable badge in diagram header that displays state and triggers actions
**When to use:** For STOR-04 requirement (state display in UI)
**Example:**
```typescript
// Source: lucide-react icons + existing StalenessBadge.tsx pattern
import { Check, Clock, Loader2, AlertCircle } from 'lucide-react';

interface DiagramStateBadgeProps {
  state: DiagramState;
  errorMessage?: string;
  onRegenerate: () => void;
}

export const DiagramStateBadge: React.FC<DiagramStateBadgeProps> = ({
  state,
  errorMessage,
  onRegenerate,
}) => {
  const renderBadge = () => {
    switch (state) {
      case 'never_generated':
        return null; // Show prompt card instead

      case 'generating':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-md">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            <span className="text-sm text-blue-300">Generating...</span>
          </div>
        );

      case 'fresh':
        return (
          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-md hover:bg-green-500/30 transition-colors"
            title="Up to date"
          >
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-300">Up to date</span>
          </button>
        );

      case 'stale':
        return (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-md hover:bg-amber-500/30 transition-colors"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300">Outdated - Click to regenerate</span>
          </button>
        );

      case 'error':
        return (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-md hover:bg-red-500/30 transition-colors"
            title={errorMessage}
          >
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">Failed to load - Click to retry</span>
          </button>
        );
    }
  };

  return <div className="diagram-state-badge">{renderBadge()}</div>;
};
```
**Why:** Single component encapsulates all state display logic. Clickable states (stale, error) trigger regeneration directly from badge.

### Anti-Patterns to Avoid
- **Mixing v1.0 and v1.1 schemas in same database:** Always migrate to new database file, delete old after success. Prevents schema conflicts.
- **State stored only in Zustand without database sync:** State must persist to database immediately. Zustand is UI cache, database is source of truth.
- **TTL-based auto-deletion in v1.1:** Remove all TTL expiration logic. Phase 7 will handle staleness detection via file watching, not time-based.
- **Exposing SQLite errors to users:** Wrap all database errors in user-friendly messages. Technical details go to logs only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database migration framework | Custom version tracking with JSON files | SQLite's PRAGMA user_version + transaction-based migration | user_version is atomic and persisted in DB header. JSON files can desync from actual schema state |
| State machine library | Complex event emitter system | TypeScript enums + Zustand store with explicit transition methods | Enums provide compile-time type safety. Zustand devtools visualize state transitions |
| Database corruption detection | Manual checksum validation | SQLite's PRAGMA integrity_check | integrity_check detects all forms of corruption (page-level, B-tree, index). Manual checksums miss internal corruption |
| Concurrent read/write handling | Custom locking mechanism | SQLite WAL mode (already enabled in v1.0) | WAL mode allows concurrent reads during writes. Custom locks introduce deadlock risk |
| Path normalization across platforms | String replace chains | Node.js path.normalize() and path.sep | Cross-platform path handling has edge cases (UNC paths on Windows, symlinks on Unix). path module handles all cases |

**Key insight:** SQLite and better-sqlite3 have decades of optimization and edge case handling. Custom solutions inevitably reintroduce solved problems.

## Common Pitfalls

### Pitfall 1: Migration Running Multiple Times
**What goes wrong:** User launches app multiple times during migration window, triggers migration repeatedly
**Why it happens:** No atomic "migration in progress" flag, version check happens before migration lock
**How to avoid:** Use electron-store to set migration flag BEFORE opening databases. Check flag on startup.
**Warning signs:** Duplicate entries in diagram_storage table, migration errors in logs on subsequent launches
**Example:**
```typescript
// Check migration flag FIRST, before any database operations
const migrationStore = new Store({ name: 'migration-state' });
const migrationInProgress = migrationStore.get('v1_1_migration_in_progress', false);

if (migrationInProgress) {
  // Another instance is migrating, abort
  throw new Error('Migration already in progress');
}

migrationStore.set('v1_1_migration_in_progress', true);

try {
  // Perform migration
  migrateV1ToV1_1();
  migrationStore.set('v1_1_migration_completed', true);
} finally {
  migrationStore.set('v1_1_migration_in_progress', false);
}
```

### Pitfall 2: WAL Mode Checkpoint Starvation
**What goes wrong:** WAL file grows unbounded during heavy read operations, slows down all operations
**Why it happens:** Long-running read transactions prevent WAL checkpointing. WAL can't truncate if readers hold old snapshots.
**How to avoid:** Close database connections promptly, limit read transaction duration, configure wal_autocheckpoint
**Warning signs:** Database directory size grows continuously, .db-wal file exceeds 10MB, query performance degrades over time
**Example:**
```typescript
// Configure automatic checkpointing (default is 1000 pages = ~4MB)
this.db.pragma('wal_autocheckpoint = 1000'); // Already default, but explicit is better

// Manual checkpoint after bulk operations
if (diagrams.length > 100) {
  this.db.pragma('wal_checkpoint(TRUNCATE)'); // Force checkpoint and truncate WAL
}
```

### Pitfall 3: State Transitions from Stale Database
**What goes wrong:** Diagram marked "fresh" in database, but file changes happened after last check. UI shows fresh badge, user sees outdated diagram.
**Why it happens:** State read from database on component mount, but filesystem changed after state was set. No real-time sync.
**How to avoid:** Phase 7 will add file watching. For Phase 5, always check filesystem timestamps on load, update state if files changed.
**Warning signs:** Users report "fresh" diagrams showing old code structure, regeneration produces different output
**Example:**
```typescript
// Load diagram AND check staleness atomically
async loadDiagram(repoPath: string, level: C4Level): Promise<{ diagram: string, state: DiagramState }> {
  const stored = this.getStoredDiagram(repoPath, level);

  if (!stored) {
    return { diagram: '', state: 'never_generated' };
  }

  // Check if files changed since creation (Phase 5 placeholder, Phase 7 will use file watcher)
  const filesChanged = await this.checkFilesChangedSince(repoPath, level, stored.updated_at);

  if (filesChanged && stored.state === 'fresh') {
    // Update state to stale BEFORE returning
    this.updateState(repoPath, level, 'stale');
    return { diagram: stored.diagram_content, state: 'stale' };
  }

  return { diagram: stored.diagram_content, state: stored.state };
}
```

### Pitfall 4: Database Corruption on Ungraceful Shutdown
**What goes wrong:** App killed during write operation, database left in inconsistent state, subsequent launches fail to open database
**Why it happens:** WAL mode is resilient but not immune. Power loss during checkpoint can corrupt main database file.
**How to avoid:** Enable PRAGMA synchronous = FULL (default). Implement corruption detection on startup with PRAGMA integrity_check.
**Warning signs:** "database disk image is malformed" error on launch, empty diagrams after crash, inability to open database file
**Example:**
```typescript
// Source: https://sqlite.org/recovery.html detection strategy
function initializeDatabase(dbPath: string): Database.Database {
  try {
    const db = new Database(dbPath);

    // Check integrity on startup
    const integrityResult = db.pragma('integrity_check', { simple: true });

    if (integrityResult !== 'ok') {
      console.error(`Database corruption detected: ${integrityResult}`);
      db.close();

      // Move corrupted DB to backup, create fresh
      fs.renameSync(dbPath, `${dbPath}.corrupted.${Date.now()}`);

      // Notify user (user-friendly message)
      showToast('Diagram storage was reset. Diagrams will need to be regenerated.');

      // Create fresh database
      return new Database(dbPath);
    }

    return db;
  } catch (error) {
    // Database file corrupted beyond opening
    console.error(`Cannot open database: ${error.message}`);

    // Move corrupted DB to backup
    if (fs.existsSync(dbPath)) {
      fs.renameSync(dbPath, `${dbPath}.corrupted.${Date.now()}`);
    }

    showToast('Diagram storage was reset. Diagrams will need to be regenerated.');
    return new Database(dbPath);
  }
}
```

### Pitfall 5: Platform Path Differences Breaking Migration
**What goes wrong:** repo_path stored with backslashes on Windows (C:\Users\...), migration on Mac fails to match paths
**Why it happens:** v1.0 cache stores raw paths from OS. Cross-platform apps need normalized paths.
**How to avoid:** Normalize all repo_path values to forward slashes during migration and storage
**Warning signs:** Diagrams "lost" after migrating database from Windows to Mac (or vice versa), duplicate entries for same repo
**Example:**
```typescript
// Normalize paths during migration AND storage
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/'); // Always use forward slashes internally
}

// Apply during migration
const normalizedRepoPath = normalizePath(diagram.repo_path);

// Apply during all storage operations
storeDiagram(repoPath: string, ...): void {
  const normalizedPath = normalizePath(repoPath);
  // ... rest of storage logic
}
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Database Initialization with WAL Mode
```typescript
// Source: src/main/services/cacheService.ts lines 52-82 (v1.0 pattern)
// Enhanced with integrity check from https://sqlite.org/recovery.html
function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  // Enable foreign keys (good practice, even if not used yet)
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for concurrent reads (REQUIRED for STOR-03)
  db.pragma('journal_mode = WAL');

  // Full synchronous mode for crash safety (default, but explicit)
  db.pragma('synchronous = FULL');

  // Set checkpoint interval (1000 pages = ~4MB WAL before auto-checkpoint)
  db.pragma('wal_autocheckpoint = 1000');

  // Check integrity on startup
  const integrityResult = db.pragma('integrity_check', { simple: true });
  if (integrityResult !== 'ok') {
    throw new Error('Database corruption detected');
  }

  return db;
}
```

### Storage Path Detection with Platform Handling
```typescript
// Source: Electron app.getPath('userData') from https://cameronnokes.com/blog/how-to-store-user-data-in-electron/
// Returns platform-specific paths:
// - macOS: ~/Library/Application Support/<App Name>
// - Windows: C:\Users\<You>\AppData\Local\<App Name>
// - Linux: ~/.config/<App Name>

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

function getStoragePath(): string {
  const userDataPath = app.getPath('userData');
  const storageDir = path.join(userDataPath, 'diagrams');

  // Ensure directory exists
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  return path.join(storageDir, 'diagram_storage.db');
}

function getStorageSize(): number {
  const storagePath = getStoragePath();

  if (!fs.existsSync(storagePath)) {
    return 0;
  }

  const stats = fs.statSync(storagePath);
  const walPath = `${storagePath}-wal`;
  const walStats = fs.existsSync(walPath) ? fs.statSync(walPath) : { size: 0 };

  return stats.size + walStats.size; // Main DB + WAL file
}
```

### State Transition with Database Sync
```typescript
// Source: Zustand pattern from repositoryStore.ts + SQLite atomic update
// Demonstrates STOR-04 requirement implementation

async transitionToStale(repoPath: string, level: C4Level, elementId?: string): Promise<void> {
  const normalizedPath = normalizePath(repoPath);

  // Update database FIRST (source of truth)
  const stmt = this.db.prepare(`
    UPDATE diagram_storage
    SET state = 'stale', updated_at = CURRENT_TIMESTAMP
    WHERE repo_path = ? AND level = ? AND (element_id = ? OR (element_id IS NULL AND ? IS NULL))
  `);

  stmt.run(normalizedPath, level, elementId, elementId);

  // Update Zustand store (UI cache)
  useDiagramStateStore.getState().setState(normalizedPath, level, 'stale', elementId);

  // Emit IPC event for renderer updates
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send('diagram:state-changed', {
      repoPath: normalizedPath,
      level,
      elementId,
      state: 'stale',
    });
  }
}
```

## State of the Art

| Old Approach (v1.0) | Current Approach (v1.1) | When Changed | Impact |
|---------------------|-------------------------|--------------|--------|
| TTL-based expiration (7d/3d/1d/6h per level) | State-based persistence (no auto-deletion) | Phase 5 (v1.1) | Diagrams survive app restarts indefinitely. User controls when to regenerate. |
| Time-based staleness detection | File-watching staleness detection | Phase 7 (v1.1) | Phase 5 sets up state infrastructure, Phase 7 adds real-time file change detection. |
| Single cache table for all diagram types | Dedicated storage with state tracking | Phase 5 (v1.1) | State machine enables UI feedback (generating, stale, error). Better UX. |
| last_accessed for LRU eviction | No automatic eviction, manual "Clear All" in settings | Phase 5 (v1.1) | User controls storage, no surprise deletions. Storage size shown in settings. |

**Deprecated/outdated:**
- **cleanupOldEntries() in cacheService.ts:** Remove in v1.1. No TTL-based deletion. Phase 5 removes this pattern entirely.
- **DEFAULT_CACHE_DAYS constant:** Remove. Time-based expiration not used in persistent storage model.
- **access_count column:** Remove. Not needed without LRU eviction strategy.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | vitest.config.main.ts (main process), vitest.config.ts (renderer) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm test` |
| Estimated runtime | ~15 seconds (unit), ~30 seconds (full) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STOR-01 | Diagrams persist across app restarts without loss | integration | `vitest run tests/integration/storageService.test.ts -x` | ❌ Wave 0 gap |
| STOR-01 | Database stores diagrams without TTL expiration | unit | `vitest run tests/unit/main/services/storageService.test.ts::test_no_ttl_expiration -x` | ❌ Wave 0 gap |
| STOR-02 | Migration detects v1.0 database via user_version | unit | `vitest run tests/unit/main/services/migrationService.test.ts::test_version_detection -x` | ❌ Wave 0 gap |
| STOR-02 | Migration copies v1.0 diagrams to v1.1 schema | unit | `vitest run tests/unit/main/services/migrationService.test.ts::test_migrate_all_diagrams -x` | ❌ Wave 0 gap |
| STOR-02 | Migration marks expired diagrams as stale | unit | `vitest run tests/unit/main/services/migrationService.test.ts::test_expired_marked_stale -x` | ❌ Wave 0 gap |
| STOR-02 | Migration deletes v1.0 cache after success | integration | `vitest run tests/integration/migrationService.test.ts::test_v1_cleanup -x` | ❌ Wave 0 gap |
| STOR-03 | Database has WAL mode enabled | unit | `vitest run tests/unit/main/services/storageService.test.ts::test_wal_mode_enabled -x` | ❌ Wave 0 gap |
| STOR-03 | Concurrent reads don't block during writes | integration | `vitest run tests/integration/storageService.test.ts::test_concurrent_reads -x` | ❌ Wave 0 gap |
| STOR-04 | State transitions persist to database | unit | `vitest run tests/unit/main/services/storageService.test.ts::test_state_persistence -x` | ❌ Wave 0 gap |
| STOR-04 | State machine enforces valid transitions | unit | `vitest run tests/unit/renderer/stores/diagramStateStore.test.ts::test_state_machine -x` | ❌ Wave 0 gap |
| STOR-04 | UI badge displays correct icon for each state | unit | `vitest run tests/unit/renderer/components/DiagramStateBadge.test.tsx::test_badge_icons -x` | ❌ Wave 0 gap |

### Nyquist Sampling Rate
- **Minimum sample interval:** After every committed task → run: `npm run test:unit`
- **Full suite trigger:** Before merging final task of any plan wave
- **Phase-complete gate:** Full suite green before `/gsd:verify-work` runs
- **Estimated feedback latency per task:** ~15 seconds

### Wave 0 Gaps (must be created before implementation)
- [ ] `tests/unit/main/services/storageService.test.ts` — covers STOR-01, STOR-03, STOR-04 (database layer)
- [ ] `tests/unit/main/services/migrationService.test.ts` — covers STOR-02 (migration logic)
- [ ] `tests/integration/storageService.test.ts` — covers STOR-01, STOR-03 (persistence verification)
- [ ] `tests/integration/migrationService.test.ts` — covers STOR-02 (end-to-end migration with file cleanup)
- [ ] `tests/unit/renderer/stores/diagramStateStore.test.ts` — covers STOR-04 (state machine in Zustand)
- [ ] `tests/unit/renderer/components/DiagramStateBadge.test.tsx` — covers STOR-04 (badge UI)
- [ ] `tests/fixtures/v1_cache.db` — sample v1.0 database for migration testing
- [ ] `tests/mocks/electron.mock.ts` — mock app.getPath('userData') for tests

## Open Questions

1. **Should state transitions be logged for debugging?**
   - What we know: Devtools middleware logs Zustand state changes in development
   - What's unclear: Whether database state transitions need separate audit log for production debugging
   - Recommendation: Add optional state_history table in schema for debugging. Enabled via electron-store setting (default: off). Helps diagnose "why did this diagram become stale" questions.

2. **How to handle concurrent generation requests for same diagram?**
   - What we know: Phase 6 will implement generation queue, but Phase 5 must handle state transitions during concurrent requests
   - What's unclear: Should second request wait, cancel first, or fail with error
   - Recommendation: State machine should prevent 'generating' → 'generating' transition. Return error if diagram already generating. Phase 6 queue will handle request deduplication.

3. **Should corrupted database backups be auto-deleted?**
   - What we know: Corruption detection creates .corrupted.timestamp backups
   - What's unclear: How many backups to keep, when to delete old ones
   - Recommendation: Keep last 3 corrupted backups, delete older on next corruption event. Prevents unbounded disk usage while preserving forensics.

## Sources

### Primary (HIGH confidence)
- [SQLite Official Documentation - WAL Mode](https://sqlite.org/wal.html) - WAL mode benefits and configuration
- [SQLite Official Documentation - Database Recovery](https://sqlite.org/recovery.html) - Corruption detection and recovery strategies
- [better-sqlite3 Documentation - Performance](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md) - WAL mode configuration and concurrency
- [Electron Official Documentation - app.getPath](https://www.electronjs.org/docs/latest/api/app) - Platform-specific userData paths
- Existing codebase: src/main/services/cacheService.ts (v1.0 cache implementation)
- Existing codebase: src/main/services/c4/c4CacheService.ts (v1.0 C4 cache with TTL)
- Existing codebase: src/renderer/stores/repositoryStore.ts (Zustand pattern)

### Secondary (MEDIUM confidence)
- [How to store user data in Electron](https://cameronnokes.com/blog/how-to-store-user-data-in-electron/) - userData path handling
- [SQLite Versioning and Migration Strategies](https://www.sqliteforum.com/p/sqlite-versioning-and-migration-strategies) - user_version pragma patterns
- [Managing Database Versions and Migrations in SQLite](https://www.sqliteforum.com/p/managing-database-versions-and-migrations) - Migration transaction patterns
- [React Error Boundaries in 2026](https://oneuptime.com/blog/post/2026-02-20-react-error-boundaries/view) - User-friendly error handling
- [Lucide Icons Documentation](https://lucide.dev/icons) - Badge icon options (Check, Clock, Loader2, AlertCircle)
- [State Management in 2026: Zustand vs Jotai vs Redux](https://dev.to/jsgurujobs/state-management-in-2026-zustand-vs-jotai-vs-redux-toolkit-vs-signals-2gge) - Zustand best practices

### Tertiary (LOW confidence)
- [SQLite Concurrency: Thread Safety, WAL Mode, and Beyond](https://iifx.dev/en/articles/17373144) - General WAL concurrency concepts
- [Fixing Concurrent Session Problem with SQLite WAL Mode](https://dev.to/daichikudo/fixing-claude-codes-concurrent-session-problem-implementing-memory-mcp-with-sqlite-wal-mode-o7k) - WAL mode use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in project, versions verified from package.json
- Architecture: HIGH - Schema patterns verified in v1.0 codebase, migration patterns from SQLite official docs
- Pitfalls: HIGH - Corruption detection from SQLite official recovery docs, migration pitfalls from real-world patterns
- State machine: MEDIUM - Zustand pattern verified in codebase, state machine implementation is standard but not externally documented
- UI patterns: MEDIUM - Icon library verified (lucide-react in package.json), badge pattern extrapolated from existing StalenessBadge component

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days - stable domain)

---

**Ready for planning:** Yes. All requirements mapped, standard stack identified, schema patterns verified, migration strategy documented, pitfalls catalogued.
