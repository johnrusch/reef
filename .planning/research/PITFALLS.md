# Pitfalls Research

**Domain:** Adding persistent storage, real-time change visualization, and contextual navigation to C4 diagram tools
**Researched:** 2026-02-24
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Migration Without Backward Compatibility Strategy

**What goes wrong:**
When migrating from TTL-based caching to persistent storage, existing cached diagrams become orphaned or lost. Users lose all generated diagrams on upgrade, forcing expensive regeneration of every repository's diagrams. In production, migration errors can corrupt the database, making the app unusable.

**Why it happens:**
Developers focus on the new storage schema without planning how to preserve or migrate existing cached data. SQLite doesn't support many common schema operations (like renaming columns), and attempting unsupported operations throws NotSupportedException. The "just create tables on startup" approach fails on upgrade paths.

**How to avoid:**
- Create a `schema_migrations` table to track database version
- Store an integer version and apply migrations in sequential order
- For SQLite limitations (rename/drop columns), use the create-copy-drop pattern: create new table with desired schema, copy data from old table, drop old table, rename new one
- Before migration, export existing cache entries with metadata (repo path, diagram level, timestamp)
- Provide fallback: if migration fails, preserve old cache in read-only mode and warn user
- Test migration path with realistic data (repos with all 4 C4 levels cached)

**Warning signs:**
- Migration script not tested with existing cache database
- No rollback strategy if migration fails
- Schema changes made directly without version tracking
- "Clean install works, upgrade crashes" bug reports

**Phase to address:**
Phase 1 (Persistent Storage Foundation) — before any persistent storage code is written

---

### Pitfall 2: Race Conditions in File Watcher + Regeneration Pipeline

**What goes wrong:**
File watcher fires "modify" event, but file contents are empty when read because the write hasn't completed. Multiple rapid file changes trigger overlapping regeneration jobs, wasting API calls and causing incorrect diagram states. Chokidar can lose file events during startup when watching large nested folder structures.

**Why it happens:**
File systems don't provide atomic "write complete" notifications. Editors save files in multiple operations (write temp, rename, delete original). Chokidar fires events immediately, not after write completion. Without debouncing, every keystroke in a file triggers a full diagram regeneration costing API credits.

**How to avoid:**
- Implement debounce (500ms-2s) for file change events: wait for changes to "settle" before regenerating
- Use file hash comparison: only regenerate if content actually changed (catches rename/touch operations)
- Queue regeneration jobs with deduplication: if job for same diagram level already queued, skip duplicate
- Add retry logic with exponential backoff for empty file reads
- For chokidar on large repos: use `awaitWriteFinish` option with `stabilityThreshold` (1000ms)
- Consider throttling: limit to one regeneration per diagram level per time window

**Warning signs:**
- CPU spikes during file editing sessions
- "Empty diagram generated" errors
- Multiple API calls for single file save
- Regeneration jobs backing up in queue
- High API costs from duplicate work

**Phase to address:**
Phase 2 (Real-Time Change Detection) — file watching logic must include debouncing from day one

---

### Pitfall 3: Database Lock Deadlocks from Concurrent Writes

**What goes wrong:**
Multiple renderer processes or background jobs attempt to write diagram data simultaneously, causing SQLite "database is locked" errors. Regeneration jobs fail silently, leaving diagrams stale. In worst case, write contention causes the app to freeze or crash.

**Why it happens:**
SQLite only allows one write operation at a time. In Electron, if renderer processes write directly to the database, each browser tab could modify state while others keep outdated UI. Better-sqlite3 in Electron must run in main process, but developers sometimes try to access it from renderer, causing locks.

**How to avoid:**
- ALL database operations MUST run in main process via IPC
- Implement write queue with single-threaded executor: serialize all writes through one channel
- Use WAL (Write-Ahead Logging) mode: `PRAGMA journal_mode=WAL` for better concurrency
- Set reasonable busy timeout: `PRAGMA busy_timeout=5000` (5 seconds)
- For reads from renderer: use IPC to request data from main process
- Consider eventual consistency: renderer can work with slightly stale data, sync when convenient
- Never open multiple database connections from different processes

