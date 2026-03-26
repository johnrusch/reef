# Pitfalls Research

**Domain:** Adding `.reef/` repo-stored diagram artifacts to an existing Electron/SQLite C4 diagram app
**Researched:** 2026-03-26
**Confidence:** HIGH

> **Context:** This document is scoped to v1.4 — adding a `.reef/` folder (PlantUML source, AI metadata JSON, pre-rendered SVGs) inside each managed repository so diagrams are shared and version-controlled. The app already has SQLite-based persistent storage, chokidar file watching, a background generation queue, and an IPC-driven renderer. These pitfalls are specific to layering file-based storage on top of the existing SQLite layer.

---

## Critical Pitfalls

### Pitfall 1: Chokidar Watches .reef/ and Triggers Infinite Regeneration Loop

**What goes wrong:**
When the app writes a new SVG into `.reef/diagrams/context.svg`, chokidar's existing file watcher (which monitors `src/`) does not currently include `.reef/` — but this pitfall emerges if the watch scope is ever broadened, or if `.reef/` is placed at the repo root where directory-level watchers pick it up. If the watcher detects a change inside `.reef/`, it marks the diagram as stale, which triggers regeneration, which writes a new SVG, which triggers the watcher again. The loop runs until the process is killed or the generation queue is saturated.

**Why it happens:**
The `FileWatcherService.getWatchPaths()` currently watches `repoPath/src`, `repoPath/package.json`, and `repoPath/tsconfig.json`. When `.reef/` is added at `repoPath/.reef/`, any future watch scope change that watches `repoPath` as a root (common when adding new watched paths) will silently include `.reef/`. The ignored function regex (`/node_modules|\.git|dist|dist-electron|\.cache|build|coverage/`) does NOT include `.reef`, so it would pass through.

**How to avoid:**
Add `.reef` to the `ignored` function predicate in `FileWatcherService` immediately when implementing the `.reef/` feature — before any other work. The fix is one line:
```typescript
ignored: (filePath: string) =>
  /node_modules|\.git[/\\]|[/\\]dist[/\\]|dist-electron|\.cache|[/\\]build[/\\]|[/\\]coverage[/\\]|[/\\]\.reef[/\\]/.test(filePath),
```
Additionally, in the generation pipeline, when writing to `.reef/`, temporarily disable the watcher for that repo OR use the existing `awaitWriteFinish` stability threshold (already set to 100ms) which provides some protection — but the explicit ignore is required.

**Warning signs:**
- Generation queue shows repeated enqueues for the same repo without user action
- `c4-storage:state-changed` IPC events with state `'stale'` fire within 1-2 seconds of a `'fresh'` event for the same repo
- Log output shows `File change detected: .reef/...` paths

**Phase to address:**
Phase 1 (`.reef/` Folder Structure and Write) — add the ignore rule before writing the first file to `.reef/`. This is a prerequisite, not a follow-up.

---

### Pitfall 2: Git Merge Conflicts on SVG Files Block Developer Workflow

**What goes wrong:**
Two developers on the same team both run "Regenerate and Save" on the same repository within the same week. Both commit their `.reef/diagrams/*.svg` files. When the second developer pulls or merges, Git detects a conflict on `context.svg`. Since SVG is XML/text, Git attempts a text merge — but PlantUML-generated SVGs contain embedded timestamps, session IDs, and machine-specific rendering metadata that differ between runs even when the diagram is logically identical. The merge produces a broken SVG with conflict markers (`<<<<<<<` inside `<svg>`) that Reef reads and fails to parse, showing a blank diagram or a parse error. The developer has no easy way to resolve the conflict because choosing "ours" vs "theirs" requires understanding which SVG is more "current."

**Why it happens:**
PlantUML SVG output is not deterministic across machines or time. Even identical PlantUML source produces SVGs with differing `id` attributes on internal elements and (in some versions) timestamp comments. When SVGs are committed as text files, Git treats them as mergeable text, but the merge logic has no understanding of SVG semantics. Developers working in parallel on the same repo will inevitably produce conflicting SVG commits.

