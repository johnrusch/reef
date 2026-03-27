# Phase 17: Storage Foundation - Research

**Researched:** 2026-03-26
**Domain:** Node.js file I/O, chokidar v4, atomic writes, .gitattributes, schema validation
**Confidence:** HIGH

## Summary

Phase 17 creates `ReefStorageService` — the file I/O layer that owns all `.reef/` folder operations — and patches the chokidar `ignored` predicate before any write code is introduced. The phase has no new library dependencies: `fs/promises` (Node.js stdlib), `zod` (already in `package.json`), and `chokidar` (already in project) cover every requirement. No npm installs are needed.

The architecture is deliberately self-contained: `ReefStorageService` is a thin class (~150 lines) that wraps `fs/promises` atomic writes and exposes five methods. The chokidar change is a one-line regex extension. The `.gitattributes` write is idempotent and fires on the same code path as the first `.reef/` directory creation. All four STOR requirements are satisfied entirely within the main process — no renderer-side changes, no IPC additions.

The most important correctness concern is the Windows `EPERM` edge case on `fs.rename()` when the destination file already exists. On macOS/Linux `rename()` is atomic and succeeds unconditionally; on Windows it fails with `EPERM` if the target exists. The service must branch on `process.platform === 'win32'` and delete-then-rename. This is tracked as a known concern in STATE.md.

**Primary recommendation:** Build `ReefStorageService` as a pure Node.js class using only `fs/promises` and `path`. Use `zod` (already installed, v4.3.6) for `.meta.json` schema validation. Extend the chokidar `ignored` regex in `FileWatcherService` with `|\.reef[/\\]` before shipping any write code.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Flat per-level layout for context and container (`.reef/context.puml`, `.reef/context.svg`, `.reef/context.meta.json`, etc.)
- **D-02:** Nested subdirectories for component and code sub-diagrams: `.reef/component/{containerId}/diagram.puml`, `.reef/code/{componentId}/diagram.puml`
- **D-03:** Full folder contract defined in Phase 17 — includes nested sub-diagram structure even though sub-diagram writes may come later
- **D-04:** No root manifest file — `schemaVersion` lives in each `.meta.json` independently (each file is self-contained)
- **D-05:** Unrecognized `schemaVersion` treated as missing — queue regeneration for that level (no warnings, just regenerate)
- **D-06:** `.reef/` directory created lazily on first write, not eagerly on repo add
- **D-07:** Per-level independent writes — each level's files written independently, not as an all-or-nothing batch
- **D-08:** Temp-then-rename pattern: write to `.tmp` suffix, then `fs.rename()` to final path. On Windows EPERM, delete destination first then retry rename
- **D-09:** Individual atomic renames per file (write+rename `.puml`, then `.svg`, then `.meta.json`) — not grouped
- **D-10:** SQLite-first, `.reef/`-second dual-write ordering for v1.4 — `.reef/` write failure is non-fatal
- **D-11:** Extend existing `ignored` function predicate in `FileWatcherService` — add `\.reef[/\\]` to the regex alongside `node_modules`, `.git`, etc.
- **D-12:** No separate `.tmp` file exclusion needed — `.reef/` directory exclusion covers temp files inside it
- **D-13:** `.gitattributes` created on first `.reef/` write, idempotent (skip if already exists)
- **D-14:** Marks both `*.svg` and `*.puml` as binary to prevent merge conflicts
- **D-15:** `.reef/` is the authoritative source of truth for diagram artifacts, not SQLite
- **D-16:** SQLite to be eliminated eventually — for v1.4, dual-write with `.reef/` winning on conflict
- **D-17:** Sub-diagrams (component per-container, code per-component) stored in `.reef/`, not SQLite-only

### Claude's Discretion

- Error visibility for `.reef/` write failures (log warning vs toast notification) — Claude decides based on complexity/benefit tradeoff

### Deferred Ideas (OUT OF SCOPE)

