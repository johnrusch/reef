# Stack Research: v1.4 Repo-Stored Diagrams (.reef/ Folder)

**Milestone:** v1.4 Repo-Stored Diagrams
**Researched:** 2026-03-26
**Focus:** Stack additions for storing PlantUML source, AI analysis metadata, and pre-rendered SVGs in a `.reef/` folder within each repository
**Confidence:** HIGH — this milestone requires zero new npm dependencies; all needed capabilities exist in the current stack

## Executive Summary

**v1.4 requires no new npm dependencies.** Every capability needed to write `.reef/` artifact files, read them back on repo import, and optionally commit them via git is already available in the installed stack:

- `fs/promises` (Node.js 22 built-in) — all file I/O: `mkdir`, `writeFile`, `readFile`, `access`, `stat`, `readdir`
- `simple-git` v3.28.0 (already installed) — `add(files)`, `commit()`, `checkIgnore()` for `.reef/` git integration
- `zod` v4.3.6 (already installed) — validate `.reef/metadata.json` schema on read, reject corrupt files gracefully
- `path` (Node.js built-in) — construct `.reef/` paths from `repoPath`
- `chokidar` v4.0.3 (already installed) — needs `.reef/` added to its ignore regex to avoid false change events

The architecture is straightforward: a new `ReefArtifactService` in `src/main/services/` handles all `.reef/` file I/O. It receives the outputs already produced by `C4PlantUMLGenerator` (PlantUML source strings), `AIEnricherService` (structured Zod-validated JSON), and `PlantUMLService` (rendered SVG strings), and writes them to disk. On repo import, it reads these files back and populates `C4StorageService` instead of triggering generation.

---

## What Exists vs. What Changes

### No New Dependencies Needed

| Capability | What's Used | Already In Stack |
|------------|-------------|-----------------|
| Write `.reef/*.puml` files | `fs/promises.writeFile()` | Node.js 22 built-in |
| Write `.reef/metadata.json` | `fs/promises.writeFile()` + `JSON.stringify()` | Node.js 22 built-in |
| Write `.reef/*.svg` files | `fs/promises.writeFile()` | Node.js 22 built-in |
| Read `.reef/` on repo import | `fs/promises.readFile()`, `access()`, `readdir()` | Node.js 22 built-in |
| Validate `metadata.json` on read | `zod` schema parse with `.safeParse()` | `zod` v4.3.6 |
| Create `.reef/` directory | `fs/promises.mkdir({ recursive: true })` | Node.js 22 built-in |
| Stage `.reef/` for git commit | `simpleGit(repoPath).add(['.reef/'])` | `simple-git` v3.28.0 |
| Commit `.reef/` to repo | `simpleGit(repoPath).commit('Add Reef diagrams')` | `simple-git` v3.28.0 |
| Check if `.reef/` is gitignored | `simpleGit(repoPath).checkIgnore(['.reef/'])` | `simple-git` v3.28.0 |
| Exclude `.reef/` from file watching | Extend chokidar `ignored` regex in `fileWatcherService.ts` | `chokidar` v4.0.3 |
| Path construction | `path.join(repoPath, '.reef', level + '.puml')` | Node.js built-in |

### Code Changes Only (No npm install)

| File | Change | Why |
|------|--------|-----|
| `src/main/services/reefArtifactService.ts` | **New file** — all `.reef/` read/write logic | Separation of concerns; keeps `C4StorageService` focused on SQLite |
| `src/main/services/fileWatcherService.ts` | Add `\.reef` to `ignored` regex | Prevents writes to `.reef/` from triggering stale-diagram events |
| `src/main/services/c4/generationQueueService.ts` | After generation completes, call `reefArtifactService.writeArtifacts()` | Hook into existing generation pipeline |
| `src/main/main.ts` | Register IPC handlers for `reef:read-artifacts`, `reef:write-artifacts` | Surface new service to renderer |
| `src/shared/types/` | Add `ReefMetadata` TypeScript type | Shared type for metadata.json shape |

---

## Recommended Stack (No Changes to Install)