**How to avoid:**
Use a `.gitattributes` file in `.reef/` that marks SVG files as binary or sets a custom merge strategy. The minimum viable prevention is:
```
# .reef/.gitattributes
diagrams/*.svg binary
```
This tells Git to treat SVGs as binary (take-ours-or-theirs, no text merge), which surfaces the conflict as a choice between two full versions rather than a corrupt merged file. A better strategy is to commit PlantUML source (`.puml`) as the canonical artifact and regenerate SVGs locally — but since instant display from stored SVGs is a milestone goal, the binary attribute approach is the practical choice. Document in `.reef/README.md` that SVG conflicts should always be resolved by regenerating locally after pulling.

**Warning signs:**
- `.reef/diagrams/*.svg` files appear in `git diff` output with thousands of lines changed for cosmetic re-renderings
- `git merge` output shows conflict markers in SVG files
- Team members report "blank diagram" after pulling from a branch

**Phase to address:**
Phase 1 (`.reef/` Folder Structure and Write) — the `.gitattributes` must ship alongside the first commit that writes SVGs to `.reef/`. It cannot be added after teams have already committed conflicting SVGs without a rebase.

---

### Pitfall 3: Dual Storage Divergence Between SQLite and .reef/ Files

**What goes wrong:**
After v1.4 ships, both `C4StorageService` (SQLite) and the new `.reef/` file storage contain diagram data. A user generates diagrams (written to both), then manually edits `.reef/diagrams/context.puml` in their editor and runs `git pull` which updates `.reef/` with a teammate's newer version. The app now shows the diagram from SQLite (which is the old pre-pull version) while `.reef/` contains the newer version. From the user's perspective, the app is showing stale data that does not match what's in their repository. Worse, the "fresh" state badge shows green (SQLite is marked fresh) while the actual stored files are newer than SQLite's version.

**Why it happens:**
Two storage layers with no synchronization mechanism. SQLite is updated only when the app generates diagrams. `.reef/` files can be updated independently by git pull, manual edits, or other team members. The `FileWatcherService` detects changes to `src/` files but not changes to `.reef/` files (by design, per Pitfall 1). So an external update to `.reef/` is invisible to the SQLite layer.

**How to avoid:**
On repo import (adding a repo to Reef) and on app startup for tracked repos, read `.reef/` as the source of truth and import into SQLite if the `.reef/` version is newer. Use a version hash or `generated_at` timestamp embedded in `.reef/metadata.json` to compare against SQLite's `updated_at`. The read-from-.reef path must be the first thing the app does when a repo is loaded, before displaying any cached SVG from SQLite. A simpler mitigation: SQLite is treated as a write-through cache of `.reef/` — whenever `.reef/` is read, SQLite is populated from it; whenever generation completes, both are written atomically.

**Warning signs:**
- User reports "diagram doesn't match what's in `.reef/`" after a git pull
- `updated_at` in SQLite is older than `generated_at` in `.reef/metadata.json`
- Switching between two repos and back shows the pre-pull version despite a fresh git pull

**Phase to address:**
Phase 2 (Read from `.reef/` on Repo Import) — the import path must handle SQLite sync from the start. Never leave both storages active without a defined precedence rule.

---

### Pitfall 4: File Write Race Condition During Parallel Level Generation

**What goes wrong:**
The background generation queue generates four C4 levels sequentially (`context` → `container` → `component` → `code`). If the user triggers "Regenerate and Save" twice in quick succession (e.g., double-click), two generation runs start. The second run starts writing `context.svg` while the first run is mid-write to the same file. On Windows, this causes `EPERM` errors (file locked by the first write). On macOS/Linux, the second write may produce a partial file — the first write's incomplete data gets overwritten mid-byte, leaving a corrupt SVG that Reef reads as a broken diagram.

**Why it happens:**
`fs.writeFile` in Node.js is not atomic — it truncates the destination file first, then writes. If two processes write to the same path concurrently, the truncation from the second write can destroy the partial content from the first write, or the OS file lock on Windows prevents either write from completing. The existing generation queue has cancellation logic (`cancellationFlags`), but a second enqueue before the first run checks the flag will proceed unimpeded.