- Full SQLite elimination — future milestone after `.reef/` proves stable as source of truth
- Conflict resolution guidance for `.reef/` merge conflicts (TEAM-02 requirement — future release)
- Per-branch `.reef/` variants (ADV-02 — out of scope)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STOR-01 | User can see a `.reef/` folder created in their repository with a defined structure (per-level `.puml`, `.svg`, `metadata.json`) | Folder contract (D-01 through D-03) fully specified; `fs/promises` mkdir + writeFile cover creation |
| STOR-02 | `.reef/metadata.json` includes a `schemaVersion` field for forward compatibility | Zod v4.3.6 (already installed) validates schema on read; `schemaVersion: 1` written in `.meta.json` per D-04 |
| STOR-03 | File writes to `.reef/` do not trigger false stale-diagram events in the app (chokidar exclusion) | Chokidar v4.0.3 function predicate at fileWatcherService.ts:56-57 — extend with `|\.reef[/\\]` regex segment |
| STOR-04 | `.reef/` folder includes auto-generated `.gitattributes` marking SVGs as binary to prevent merge conflicts | Idempotent write on first `.reef/` creation per D-13; `*.svg binary` and `*.puml binary` lines per D-14 |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fs/promises` | Node.js stdlib (v22.22.0) | Atomic file writes, mkdir, rename | Built-in; no install needed |
| `path` | Node.js stdlib | Cross-platform path construction | Built-in; already used everywhere |
| `zod` | 4.3.6 (already installed) | Schema validation for `.meta.json` reads | Already in `package.json`; standard validation library for TypeScript |
| `chokidar` | 4.0.3 (already installed) | File watching; extend `ignored` predicate | Already in project; no new dep |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fs-extra` | 8.1.0 (transitive dep, available) | `ensureDir`, `move` helpers | Avoid — use stdlib directly to minimize dep surface |
| `os` | Node.js stdlib | `os.tmpdir()` in tests | Test helpers only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `fs/promises` | `fs-extra` | fs-extra adds convenience but is a transitive dep not a direct dep; stdlib is sufficient for this use case |
| Zod for schema validation | Manual property checks | Zod already installed; manual checks are more brittle |

**Installation:**

No new packages required. All dependencies are already present in `package.json`.

---

## Architecture Patterns

### Folder Contract

```
{repoPath}/
└── .reef/
    ├── .gitattributes          # Created on first write (D-13)
    ├── context.puml
    ├── context.svg
    ├── context.meta.json       # { schemaVersion: 1, generatedAt: ..., ... }
    ├── container.puml
    ├── container.svg
    ├── container.meta.json
    ├── component/
    │   └── {containerId}/      # sanitizedId from ElementIdRegistry
    │       ├── diagram.puml
    │       ├── diagram.svg
    │       └── diagram.meta.json
    └── code/
        └── {componentId}/
            ├── diagram.puml
            ├── diagram.svg
            └── diagram.meta.json
```

Flat layout for context/container (single diagram per level); nested subdirectories for component/code where multiple sub-diagrams exist keyed by parent element ID from `ElementIdRegistry.sanitizeId()`.

### Pattern 1: ReefStorageService Class Structure

**What:** Singleton service class following the same pattern as `C4StorageService` — constructor, public methods, no `registerHandlers()` needed in Phase 17 (IPC hookup comes in Phase 18).

**When to use:** Any code that reads or writes `.reef/` files.

```typescript
// src/main/services/reef/reefStorageService.ts
import { mkdir, writeFile, rename, unlink, readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { constants } from 'fs';

export class ReefStorageService {
  /**
   * Write a diagram level's files atomically to .reef/
   * Per D-09: individual atomic renames, not grouped
   */
  async writeLevelFiles(
    repoPath: string,
    level: 'context' | 'container',
    puml: string,
    svg: string,
    meta: ReefMetaJson
  ): Promise<void> { ... }

  async writeSubDiagramFiles(
    repoPath: string,
    level: 'component' | 'code',
    parentId: string,       // sanitizeId() output
    puml: string,
    svg: string,
    meta: ReefMetaJson
  ): Promise<void> { ... }

  async readMeta(
    repoPath: string,
    level: string,
    parentId?: string
  ): Promise<ReefMetaJson | null> { ... }   // null = missing or schema mismatch (D-05)

  async ensureGitattributes(repoPath: string): Promise<void> { ... }  // D-13 idempotent

  private async atomicWrite(
    targetPath: string,
    content: string
  ): Promise<void> { ... }   // D-08 temp-then-rename with Windows EPERM branch
}
```