### Core Technologies — Unchanged

| Technology | Version | Role in v1.4 |
|------------|---------|--------------|
| Node.js `fs/promises` | v22 built-in | All `.reef/` directory and file operations |
| `simple-git` | v3.28.0 (installed) | Stage and commit `.reef/` artifacts to repository git history |
| `zod` | v4.3.6 (installed) | Parse and validate `metadata.json` on read; reject schema mismatches |
| `path` | Node.js built-in | Construct `.reef/` subdirectory paths cross-platform |
| `chokidar` | v4.0.3 (installed) | Existing file watcher needs `.reef/` excluded from its scope |
| `better-sqlite3` | v11.10.0 (installed) | SQLite remains the primary store; `.reef/` is a secondary export format |

### Supporting Libraries — Unchanged

| Library | Version | Role in v1.4 |
|---------|---------|--------------|
| `@anthropic-ai/sdk` | v0.78.0 (installed) | AI enrichment JSON output written to `.reef/metadata.json` |
| `node-plantuml` | v0.9.0 (installed) | SVG rendered by PlantUMLService, written to `.reef/<level>.svg` |
| Electron `app.getPath('userData')` | Electron 38 (installed) | Not needed for `.reef/` — `.reef/` lives in the repo, not userData |

---

## .reef/ Folder Structure

The artifact layout that `ReefArtifactService` writes and reads:

```
<repo-root>/
  .reef/
    context.puml          # PlantUML source for Context level
    container.puml         # PlantUML source for Container level
    component.puml         # PlantUML source for Component level (if generated)
    code.puml              # PlantUML source for Code level (if generated)
    context.svg            # Pre-rendered SVG for Context level
    container.svg          # Pre-rendered SVG for Container level
    component.svg          # Pre-rendered SVG for Component level (if generated)
    code.svg               # Pre-rendered SVG for Code level (if generated)
    metadata.json          # AI enrichment data, generation timestamps, model info
```

### metadata.json Schema (Zod-validated)

```typescript
// src/shared/types/reefMetadata.ts
import { z } from 'zod';

export const ReefLevelMetadataSchema = z.object({
  level: z.enum(['context', 'container', 'component', 'code']),
  generatedAt: z.string().datetime(),
  modelUsed: z.string(),
  tokensUsed: z.number().int().optional(),
  promptVersion: z.string(),
  enrichmentData: z.unknown(), // Typed per-level by caller (EnrichedContextLevel etc.)
});

export const ReefMetadataSchema = z.object({
  reefVersion: z.literal('1.4'),
  repoPath: z.string(),
  levels: z.array(ReefLevelMetadataSchema),
});

export type ReefMetadata = z.infer<typeof ReefMetadataSchema>;
```

Using `safeParse()` on read allows graceful degradation: if `.reef/metadata.json` is corrupt or from an older schema version, fall back to regenerating rather than crashing.

---

## Integration Points with Existing Pipeline

### Write Path (Generation → .reef/)

The existing three-phase generation pipeline produces outputs that map directly to `.reef/` file contents:

```
Static Analysis → AI Enrichment → PlantUML Generation → [current] SQLite storage
                                                        → [new] .reef/ file write
```

After `generationQueueService.ts` completes a level, it already has:
- `plantUmlSource: string` from `C4PlantUMLGenerator` → write as `context.puml`
- `svgContent: string` from `PlantUMLService` → write as `context.svg`
- `enrichedData: EnrichedArchitecture` (typed by Zod) → serialize into `metadata.json`

The generation queue calls `c4StorageService.storeDiagram()` today. Add a parallel call to `reefArtifactService.writeArtifacts()`. No pipeline restructuring needed.

### Read Path (Repo Import → Skip Generation)

On repository import (`ipcMain.handle('repositories:add')`), before triggering the generation queue:

1. Call `reefArtifactService.hasArtifacts(repoPath)` — checks for `.reef/metadata.json` existence
2. If YES: Call `reefArtifactService.readArtifacts(repoPath)` — returns typed `ReefArtifacts`
3. Populate `C4StorageService` with the read data (same `storeDiagram()` call path)
4. Skip generation queue entirely — serve SVGs from SQLite (existing cache path)