**How to avoid:**
Use atomic writes: write to a temp file in the same directory (e.g., `context.svg.tmp.{pid}`), then `fs.rename` to the final path. `fs.rename` is atomic on POSIX systems; on Windows, use a retry loop with exponential backoff if `EPERM` is thrown. For the generation queue specifically, check whether a write lock is held before starting a new run for the same repo, and reject or queue the second request. The simplest implementation: check `cancellationFlags` or a new `writingFlags` map before enqueuing, and return `{ queued: false, reason: 'already-generating' }` if a write is in progress.

**Warning signs:**
- `EPERM: operation not permitted` errors in generation logs on Windows
- SVG files in `.reef/` that contain partial XML (no closing `</svg>` tag)
- User reports "blank diagram after regenerating twice quickly"
- `fs.writeFile` error events in main process logs

**Phase to address:**
Phase 1 (`.reef/` Folder Structure and Write) — atomic write pattern must be in the initial implementation. Adding it later requires changing every file write call.

---

### Pitfall 5: .reef/ Folder Bloat from Accumulated SVGs Across Regenerations

**What goes wrong:**
Each regeneration produces new SVGs for all four C4 levels. If the app stores each generation as a separate versioned file (e.g., `context.v1.svg`, `context.v2.svg`) or fails to overwrite the previous SVG (e.g., path normalization bug produces `context_1.svg` instead of `context.svg`), the `.reef/` folder accumulates unbounded SVG files. A single C4 context SVG for a medium codebase is 100-500KB. Four levels times ten regenerations is 4-20MB of SVG files in a repo. After a year of active development, `.reef/` may contain 50-200MB of redundant SVGs — a significant git history bloat problem that is nearly impossible to clean up without rewriting git history.

**Why it happens:**
Path normalization bugs (especially on Windows with backslashes) can produce differently-named files on each regeneration. If the write logic uses `path.join(repoPath, '.reef', 'diagrams', level + '.svg')` without normalizing the separator, Windows may produce `diagrams\context.svg` as the key, which differs from `diagrams/context.svg`, causing both to exist. Additionally, if the app ever writes versioned files for "history" purposes without a cleanup strategy, bloat accumulates immediately.

**How to avoid:**
Always write to a fixed filename per level: `context.svg`, `container.svg`, `component.svg`, `code.svg` — no version suffixes. Always overwrite (not append). Normalize all paths through `path.posix.join` or the existing `normalizePath()` in `C4StorageService` before constructing `.reef/` paths. Add a periodic cleanup that lists `*.svg` files in `.reef/diagrams/` and deletes any that don't match the expected four filenames. Commit only the four current SVGs — document this in `.reef/README.md`.

**Warning signs:**
- `.reef/diagrams/` directory contains more than 4 SVG files
- Files named `context_1.svg`, `context.svg.1`, or similar variants appear alongside `context.svg`
- `du -sh .reef/` output grows on each regeneration rather than staying constant
- `git log --stat` shows hundreds of SVG files added/modified in `.reef/`

**Phase to address:**
Phase 1 (`.reef/` Folder Structure and Write) — fixed filenames and overwrite semantics must be in the initial design. Cleanup logic belongs in Phase 3 (Manual Regenerate and Save) when overwriting is made explicit.

---

### Pitfall 6: Stale SQLite State Badge Shows "Fresh" When .reef/ Has Newer Data

**What goes wrong:**
When a team member pulls a repository with updated `.reef/` files, the `DiagramStateBadge` in the UI continues to show "fresh" (green) because the SQLite `state` column has not been updated. The user sees a green badge and assumes their diagrams are current. They open the diagram and see the SQLite-cached version, not the version from `.reef/`. If the `.reef/` version was regenerated to reflect major architectural changes, the user is working from stale architectural understanding without any visual indication that something has changed.

**Why it happens:**
The `FileWatcherService` marks diagrams stale only when source code files change — it does not watch `.reef/` (by design, per Pitfall 1). When git pulls new content into `.reef/`, no watcher fires, no state update is emitted, and SQLite's state remains `'fresh'`. The state badge is driven entirely by SQLite state, not by filesystem comparison.