### Pattern 2: Atomic Write (temp-then-rename)

**What:** Write to `<target>.tmp`, then `fs.rename()`. On Windows, if destination exists `rename` throws `EPERM` — detect platform and delete-then-rename.

**When to use:** Every file write inside `.reef/`.

```typescript
// Source: Node.js docs + STATE.md Windows concern
private async atomicWrite(targetPath: string, content: string): Promise<void> {
  const tmpPath = `${targetPath}.tmp`;

  try {
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(tmpPath, content, 'utf8');

    if (process.platform === 'win32') {
      try {
        await unlink(targetPath);
      } catch {
        // Destination doesn't exist — that's fine
      }
    }

    await rename(tmpPath, targetPath);
  } catch (error) {
    // Attempt cleanup of leftover .tmp
    try { await unlink(tmpPath); } catch { /* ignore */ }
    throw error;
  }
}
```

### Pattern 3: Chokidar Exclusion Extension

**What:** Extend the existing regex on line 57 of `fileWatcherService.ts` to include `.reef/` paths. No structural change — one regex segment addition.

**When to use:** This is the ONLY change to `FileWatcherService` in Phase 17.

```typescript
// Before (fileWatcherService.ts line 56-57):
ignored: (filePath: string) =>
  /node_modules|\.git[/\\]|[/\\]dist[/\\]|dist-electron|\.cache|[/\\]build[/\\]|[/\\]coverage[/\\]/.test(filePath),

// After — add \.reef[/\\] segment:
ignored: (filePath: string) =>
  /node_modules|\.git[/\\]|[/\\]dist[/\\]|dist-electron|\.cache|[/\\]build[/\\]|[/\\]coverage[/\\]|\.reef[/\\]/.test(filePath),
```

Note: `\.reef[/\\]` (with trailing slash) excludes `.reef/` subdirectory paths while leaving `.reef` as a bare string unmatched (belt-and-suspenders for the directory itself triggering events on creation).

### Pattern 4: Zod Schema for .meta.json Validation

**What:** Define a Zod schema for the `.meta.json` structure. On read, parse with `safeParse` — if it fails (missing `schemaVersion` or mismatch), return `null` to trigger regeneration per D-05.

**When to use:** `readMeta()` method in `ReefStorageService`.

```typescript
// Source: zod v4 docs (already installed)
import { z } from 'zod';

const CURRENT_SCHEMA_VERSION = 1;

const ReefMetaSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  level: z.enum(['context', 'container', 'component', 'code']),
  generatedAt: z.string().datetime(),
  modelUsed: z.string().optional(),
  promptVersion: z.string().optional(),
});

export type ReefMetaJson = z.infer<typeof ReefMetaSchema>;

// In readMeta():
const raw = JSON.parse(await readFile(metaPath, 'utf8'));
const result = ReefMetaSchema.safeParse(raw);
if (!result.success) return null;  // D-05: treat as missing, queue regen
return result.data;
```

### Pattern 5: .gitattributes Idempotent Creation

**What:** On first `.reef/` write, check if `.gitattributes` exists in the repo root. If not, create it with the two binary marker lines. If it exists, skip entirely (idempotent per D-13).

```typescript
// D-13: idempotent — skip if exists
async ensureGitattributes(repoPath: string): Promise<void> {
  const gitattrsPath = join(repoPath, '.reef', '.gitattributes');

  try {
    await access(gitattrsPath, constants.F_OK);
    return; // Already exists — skip
  } catch {
    // Does not exist — create it
  }

  // D-14: mark both file types as binary
  const content = '# Reef auto-generated — prevents SVG/PUML merge conflicts\n*.svg binary\n*.puml binary\n';
  await this.atomicWrite(gitattrsPath, content);
}
```

Note: `.gitattributes` is placed inside `.reef/` itself (not the repo root) so it scopes only `.reef/` artifacts and does not interfere with any existing repo `.gitattributes`.

### Anti-Patterns to Avoid