**Warning signs:**
- "Database is locked" error messages
- Intermittent write failures that succeed on retry
- App hangs when multiple repos regenerate simultaneously
- Database file grows but writes don't appear
- Corruption errors after concurrent operations

**Phase to address:**
Phase 1 (Persistent Storage Foundation) — architecture must enforce single-process writes

---

### Pitfall 4: Cache Invalidation That Never Fires

**What goes wrong:**
Diagrams become permanently stale because invalidation logic has bugs. Users see outdated architecture even after major code refactors. The QueryPilot team at Readyset (2026) discovered their metadata cache was never invalidated and stayed permanently stale, causing repeated failures.

**Why it happens:**
Cache invalidation is genuinely hard. Developers implement TTL or event-based invalidation but miss edge cases: file renamed (not modified), git branch switch, external file changes, dependency updates. Invalidation code is often write-once and rarely tested with real scenarios.

**How to avoid:**
- Multiple invalidation triggers, not just file modification time:
  - File content hash changes
  - Git HEAD changes (branch switch, pull)
  - Dependency file changes (package.json, go.mod)
  - Explicit user-triggered refresh
- Add "generated at" timestamp to diagram metadata, show age in UI
- Provide manual "force regenerate" option as escape hatch
- Log invalidation decisions for debugging: "Invalidated diagram X because Y"
- Test invalidation with realistic scenarios: rename files, switch branches, merge conflicts
- Consider hybrid approach: background check for staleness, regenerate opportunistically

**Warning signs:**
- User reports "diagram doesn't match code"
- Invalidation logs missing expected triggers
- Diagrams never regenerate after initial generation
- File timestamp checks but content hasn't actually changed
- No way for user to force refresh

**Phase to address:**
Phase 2 (Real-Time Change Detection) — invalidation must be comprehensive and testable

---

### Pitfall 5: Change Bubble-Up Logic That Loses Context

**What goes wrong:**
Code-level changes mark Container and Context levels as "changed," but navigating up the hierarchy loses information about WHAT changed. Users see "3 changes" indicator but can't identify which components are affected. Clicking a changed element doesn't show relevant diff.

**Why it happens:**
Developers implement simple boolean "hasChanges" flag that bubbles up, losing granularity. The hierarchy stores aggregated state ("something changed below") but not which specific children changed. Navigation connects diagram elements to diff viewer by filename, but element IDs don't map back to source files.

**How to avoid:**
- Store hierarchical change metadata, not just boolean:
  ```typescript
  {
    level: 'Container',
    elementId: 'web-app',
    hasChanges: true,
    changedChildren: ['AuthService', 'UserService'],
    changedFiles: ['src/auth/login.ts', 'src/user/profile.ts']
  }
  ```
- When bubbling up, preserve change path: Context → Container(web-app) → Component(AuthService) → Code(login.ts)
- SVG element click extracts element ID, looks up in change metadata, navigates to first changed file
- Visual indicators show change count AND allow drilling down to specific changes
- Navigation stack includes file context: "Container.web-app.AuthService → login.ts:15"

**Warning signs:**
- Change indicators are all-or-nothing (no granularity)
- Users click changed element, see unrelated file in diff viewer
- No way to see which specific components changed
- Change metadata doesn't survive navigation
- Bubbled indicators don't link back to source

**Phase to address:**
Phase 3 (Change Visualization & Bubble-Up) — design data structure before implementing UI

---

### Pitfall 6: Auto-Generate Without Cost Awareness Creates Angry Users

**What goes wrong:**
User adds 10 repositories, app immediately starts generating diagrams for all, burning through $5-10 of API credits without warning. User sees unexpected charges, feels deceived, leaves negative review. EU regulators fine app for dark pattern (taking costly action without explicit consent).