**How to avoid:**
On repo load and on git pull completion (hook into the existing `git-pull` IPC handler in `GitService`), run a staleness check that compares the `generated_at` timestamp in `.reef/metadata.json` against the `updated_at` in SQLite. If `.reef/metadata.json` is newer, import the `.reef/` data into SQLite and update the state to `'fresh'` with the new content. This is fundamentally the same pattern as `checkStalenessOnStartup()` in `FileWatcherService` but comparing against `.reef/` timestamps instead of source file mtimes.

**Warning signs:**
- State badge shows "fresh" immediately after `git pull` with `.reef/` changes
- `updated_at` in SQLite predates the `git log` timestamp on `.reef/metadata.json`
- Diagram content does not update after pulling a branch with regenerated diagrams
- User must manually click "Regenerate" to see what their teammate already generated

**Phase to address:**
Phase 2 (Read from `.reef/` on Repo Import) — the import logic must run both on first repo add AND on subsequent loads when `.reef/` has changed.

---

### Pitfall 7: Security — Reading Arbitrary Paths from .reef/ Without Boundary Validation

**What goes wrong:**
When the app reads `.reef/metadata.json` or `.reef/diagrams/context.svg`, the path is constructed from user-provided or repo-provided data. If a malicious `.reef/metadata.json` contains a `diagramPath` field pointing to `"../../../../../../etc/passwd"` or a Windows equivalent, and the app reads that path without validation, it exposes arbitrary file system contents to the renderer. In Electron with `contextIsolation: true` and `nodeIntegration: false`, the renderer cannot directly access the filesystem — but the main process IPC handler can, and the renderer displays whatever the main process returns.

**Why it happens:**
Electron apps trust the main process to validate all paths before reading. The current codebase's `git-execute` IPC handler takes arbitrary `repoPath` strings and passes them to `simpleGit(repoPath)` without path validation — the security assumption is that the renderer only sends paths that were previously registered. When reading `.reef/` content, developers may similarly assume that paths derived from `repoPath + '/.reef/'` are safe, but if the `.reef/metadata.json` itself is read and its fields are used to construct additional file paths, path traversal is possible.

**How to avoid:**
Never use values from files inside `.reef/` to construct file paths for subsequent reads. Only read files at predetermined paths relative to `repoPath`: always `path.join(repoPath, '.reef', 'metadata.json')`, `path.join(repoPath, '.reef', 'diagrams', level + '.svg')`. Validate that all resolved paths start with `repoPath`:
```typescript
function validateReefPath(repoPath: string, subPath: string): string {
  const resolved = path.resolve(repoPath, '.reef', subPath);
  if (!resolved.startsWith(path.resolve(repoPath))) {
    throw new Error(`Path traversal detected: ${subPath}`);
  }
  return resolved;
}
```
Never send raw file contents from `.reef/` back to the renderer to be executed as code. SVG content is displayed in an `<img src="...">` or dangerouslySetInnerHTML — the latter opens XSS vectors if the SVG contains `<script>` elements. Always sanitize SVGs before injecting as HTML.

**Warning signs:**
- `.reef/metadata.json` has a field that is used to construct a file path
- SVG content is injected via `innerHTML` without sanitization
- Path validation exists at the renderer layer but not the main process IPC handler
- `path.resolve()` is not called before checking that a path starts with `repoPath`

**Phase to address:**
Phase 1 (`.reef/` Folder Structure and Write) — path validation must be in the initial IPC read handlers. SVG sanitization belongs in Phase 4 (Instant SVG Display) when the renderer receives and displays SVG content.

---

### Pitfall 8: .reef/ Metadata Schema Changes Break Older Stored Data

**What goes wrong:**
v1.4 ships `metadata.json` with fields like `{ schemaVersion: 1, generatedAt: "...", model: "haiku", levels: [...] }`. In v1.5, a new field is added or a field is renamed. Team members who generated `.reef/` with v1.4 now have repos with v1 schema files. When v1.5 tries to read `metadata.json` and parse the `levels` array expecting the v1.5 structure, it either throws a parse error or silently reads `undefined` from the renamed field and defaults to re-generating all diagrams. The user loses their cached diagrams without warning.

**Why it happens:**
JSON metadata files have no built-in schema versioning. Without an explicit `schemaVersion` field and a migration code path, any schema change is a breaking change for existing stored data. This pitfall is exactly what happened during the v1.0→v1.1 SQLite migration — `MigrationService` was needed to handle the schema difference. File-based JSON is even more fragile because it exists across many machines in many repositories rather than in one app-controlled database.