- **Eager directory creation on repo add:** D-06 says lazy — only create `.reef/` on first actual write. Creating on add bloats the filesystem with empty folders.
- **Batched atomic write (all three files in one transaction):** D-09 says individual renames. A grouped "write all or nothing" transaction is not required and adds complexity.
- **`.tmp` files outside `.reef/`:** All temp files must live inside `.reef/` so the chokidar exclusion covers them automatically per D-12.
- **Zod throwing on schema mismatch:** Use `safeParse`, not `parse`. Unrecognized schema should silently return `null` per D-05 — never throw to the caller.
- **Writing `.gitattributes` to the repository root:** Scope it inside `.reef/` to avoid side effects on existing repos.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation for `.meta.json` | Custom `if (meta.schemaVersion !== 1)` checks | `zod` v4 `safeParse` | Zod already installed; handles nested validation, unknown keys, type coercion automatically |
| Directory creation | `mkdirSync` with manual exists check | `mkdir(path, { recursive: true })` | `recursive: true` is idempotent and avoids EEXIST race condition |
| Cross-platform path handling | Manual `\\` / `/` replacement | `path.join()` | Already used throughout the codebase; handles all platforms |

**Key insight:** This phase is deliberately thin. Every problem here has a stdlib or already-installed-package solution. The complexity lives in correctness of the Windows rename branch, not in library selection.

---

## Common Pitfalls

### Pitfall 1: Chokidar Misses .reef/ Root Directory Events

**What goes wrong:** The regex `\.reef[/\\]` matches `.reef/something` but may not match the bare `.reef` path that chokidar emits when the directory itself is created (platform-dependent).

**Why it happens:** Chokidar v4 with a function predicate receives the path being evaluated. On initial directory creation, the path may end without a trailing slash.

**How to avoid:** Add both `\.reef$` and `\.reef[/\\]` to the regex: `|\.reef($|[/\\])`. This handles both the directory itself and its children.

**Warning signs:** A test where `FileWatcherService` emits stale events after writing a `.reef/` file.

### Pitfall 2: Windows EPERM on Atomic Rename

**What goes wrong:** `fs.rename(tmpPath, targetPath)` throws `EPERM` on Windows when `targetPath` already exists.

**Why it happens:** POSIX `rename()` is atomic even when destination exists. Windows `MoveFileEx` without `MOVEFILE_REPLACE_EXISTING` flag fails on existing destination. Node.js stdlib `rename` does not set that flag.

**How to avoid:** Branch on `process.platform === 'win32'`: try `unlink(targetPath)` before `rename()`. Swallow `ENOENT` from `unlink` (file may not exist on first write).

**Warning signs:** Integration tests on Windows CI fail with `EPERM` on second write of same file.

### Pitfall 3: .tmp File Pollution if atomicWrite Throws

**What goes wrong:** If `rename()` fails after `writeFile()`, the `.tmp` file is left on disk permanently. Across many regeneration cycles, orphaned `.tmp` files accumulate.

**Why it happens:** No cleanup in the error path.

**How to avoid:** Wrap `rename` in try/catch; in the catch block, attempt `unlink(tmpPath)` (swallow errors) before re-throwing.

**Warning signs:** `.reef/` directory contains many `.puml.tmp` / `.svg.tmp` files after a test run.

### Pitfall 4: Zod v4 Import Syntax

**What goes wrong:** Zod v4 (4.3.6) changed some imports — code copied from v3 docs may fail.

**Why it happens:** Zod v4 introduced breaking changes including new `z.literal()` behavior and changed some error shape properties.

**How to avoid:** Use `z.literal(1)` for `schemaVersion: 1`. Use `safeParse` not `parse`. Verify against installed v4.3.6 docs — the project already uses zod (check existing usage patterns in the codebase).

**Warning signs:** TypeScript errors on `z.object` or `result.error.issues`.

### Pitfall 5: Chokidar ignored Predicate Called During Initialization

**What goes wrong:** Chokidar calls the `ignored` predicate on all paths including the root watched directory during initialization. A regex that matches the repo root accidentally ignores everything.

**Why it happens:** The predicate is called on every path chokidar evaluates, including the watch roots themselves.

**How to avoid:** The current regex is scoped to match `.reef` as a path segment (with separator), not the full path. Test with a path like `/Users/dev/myrepo` to confirm it does NOT match.