This integrates at the `generationQueueService` or repository-add IPC handler level — no changes to the renderer or Zustand stores needed.

### Git Commit Path (Manual "Save to Repo")

`simple-git`'s existing API handles this without changes:

```typescript
// In ReefArtifactService
async commitArtifacts(repoPath: string): Promise<void> {
  const git = simpleGit(repoPath);

  // Check if .reef/ is gitignored before attempting to stage
  const ignored = await git.checkIgnore(['.reef/']);
  if (ignored.length > 0) {
    throw new Error('.reef/ is excluded by .gitignore — cannot commit artifacts');
  }

  // Stage only .reef/ files (not all untracked changes)
  await git.add([path.join(repoPath, '.reef')]);
  await git.commit('chore: update Reef architecture diagrams');
}
```

The existing `gitService.ts` already uses `simpleGit(repoPath).add(files)` and `.commit()` — this pattern is established. `ReefArtifactService` can instantiate its own `simpleGit` instance or receive one from `GitService`.

### Chokidar Exclusion (One-Line Change)

Current `ignored` regex in `fileWatcherService.ts` line 57:

```typescript
ignored: (filePath: string) =>
  /node_modules|\.git[/\\]|[/\\]dist[/\\]|dist-electron|\.cache|[/\\]build[/\\]|[/\\]coverage[/\\]/.test(filePath),
```

Add `\.reef` to prevent writes to `.reef/` from marking diagrams stale:

```typescript
ignored: (filePath: string) =>
  /node_modules|\.git[/\\]|[/\\]dist[/\\]|dist-electron|\.cache|[/\\]build[/\\]|[/\\]coverage[/\\]|[/\\]\.reef[/\\]/.test(filePath),
```

This is a one-line change in an existing file. No new configuration or libraries needed.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `fs/promises` (built-in) | `graceful-fs` npm package | Adds a dependency for retry logic that's unnecessary — Electron main process file I/O on local repos does not hit EMFILE limits that `graceful-fs` addresses |
| `fs/promises` (built-in) | `fs-extra` npm package | `fs-extra` wraps `fs` with `mkdirp`, `copy`, etc. — all of these are available natively in Node.js 22 (`mkdir({ recursive: true })`, `cp()`) |
| `simple-git` (existing) | `nodegit` or `isomorphic-git` | `nodegit` requires native compilation; `isomorphic-git` would be a new dependency. `simple-git` v3.28.0 is already installed and has all needed methods |
| `zod` (existing) | Manual `JSON.parse` with try/catch | No schema validation means corrupt or version-mismatched `metadata.json` files cause runtime type errors instead of clean fallback |
| `zod` (existing) | `ajv` JSON Schema validator | New dependency; `zod` already installed and used for AI enrichment schemas — reuse the pattern |
| Plain JSON for metadata | YAML (`js-yaml`) | JSON is adequate; YAML adds a new dependency for no gain since humans will rarely hand-edit `.reef/metadata.json` |
| Plain JSON for metadata | SQLite export | Defeats the purpose — `.reef/` must be a portable, VCS-friendly format humans can inspect |
| Custom file watcher exclusion | No change to chokidar config | Without excluding `.reef/`, every write to `.reef/` during generation would trigger a stale-diagram event, causing false regeneration prompts |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `fs-extra` | `npm install` for `mkdirp` when `fs.mkdir({ recursive: true })` exists in Node.js 22 | `fs/promises.mkdir` built-in |
| `graceful-fs` | Retry logic for EMFILE errors — not a concern in Electron main process with local repo access | `fs/promises` built-in |
| `js-yaml` | YAML serialization adds a dependency; JSON is human-readable and `JSON.stringify(null, 2)` produces clean output | `JSON.stringify` built-in |
| `ajv` | New JSON Schema validator when `zod` is already installed and used throughout the codebase | `zod` v4.3.6 already installed |
| `nodegit` or `isomorphic-git` | New git libraries when `simple-git` v3.28.0 already has `add()`, `commit()`, `checkIgnore()` | `simple-git` already installed |
| New SQLite tables for `.reef/` tracking | Over-engineering — `.reef/` is a file-system artifact, not a database record | `fs/promises.access()` to check existence |
| A separate file-watching service for `.reef/` | Adds complexity — `.reef/` reads are on-demand (repo import), not event-driven | Explicit `readArtifacts()` call on repo add |