**How to avoid:**
Embed `schemaVersion: 1` in every `metadata.json` from day one. When reading `metadata.json`, check `schemaVersion` first and apply a migration function if the version is older than the current expected version. Use additive-only schema changes for at least the first three versions: only add new optional fields, never rename or remove required fields. Document the schema in `.reef/README.md` so team members understand what each field means and what changes are backward-compatible.

**Warning signs:**
- `metadata.json` has no `schemaVersion` field
- Code reads `metadata.levels` directly without checking schema version
- Any field rename or type change between releases causes silent data loss
- The app falls back to regeneration when metadata parse fails, without logging the schema mismatch

**Phase to address:**
Phase 1 (`.reef/` Folder Structure and Write) — `schemaVersion` must be in the initial metadata schema. Migration logic belongs in Phase 2 (Read from `.reef/` on Repo Import) where the first reader is implemented.

---

### Pitfall 9: Migration From SQLite-Only to Dual Storage Leaves Inconsistent State

**What goes wrong:**
Existing users have SQLite-filled diagram data from v1.1-v1.3. When v1.4 ships, the app starts reading from `.reef/` first, with SQLite as a fallback. For users who had previously generated diagrams (SQLite has data but `.reef/` doesn't exist yet), the logic falls through to SQLite correctly. But on the user's first "Regenerate and Save" in v1.4, only the new code path writes to `.reef/`. If the write to `.reef/` succeeds but the SQLite write fails (or vice versa), the app is in a split state: one storage has `'fresh'` data and the other has `'stale'` or `'error'` data. Subsequent loads may pick up whichever storage happens to be checked first, producing non-deterministic behavior.

**Why it happens:**
The generation pipeline in `generationQueueService.ts` calls `getStorageService().storeDiagram()` and `getStorageService().updateState()` for SQLite writes. Adding `.reef/` writes requires parallel writes to two locations. Without a transaction spanning both, a partial failure leaves them inconsistent. The existing SQLite WAL mode provides atomic writes within SQLite but has no awareness of the filesystem.

**How to avoid:**
Define a clear write order and failure handling strategy: (1) write to SQLite first (existing, proven path), (2) write to `.reef/` second. If step 2 fails, log the error but do not change the SQLite state — the user can retry. If step 1 fails, do not write to `.reef/` (existing error handling already handles this). This "SQLite-first, .reef/-second" ordering means SQLite is always the authoritative state; `.reef/` is a derived artifact. On read, prefer `.reef/` (for sharing) but fall back to SQLite (for local state). Never write only to `.reef/` and not SQLite during this transition milestone.

**Warning signs:**
- `.reef/metadata.json` shows `generatedAt` timestamp but SQLite state is `'error'` or `'never_generated'`
- SQLite has `'fresh'` state but `.reef/diagrams/` directory does not exist or is empty
- App shows "fresh" badge but attempts to read SVG from `.reef/` and gets file-not-found
- Generation completes successfully but `.reef/` is missing after the run

**Phase to address:**
Phase 3 (Manual Regenerate and Save) — the dual-write coordination is implemented here. Phase 2 (Read from .reef/) should be read-only, not write.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Write SVG to `.reef/` without `.gitattributes binary` | No extra setup step | Merge conflicts with SVG conflict markers; broken diagrams after team merges | Never — ship `.gitattributes` with the first SVG write |
| Skip `schemaVersion` in `metadata.json` | Simpler initial schema | Any schema change in future versions is a breaking change for stored files | Never — `schemaVersion: 1` costs nothing |
| Use `fs.writeFile` directly instead of atomic write | Less code | Corrupt SVGs on concurrent writes; EPERM on Windows | Never for production paths — use temp-file-then-rename |
| Omit path boundary validation in IPC read handlers | Faster implementation | Path traversal vulnerability exposes arbitrary files to the app | Never — one-time 10-line validation function |
| Leave `.reef/` out of chokidar ignore list | No change to existing code | Infinite generation loop when the app writes to `.reef/` | Never — update the ignore regex in the same PR that adds `.reef/` writes |
| Keep SQLite as sole source of truth and just export `.reef/` | No dual-storage complexity | `.reef/` import on repo add never works; team-shared diagrams never used | Acceptable only as interim step before full read-from-.reef/ is implemented |
| Read `.reef/` SVGs as raw strings and inject via `innerHTML` | Simplest renderer code | XSS if PlantUML SVG contains `<script>` elements; style injection attacks | Never — use `<img src="data:image/svg+xml;base64,...">` or a sanitizer |

---

## Integration Gotchas

Common mistakes when connecting `.reef/` storage to the existing pipeline.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `FileWatcherService` + `.reef/` | Adding `.reef/` writes without updating the `ignored` predicate | Update the ignored regex to include `\.reef` before any file writes |
| `generationQueueService` + `.reef/` writes | Starting `.reef/` write after SQLite write in a different async call | Write SQLite first synchronously (better-sqlite3), then write `.reef/` — order is deterministic |
| `.reef/metadata.json` `generatedAt` field | Using `Date.now()` (local time, timezone-dependent) | Use `new Date().toISOString()` for UTC ISO 8601 strings, consistent across machines |
| Git conflict prevention | Adding `.gitattributes` after the first SVG commit | Commit `.reef/.gitattributes` in the same commit as the first SVG generation |
| SQLite `updated_at` vs `.reef/` `generatedAt` comparison | Comparing without timezone normalization | Both must be UTC; SQLite's `CURRENT_TIMESTAMP` needs `+ 'Z'` appended (as existing code already does) |
| Path construction for `.reef/` files | Using `path.join` without normalizing separators | Use `path.posix.join` or call `normalizePath()` (already in `C4StorageService`) before any path key |
| SVG display from `.reef/` | Injecting SVG string via `dangerouslySetInnerHTML` | Use `<img src="data:image/svg+xml;base64,${btoa(svg)}">` to avoid XSS; or use existing `PlantUMLRenderer` which already handles injection safely |

---

## Performance Traps

Patterns that work in development but produce unacceptable latency.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Reading all four SVGs from `.reef/` on every repo switch | 4 × file I/O on every tab switch | Keep SQLite as the display cache; only read `.reef/` on import or when SQLite is empty | Every repo navigation event |
| Checking `.reef/` staleness by reading and hashing SVG content | 100-500KB hash computation per diagram on startup | Compare only `metadata.json` `generatedAt` timestamp against SQLite `updated_at` | Every app startup with multiple repos |
| Writing all four SVGs to `.reef/` synchronously before releasing IPC | UI freezes during file write | Write `.reef/` files asynchronously after SQLite write completes; IPC resolves after SQLite write | Large SVGs (>500KB) on slow disk |
| `fs.existsSync` check before every `.reef/` read | Acceptable at startup | Repeated sync I/O in hot render path | Every diagram display if `.reef/` check is in the render path |
| Watching `.reef/` with a separate chokidar instance for import detection | Seems clever — auto-import on git pull | Circular trigger risk; adds watcher overhead per repo | Any repo that actively develops and has file watching enabled |

---

## Security Mistakes

Domain-specific security issues for reading repo-embedded files in an Electron desktop app.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Using fields from `.reef/metadata.json` to construct subsequent file read paths | Path traversal — malicious repo exposes arbitrary files | Never use metadata values as paths; only read fixed predetermined paths (`metadata.json`, `context.svg`, etc.) |
| Injecting `.reef/` SVG content via `innerHTML` without sanitization | XSS — PlantUML SVGs can contain `<script>` elements | Display SVGs via `<img src="data:image/svg+xml;base64,..."` or run through a sanitizer (DOMPurify) |
| Not validating that the resolved `.reef/` path starts with `repoPath` | Directory escape — `../../etc/passwd` style attack if subpath is externally influenced | Always `path.resolve()` then `startsWith(path.resolve(repoPath))` check |
| Reading `.reef/` files from a repo path not registered in the app's repo list | Unauthorized repo file access via IPC | Validate `repoPath` is in the list of registered repos before any `.reef/` read IPC handler proceeds |
| Storing API keys or secrets in `.reef/metadata.json` | Secret exposure when `.reef/` is committed to a public repo | Only store generation metadata (timestamps, model name, token counts); never store API keys |

---

## UX Pitfalls

Common user experience mistakes specific to the team-sharing scenario.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No indicator that `.reef/` diagrams were loaded instead of regenerated | User doesn't know if they're seeing cached or live diagrams | Show "Loaded from .reef/ (generated: X days ago)" in place of "fresh" badge when source is `.reef/` |
| Silently overwriting `.reef/` SVGs on manual regeneration | User loses teammate's carefully curated generated diagrams without confirmation | Show "This will overwrite .reef/ diagrams shared with your team. Continue?" confirmation dialog |
| No `.gitignore` guidance — user may commit `.reef/` accidentally or exclude it accidentally | Teammates don't get shared diagrams, or repo is bloated with AI metadata | Generate a `.reef/.gitkeep` and `README.md` that explains what to commit (`.puml`, `.json`, `.svg`) and what not to |
| Import from `.reef/` happens silently with no progress indicator | User sees diagrams appear instantly but doesn't understand why (or if it's from cache or .reef/) | Show a brief "Loaded from .reef/ folder" toast, same as the existing generation completion toast pattern |
| Regeneration with "Regenerate and Save" when .reef/ doesn't exist yet is indistinguishable from first generation | User doesn't understand that the first save creates the `.reef/` folder in their repo | Label the button "Generate and Save to .reef/" on first use; "Regenerate and Update .reef/" on subsequent use |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces for `.reef/` file storage.