---

## Code Examples

### atomicWrite with Windows EPERM branch

```typescript
// Pattern verified from Node.js fs/promises docs + existing project usage
import { mkdir, writeFile, rename, unlink } from 'fs/promises';
import { dirname } from 'path';

private async atomicWrite(targetPath: string, content: string): Promise<void> {
  const tmpPath = `${targetPath}.tmp`;

  try {
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(tmpPath, content, 'utf8');

    if (process.platform === 'win32') {
      try {
        await unlink(targetPath);
      } catch (e) {
        // ENOENT is expected on first write — all other errors re-throw
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
    }

    await rename(tmpPath, targetPath);
  } catch (error) {
    try { await unlink(tmpPath); } catch { /* ignore cleanup failure */ }
    throw error;
  }
}
```

### ReefMetaJson Schema Definition

```typescript
// Zod v4.3.6 (confirmed installed in project)
import { z } from 'zod';

export const REEF_SCHEMA_VERSION = 1 as const;

export const ReefMetaSchema = z.object({
  schemaVersion: z.literal(REEF_SCHEMA_VERSION),
  level: z.enum(['context', 'container', 'component', 'code']),
  generatedAt: z.string(),
  modelUsed: z.string().optional(),
  promptVersion: z.string().optional(),
  tokensUsed: z.number().optional(),
});

export type ReefMetaJson = z.infer<typeof ReefMetaSchema>;
```

### Chokidar Regex Extension

```typescript
// fileWatcherService.ts line 56-57 — extend existing regex
// Before:
ignored: (filePath: string) =>
  /node_modules|\.git[/\\]|[/\\]dist[/\\]|dist-electron|\.cache|[/\\]build[/\\]|[/\\]coverage[/\\]/.test(filePath),

// After (add \.reef($|[/\\]) to cover both directory and its children):
ignored: (filePath: string) =>
  /node_modules|\.git[/\\]|[/\\]dist[/\\]|dist-electron|\.cache|[/\\]build[/\\]|[/\\]coverage[/\\]|\.reef($|[/\\])/.test(filePath),
```

### Folder Path Helpers

```typescript
// Source: D-01, D-02 decisions
const FLAT_LEVELS = ['context', 'container'] as const;
const NESTED_LEVELS = ['component', 'code'] as const;

function reefDir(repoPath: string): string {
  return join(repoPath, '.reef');
}

function metaPath(repoPath: string, level: 'context' | 'container'): string {
  return join(repoPath, '.reef', `${level}.meta.json`);
}

function subMetaPath(repoPath: string, level: 'component' | 'code', parentId: string): string {
  return join(repoPath, '.reef', level, parentId, 'diagram.meta.json');
}
```

---

## Environment Availability

Step 2.6: All dependencies are Node.js stdlib or already installed packages. No external tools required.

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|---------|
| Node.js `fs/promises` | Atomic writes, mkdir | Yes | Node.js v22.22.0 | — |
| `path` (stdlib) | Cross-platform paths | Yes | Node.js v22.22.0 | — |
| `zod` | Schema validation | Yes | 4.3.6 | — |
| `chokidar` | File watching exclusion | Yes | 4.0.3 | — |