---

## Version Compatibility

| Package | Current Version | v1.4 Change | Notes |
|---------|-----------------|-------------|-------|
| `simple-git` | v3.28.0 | No change | `add()`, `commit()`, `checkIgnore()` verified present in this version |
| `zod` | v4.3.6 | No change | `safeParse()` used for `.reef/metadata.json` validation |
| `chokidar` | v4.0.3 | One-line regex change | Add `\.reef` to `ignored` predicate — no API changes |
| `better-sqlite3` | v11.10.0 | No change | SQLite remains primary store; `.reef/` is a parallel export |
| Node.js `fs/promises` | v22 (Electron 38) | No change | All needed APIs (`mkdir`, `writeFile`, `readFile`, `access`, `stat`, `readdir`) available since Node.js 14+ |

---

## Stack Patterns by Scenario

**If `.reef/` exists on repo import:**
- Read `metadata.json` with `fs/promises.readFile()`, validate with `zod.safeParse()`
- Read `.svg` files with `fs/promises.readFile()` — binary safe as UTF-8 SVGs
- Populate `C4StorageService.storeDiagram()` with read data
- Skip generation queue — serve from SQLite cache immediately

**If `.reef/` does not exist on repo import:**
- Proceed with existing generation queue (no change to current behavior)
- After generation completes, call `reefArtifactService.writeArtifacts()`
- Next import of this repo will find `.reef/` and skip generation

**If `.reef/metadata.json` is corrupt or wrong schema version:**
- `zod.safeParse()` returns `{ success: false }`
- Log warning, fall through to generation queue
- After generation, overwrite `.reef/` with current output

**If `.reef/` is listed in `.gitignore`:**
- `simpleGit.checkIgnore(['.reef/'])` returns non-empty array
- Do not attempt to stage/commit
- Inform user via IPC response that commit was skipped due to gitignore

**If user has no git user.name configured (commit would fail):**
- `simpleGit.commit()` throws with git error
- Catch, surface as IPC error to renderer — do not crash
- File artifacts are still written; only the git commit step is optional

---

## Sources

- Node.js v22 `fs/promises` API — [https://nodejs.org/api/fs.html#fspromisesmkdirpath-options](https://nodejs.org/api/fs.html#fspromisesmkdirpath-options) — `mkdir`, `writeFile`, `readFile`, `access`, `stat`, `readdir` all available; HIGH confidence
- `simple-git` v3.28.0 TypeScript definitions — `/node_modules/simple-git/dist/typings/simple-git.d.ts` — `add(files: string | string[])`, `commit()`, `checkIgnore(path: string | string[])` all present; HIGH confidence (verified in installed package)
- `zod` v4.3.6 — [https://zod.dev](https://zod.dev) — `z.object()`, `z.literal()`, `z.enum()`, `.safeParse()` all in installed version; HIGH confidence
- Electron 38 ships Node.js 22 — verified via `node -e "console.log(process.version)"` in project environment; HIGH confidence
- `chokidar` v4.0.3 `ignored` function predicate — verified in `/src/main/services/fileWatcherService.ts` line 56; HIGH confidence (existing codebase pattern)

---

**Research conclusion:** v1.4 is a pure code milestone. The installed stack covers 100% of the required capabilities. The implementation work is one new service file (`reefArtifactService.ts`), one new shared type (`ReefMetadata`), one-line chokidar change, and integration hooks in the generation queue and repo-import IPC handler.

---
*Stack research for: v1.4 Repo-Stored Diagrams (.reef/ folder artifact storage)*
*Researched: 2026-03-26*