- [ ] **`.reef/` write path:** File writes complete without error — verify that `.reef/` paths do NOT appear in chokidar change events (run with debug logging, check for self-trigger)
- [ ] **SVG conflict prevention:** SVGs are committed to the repo — verify `.reef/.gitattributes` exists with `diagrams/*.svg binary` (or equivalent merge strategy)
- [ ] **Atomic writes:** File write code uses temp-file-then-rename — verify no partial SVG files appear on macOS and no EPERM errors appear on Windows when two generation runs overlap
- [ ] **Dual storage consistency:** Generation completes — verify both SQLite and `.reef/` contain identical diagram content, not just that both exist
- [ ] **Import path:** Repo is added with existing `.reef/` — verify the diagram displays instantly from `.reef/` without triggering AI generation (check: no Anthropic API call in network log)
- [ ] **Schema versioning:** `metadata.json` is written — verify it contains `schemaVersion: 1` and that removing/adding a field in the reader code does not crash when reading a v1 file
- [ ] **Path validation:** Main process `.reef/` read IPC handler exists — verify that sending `repoPath + "/../../../etc/passwd"` returns an error, not file contents
- [ ] **SVG display safety:** SVG from `.reef/` is displayed — verify the display method is not `innerHTML` with unsanitized content (check rendered HTML source)
- [ ] **Staleness detection after git pull:** `git pull` brings in updated `.reef/` — verify app detects the newer `generatedAt` and refreshes SQLite (check: diagram content changes without user clicking Regenerate)
- [ ] **File bloat prevention:** Multiple regenerations run — verify `.reef/diagrams/` contains exactly 4 SVG files, not 4 × N

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Infinite watcher loop | LOW | Add `.reef` to ignored predicate; restart app; verify no repeated state-changed events |
| SVG merge conflicts in git | MEDIUM | Add `.reef/.gitattributes` with `binary` attribute; use `git checkout --ours` or `--theirs` to resolve; document team workflow |
| Dual storage divergence | MEDIUM | Add "resync from .reef/" action in settings; on resync, read all `.reef/` files and overwrite SQLite rows with newer content |
| Corrupt SVG from race condition | LOW | Delete the corrupt `.reef/diagrams/*.svg` files; user triggers "Regenerate and Save" which overwrites with valid content |
| Schema mismatch on metadata read | LOW | Add migration function gated on `schemaVersion` check; re-read all `.reef/metadata.json` files and rewrite with new schema |
| Path traversal discovered post-ship | HIGH | Emergency patch: add path boundary validation to all `.reef/` IPC read handlers; audit all other handlers for same pattern |
| Repo bloat from accumulated SVGs | HIGH | `git filter-repo` to remove old SVG files from history; document prevention going forward |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Chokidar self-trigger loop | Phase 1: `.reef/` Folder Structure and Write | Write an SVG; confirm no `File change detected: .reef/` log line fires |
| Git SVG merge conflicts | Phase 1: `.reef/` Folder Structure and Write | Verify `.reef/.gitattributes` is committed alongside first SVG |
| Atomic write race condition | Phase 1: `.reef/` Folder Structure and Write | Trigger two rapid regenerations; verify no partial SVG files and no EPERM errors |
| .reef/ folder bloat | Phase 1: `.reef/` Folder Structure and Write | After 3 regenerations, verify `.reef/diagrams/` has exactly 4 SVG files |
| Schema version absent from metadata | Phase 1: `.reef/` Folder Structure and Write | Read `metadata.json`; verify `schemaVersion` field exists with integer value |
| Path traversal security | Phase 1: `.reef/` Folder Structure and Write | Send crafted path to IPC handler; verify rejection |
| Dual storage divergence | Phase 2: Read from `.reef/` on Repo Import | Add repo with existing `.reef/`; verify SQLite matches `.reef/` content |
| Stale badge after git pull | Phase 2: Read from `.reef/` on Repo Import | Simulate git pull updating `.reef/`; verify diagram refreshes automatically |
| Migration inconsistency | Phase 3: Manual Regenerate and Save | Run regeneration with simulated write failure at `.reef/` step; verify SQLite is still consistent |
| SVG innerHTML XSS | Phase 4: Instant SVG Display | Inspect rendered HTML; verify SVG displayed via img tag or sanitized injection |