**Why it happens:**
Developers optimize for "magical" UX: auto-generate makes feature feel seamless. They forget API calls have real costs that user pays (indirectly via subscription or directly via API key). 2026 EU regulations crack down on actions taken without informed consent, especially those with financial impact.

**How to avoid:**
- On repository add, show cost estimation modal:
  ```
  Generate C4 diagrams for [repo name]?

  Estimated cost: $0.20-0.50 (based on codebase size)
  Time: 2-5 minutes

  [Generate Now] [Skip] [Settings]
  ```
- Remember user preference: "Always auto-generate" checkbox (but still show progress/cost)
- Start with Context level only (cheapest), offer to generate deeper levels
- Show running cost total in progress UI
- Settings panel: auto-generate threshold (repos > 10k LOC require confirmation)
- Cache prompt for user education: "Regeneration will use cached analysis (90% savings)"

**Warning signs:**
- No cost estimation before expensive operations
- Users surprised by API charges
- No way to cancel in-progress generation
- Bulk operations don't show total cost
- Settings don't include cost controls

**Phase to address:**
Phase 4 (Auto-Generate on Repo Add) — implement consent flow before auto-generate logic

---

### Pitfall 7: SVG Click Detection That Breaks with PlantUML Updates

**What goes wrong:**
PlantUML updates change SVG structure, breaking element ID extraction. Users click diagram elements, nothing happens. Navigation worked in development but fails in production with different PlantUML version. Accessibility broken because screen readers can't identify clickable elements.

**Why it happens:**
Code assumes specific SVG structure based on current PlantUML version. DOM traversal uses brittle selectors like `.parentElement.parentElement.id`. PlantUML doesn't guarantee stable SVG structure across versions. Element IDs sometimes have prefixes (`elem_`, `entity_`) that change.

**How to avoid:**
- Don't assume SVG structure: traverse upward until ID found, don't hardcode depth
- Implement ID extraction strategy with fallbacks:
  1. Try current element ID
  2. Traverse parents up to 5 levels looking for ID
  3. Check data attributes (data-element-id)
  4. Fall back to text content matching
- Add version detection: store PlantUML version with diagram, warn if mismatch
- Test with multiple PlantUML versions (current, current-1, current+1)
- Add ARIA labels to SVG for accessibility: screen readers need element identification
- Log failed click detection for debugging: "Click at (x,y) found no element ID"

**Warning signs:**
- Click detection code has hardcoded parent/child traversal
- No error handling when ID not found
- Tests only run against single PlantUML version
- SVG structure changes break navigation
- No accessibility testing

**Phase to address:**
Phase 5 (Contextual Navigation) — build robust click detection from start

---

### Pitfall 8: Diff Viewer Navigation Without File Context

**What goes wrong:**
User clicks changed Code-level element, diff viewer opens but shows wrong file or entire file (no line number). User has to manually search for the change. Multi-file components show random file instead of the changed one. Navigation loses value because it's not contextual.

**Why it happens:**
Diagram elements don't store file/line mapping. Change detection knows files changed but not which elements map to which files. Code-level diagrams aggregate multiple files into one element (e.g., "UserService" spans 3 files). Click handler defaults to first file alphabetically instead of the changed one.

**How to avoid:**
- Store element-to-file mapping in diagram metadata:
  ```typescript
  {
    elementId: 'UserService',
    files: [
      { path: 'src/user/service.ts', lines: [1, 150] },
      { path: 'src/user/repository.ts', lines: [1, 80] }
    ],
    primaryFile: 'src/user/service.ts'
  }
  ```
- Change detection enriches metadata with changed regions:
  ```typescript
  {
    file: 'src/user/service.ts',
    changedLines: [[45, 52], [78, 80]]
  }
  ```
- Navigation logic: element click → find changed file → scroll to first changed line
- If multiple files changed: show file picker or open all in tabs
- For unchanged elements: navigate to primary file (no line number)