No missing dependencies. No fallbacks needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.main.ts` (Node.js environment — correct for main process services) |
| Quick run command | `vitest run --config vitest.config.main.ts tests/unit/main/services/reefStorageService.test.ts` |
| Full suite command | `npm run test:unit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| STOR-01 | `writeLevelFiles()` creates `.puml`, `.svg`, `.meta.json` in correct flat paths | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/reefStorageService.test.ts` | ❌ Wave 0 |
| STOR-01 | `writeSubDiagramFiles()` creates nested `component/{id}/` and `code/{id}/` paths | unit | same | ❌ Wave 0 |
| STOR-01 | `.reef/` directory created lazily on first write, not before | unit | same | ❌ Wave 0 |
| STOR-02 | `readMeta()` returns `null` when `schemaVersion` is absent | unit | same | ❌ Wave 0 |
| STOR-02 | `readMeta()` returns `null` when `schemaVersion` is wrong value | unit | same | ❌ Wave 0 |
| STOR-02 | `readMeta()` returns parsed meta when `schemaVersion: 1` present | unit | same | ❌ Wave 0 |
| STOR-03 | `FileWatcherService.ignored` predicate returns true for `.reef/context.puml` | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/fileWatcherService.test.ts` | ✅ (extend existing) |
| STOR-03 | `FileWatcherService` does not emit stale event when `.reef/` file changes | unit | same | ✅ (extend existing) |
| STOR-04 | `ensureGitattributes()` creates `.reef/.gitattributes` with `*.svg binary` and `*.puml binary` lines | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/reefStorageService.test.ts` | ❌ Wave 0 |
| STOR-04 | `ensureGitattributes()` is idempotent — second call does not overwrite | unit | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `vitest run --config vitest.config.main.ts tests/unit/main/services/reefStorageService.test.ts`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/main/services/reefStorageService.test.ts` — covers STOR-01, STOR-02, STOR-04 (new file)
- [ ] `tests/unit/main/services/fileWatcherService.test.ts` — extend existing with STOR-03 test cases (file exists, add cases)

*(No new framework install needed — `vitest.config.main.ts` already configured for Node.js environment.)*

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SQLite as sole diagram storage | Dual-write: SQLite + `.reef/` file system | v1.4 (this milestone) | `.reef/` becomes authoritative; SQLite remains for backward compat until eliminated |
| All-or-nothing grouped writes | Per-file independent atomic writes | D-07, D-09 | Simpler failure semantics; each file independently consistent |

**Deprecated/outdated:**

- Root `manifest.json` approach: Considered and rejected in CONTEXT.md discussions — `schemaVersion` per `.meta.json` instead.

---

## Open Questions

1. **Error visibility for `.reef/` write failures (Claude's discretion)**
   - What we know: D-10 says `.reef/` write failures are non-fatal in v1.4 (SQLite-first)
   - What's unclear: Should failures be logged silently, or surface as renderer toasts?
   - Recommendation: Log as `console.warn` in the main process only. Adding toast infrastructure is complexity that belongs in Phase 18 when the write path is fully integrated. Phase 17 only proves the storage layer works — it has no renderer surface.

2. **`.reef/.gitattributes` vs repo-root `.gitattributes`**
   - What we know: Decision says create `.gitattributes` inside `.reef/` (D-13, D-14 specify the path)
   - What's unclear: Git only applies `.gitattributes` files that are at the root or in the directory whose path they are in. A `.gitattributes` inside `.reef/` will apply to `*.svg` within `.reef/` — which is the correct scoping.
   - Recommendation: Confirm placement is `.reef/.gitattributes` (not repo root). This is correct behavior — it scopes the binary markers to `.reef/` only without affecting any user `.gitattributes` in the repo root.

---

## Sources

### Primary (HIGH confidence)

- Node.js v22 `fs/promises` docs — `mkdir({ recursive })`, `writeFile`, `rename`, `access`, `unlink` API
- Zod v4 docs — `z.object`, `z.literal`, `z.enum`, `safeParse` API (v4.3.6 confirmed installed)
- Direct code read of `src/main/services/fileWatcherService.ts` — chokidar v4 `ignored` function predicate pattern at line 56-57
- Direct code read of `src/main/services/c4/c4StorageService.ts` — established service pattern to follow
- Direct code read of `vitest.config.main.ts` — Node.js environment, `tests/unit/main/**` include pattern

### Secondary (MEDIUM confidence)

- Runtime test of `fs.rename()` on macOS: rename over existing file succeeds atomically (verified 2026-03-26)
- STATE.md blockers section: Windows EPERM concern explicitly documented

### Tertiary (LOW confidence)

- Windows `MoveFileEx` behavior with existing destination: documented in Win32 API docs; untested on local machine (macOS only)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries confirmed installed with exact versions; no new deps
- Architecture: HIGH — decisions fully locked in CONTEXT.md; code patterns read directly from existing services
- Pitfalls: HIGH (Windows EPERM) — documented in STATE.md; MEDIUM (chokidar regex) — pattern read directly from source, edge case untested

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable domain — Node.js stdlib + locked project decisions)