---

## Sources

Git SVG Conflict Resolution:
- [Avoiding binary conflicts when using Git (Medium)](https://medium.com/@douglaslassance/avoiding-binary-conflicts-when-using-git-3f220dfa6487)
- [gitattributes Documentation - Git SCM](https://git-scm.com/docs/gitattributes)
- [Use Custom Merge Driver to Simplify Git Conflicts](https://www.charpeni.com/blog/use-custom-merge-driver-to-simplify-git-conflicts)

Chokidar Race Conditions and Ignore Patterns:
- [Race condition when watching dirs leads to missed files - chokidar Issue #1112](https://github.com/paulmillr/chokidar/issues/1112)
- [Electron, chokidar, and native Node.js modules - Hendrik Erz](https://www.hendrik-erz.de/post/electron-chokidar-and-native-nodejs-modules-a-horror-story-from-integration-hell)
- [chokidar npm package](https://www.npmjs.com/package/chokidar)

Atomic File Writes:
- [write-file-atomic - npm](https://www.npmjs.com/package/write-file-atomic)
- [Race Condition in Policy Persistence leads to ENOENT error](https://github.com/google-gemini/gemini-cli/issues/18504)

Electron Security and Path Traversal:
- [Security | Electron Documentation](https://www.electronjs.org/docs/latest/tutorial/security)
- [Design A Reasonably Secure Electron Framework - Bishop Fox](https://bishopfox.com/blog/reasonably-secure-electron)
- [Penetration Testing of Electron-based Applications - DeepStrike](https://deepstrike.io/blog/penetration-testing-of-electron-based-applications)

JSON Schema Versioning:
- [Schema versioning strategies - JSON Development](https://app.studyraid.com/en/read/12384/399934/schema-versioning-strategies)
- [Understanding JSON Schema Compatibility - Robert Yokota](https://yokota.blog/2021/03/29/understanding-json-schema-compatibility/)

Git Repository Bloat and Generated Files:
- [Managing Large Assets in a Git-Based Deployment Workflow](https://dohost.us/index.php/2026/03/24/managing-large-assets-in-a-git-based-deployment-workflow/)
- [How to Avoid Adding Large Files to Git](https://dilsayar.com/how-to-avoid-adding-large-files-to-git-a-complete-developers-guide/)
- [Managing large Git Repositories - GitHub Well-Architected](https://wellarchitected.github.com/library/architecture/recommendations/scaling-git-repositories/large-git-repositories/)

---
*Pitfalls research for: v1.4 Repo-Stored Diagram Artifacts (.reef/ folder) added to existing Electron/SQLite C4 diagram app*
*Researched: 2026-03-26*