**Warning signs:**
- Navigation always opens top of file
- No line number in diff viewer URL
- Multi-file elements show wrong file
- Change detection separate from element mapping
- No way to navigate to specific change region

**Phase to address:**
Phase 5 (Contextual Navigation) — design metadata structure with file mapping

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store only diagram SVG, not metadata | Simple schema, less storage | No element mapping, can't implement navigation | Never — metadata is required for phase 3-5 features |
| Global "regenerate all" instead of granular invalidation | Easy to implement | Wastes API credits, slow UX | MVP only — must refactor by phase 2 |
| In-memory change tracking (not persisted) | No database complexity | Lost on app restart, can't show historical changes | Only if "changes since last open" is acceptable |
| Single database connection shared across processes | Seems simpler than IPC | Race conditions, locks, corruption risk | Never — Electron requires main-process DB access |
| Hardcode debounce delay (e.g., 500ms) | Works for developer's machine | Too fast for network drives, too slow for local SSD | Only if user can configure in settings |
| Skip cost estimation UI for "just one repo" | Faster onboarding flow | User surprise at first bill, trust broken | Never — cost awareness is regulatory requirement in 2026 |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Chokidar file watching | Watch entire repo including `node_modules`, `.git` | Use ignore patterns: `ignored: /(^|[\/\\])\.|node_modules/` — reduces events by 95% |
| Better-SQLite3 in Electron | Opening database in renderer process | Only open in main process, use IPC for all operations — prevents locks |
| PlantUML server | Assuming diagram generation is instant | Add timeout (30s), retry logic, and progress indicators — large diagrams can take 10s+ |
| Anthropic API prompt caching | Not using `cache_control` ephemeral | Add cache control to system prompt and analysis context — 90% cost reduction |
| Git change detection | Using `fs.stat()` modification time only | Hash file content: catches renames, reverts, and git operations |
| SVG rendering in Electron | Loading multi-MB SVG synchronously | Stream or chunk large SVGs, show loading state — prevents UI freeze |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Regenerate all 4 C4 levels on any file change | High API costs, slow feedback | Only regenerate affected level: Code change → Code level only, then bubble up | >5 repos with active development |
| Store entire SVG in memory for change detection | High memory usage, GC pauses | Store only metadata hash, load SVG on demand | >20 diagrams cached |
| Single-threaded regeneration queue | One repo blocks all others | Parallel workers (max 3) with priority queue | >10 repos active |
| File watcher on large monorepo without filtering | 1000s of events per second, CPU spike | Filter by file extension (.ts, .tsx, .js), skip test files | Repos >50k files |
| Linear search through all cached diagrams | Slow lookups as cache grows | Index by repo path + level, use SQLite queries | >100 diagrams |
| Synchronous diagram generation in main process | UI freeze during generation | Move generation to background worker, IPC for results | Any repo >1k LOC |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing API keys in SQLite without encryption | Keys readable in database file | Use Electron's safeStorage API for credentials, store only encrypted tokens |
| Allowing renderer to execute arbitrary SQL | SQL injection, data corruption | Main process validates and parameterizes all queries, renderer sends only data |
| Reading entire codebase into memory for analysis | OOM crash, denial of service | Stream files, use token limits, exclude large files (>1MB) |
| Exposing file paths in SVG metadata | Information disclosure in exports | Use relative paths, strip sensitive directories in exported diagrams |
| No rate limiting on regeneration requests | User can trigger $100s of API charges | Throttle: max 5 regenerations per repo per hour, require confirmation for bulk |
| Trusting PlantUML server output without validation | XSS if malicious SVG injected | Sanitize SVG: strip `<script>`, validate structure before rendering |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent background regeneration | User doesn't know diagram is updating, clicks stale diagram | Show discrete progress indicator, disable interaction during regeneration |
| "3 files changed" without showing which files | User has to guess what changed | Expandable change list: click indicator to see file list |
| No loading state for auto-generate on repo add | User waits 2-3 min with no feedback, thinks app crashed | Progress modal with phases: "Analyzing structure... (1/4)" |
| Change indicators disappear after navigation | User can't return to see what changed | Persist change state until explicit "mark as reviewed" |
| Opening diff viewer loses diagram context | User has to navigate back, re-find position | Split view or modal: keep diagram visible while showing diff |
| No indication which diagram levels exist | User clicks Component, nothing happens (not generated) | Breadcrumb shows available levels, disable unavailable |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Persistent storage:** Schema created — verify migration from TTL cache tested with real data
- [ ] **File watching:** Chokidar integrated — verify debouncing works, test with rapid saves
- [ ] **Change detection:** Files compared — verify git operations (branch switch, merge) trigger correctly
- [ ] **Change visualization:** Indicators show on diagrams — verify indicators bubble up all 4 levels correctly
- [ ] **Contextual navigation:** Clicks navigate to code — verify line numbers match, multi-file elements handled
- [ ] **Auto-generate:** Runs on repo add — verify cost estimation shown, user can cancel
- [ ] **Database writes:** IPC to main process — verify no locks, concurrent writes queued
- [ ] **Cache invalidation:** Staleness detected — verify all invalidation triggers tested (rename, git ops, manual)
- [ ] **SVG click detection:** Element IDs extracted — verify works with different PlantUML versions
- [ ] **Error recovery:** Regeneration failure — verify diagram doesn't disappear, user notified, retry offered

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Migration corrupts database | MEDIUM | 1. Export all SVGs to temp dir, 2. Delete database, 3. Recreate schema, 4. Re-import metadata from git history |
| Race condition generates duplicate diagrams | LOW | 1. Add unique constraint (repo + level), 2. On conflict, keep newest, 3. Cleanup script removes duplicates |
| Cache invalidation never fires | LOW | 1. Add manual "force regenerate" button, 2. Show diagram age, 3. Background task checks staleness daily |
| Database locked deadlock | LOW | 1. Restart app (releases locks), 2. Enable WAL mode, 3. Audit code for direct renderer access |
| Auto-generate burns API credits | MEDIUM | 1. Add cost cap setting, 2. Refund user, 3. Implement consent flow |
| SVG click detection breaks | LOW | 1. Add fallback: show element list modal, 2. User selects manually, 3. Update to compatible PlantUML |
| Change bubble-up loses context | MEDIUM | 1. Migrate metadata schema, 2. Add file mapping, 3. Force regenerate all diagrams |
| Diff navigation wrong file | LOW | 1. Add file picker UI, 2. Let user select correct file, 3. Store selection for future |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Migration without backward compatibility | Phase 1 | Test upgrade from v1.0 cache to v1.1 persistent storage — no data loss |
| Race conditions in file watcher | Phase 2 | Save file 10 times rapidly — only 1 regeneration triggers |
| Database lock deadlocks | Phase 1 | Add 5 repos, regenerate all simultaneously — no locks or errors |
| Cache invalidation never fires | Phase 2 | Switch git branch — diagram regenerates within 2s |
| Change bubble-up loses context | Phase 3 | Change Code-level file — Context level shows correct granular changes |
| Auto-generate without cost awareness | Phase 4 | Add repo — cost modal shown, user can decline |
| SVG click detection breaks | Phase 5 | Test with PlantUML v1.2025.x and v1.2026.x — clicks work |
| Diff navigation without file context | Phase 5 | Click changed element — diff viewer opens to correct line |

## Sources

Migration and SQLite:
- [SQLite Versioning and Migration Strategies](https://www.sqliteforum.com/p/sqlite-versioning-and-migration-strategies)
- [Managing Database Versions and Migrations in SQLite](https://www.sqliteforum.com/p/managing-database-versions-and-migrations)
- [Simple declarative schema migration for SQLite](https://david.rothlis.net/declarative-schema-migration-for-sqlite/)
- [Electron Database - RxDB](https://rxdb.info/electron-database.html)

File Watching Performance:
- [Performance on Windows is unacceptable for large folders - chokidar Issue #228](https://github.com/paulmillr/chokidar/issues/228)
- [chokidar is very slow when monitoring large network drives - Issue #970](https://github.com/paulmillr/chokidar/issues/970)
- [File watcher resulting in high CPU use - VS Code Issue #3998](https://github.com/microsoft/vscode/issues/3998)

Cache Invalidation:
- [Catching a caching bug at Readyset - Antithesis Blog 2026](https://antithesis.com/blog/2026/readyset/)
- [Cache invalidation really is one of the hardest problems](https://surfingcomplexity.blog/2022/11/25/cache-invalidation-really-is-one-of-the-hardest-things-in-computer-science/)
- [How to Build Cache Invalidation Strategies](https://oneuptime.com/blog/post/2026-01-30-cache-invalidation-strategies/view)

Electron Database Concurrency:
- [Electron Database - Storage adapters for SQLite](https://rxdb.info/electron-database.html)
- [Local Data storage for Electron](https://dev.to/ctxhou/local-data-storage-for-electron-2h4p)

Race Conditions:
- [File watcher race condition - Deno Issue #13035](https://github.com/denoland/deno/issues/13035)
- [Race Conditions and Secure File Operations - Apple Developer](https://developer.apple.com/library/archive/documentation/Security/Conceptual/SecureCodingGuide/Articles/RaceConditions.html)

Hierarchical State Management:
- [Frontend Components: A Guide to Scalable React UIs 2026](https://createbytes.com/insights/frontend-components-react-scalable-ui)
- [Beyond MVVM: Hierarchical State Management with Molecule and Compose](https://medium.com/@cgaisl/beyond-mvvm-hierarchical-state-management-with-molecule-and-compose-660648eeb88e)

Cost Awareness and Consent:
- [Designing For Agentic AI: Practical UX Patterns - Smashing Magazine 2026](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)
- [Dark Pattern Avoidance 2026 Checklist](https://secureprivacy.ai/blog/dark-pattern-avoidance-2026-checklist)
- [Privacy and AI Governance in 2026: Why Consent Isn't Enough](https://blog.mynymbox.io/privacy-and-ai-governance-in-2026-why-consent-wont-save-you-from-surveillance/)

Debounce/Throttle Best Practices:
- [Debouncing and Throttling Explained Through Examples - CSS-Tricks](https://css-tricks.com/debouncing-throttling-explained-examples/)
- [Debounce vs Throttle: Definitive Visual Guide](https://kettanaito.com/blog/debounce-vs-throttle)
- [Understanding the Differences Between Rate Limiting, Debouncing, and Throttling](https://www.inngest.com/blog/rate-limit-debouncing-throttling-explained)

Data Visualization Trends:
- [Data Visualization Trends In 2026 - Luzmo](https://www.luzmo.com/blog/data-visualization-trends)
- [200 years of data visualization: Where 2026 trends are taking us - Forsta](https://www.forsta.com/blog/200-years-data-visualization-2026/)

SVG Navigation:
- [SVG Accessibility/Navigation - W3C Wiki](https://www.w3.org/wiki/SVG_Accessibility/Navigation)
- [Linking — SVG 2 - W3C](https://www.w3.org/TR/SVG/linking.html)
- [Accessible SVGs - The A11Y Collective](https://www.a11y-collective.com/blog/svg-accessibility/)

PlantUML:
- [PlantUML FAQ](https://plantuml.com/faq)
- [Performance issue - PlantUML Q&A](https://forum.plantuml.net/5882/performance-issue)

---
*Pitfalls research for: C4 diagram persistence, real-time change detection, and contextual navigation*
*Researched: 2026-02-24*
