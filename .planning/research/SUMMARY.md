# Project Research Summary

**Project:** Reef v1.1 Persistent Diagrams with Change Visualization
**Domain:** Multi-repository GitHub desktop client with C4 architecture diagrams
**Researched:** 2026-02-24
**Confidence:** HIGH

## Executive Summary

Reef v1.1 extends the existing C4 diagram infrastructure with persistent storage, real-time change visualization, and contextual navigation from diagrams to code diffs. This milestone builds on solid v1.0 foundations (SQLite caching, chokidar file watching, Zustand state management) requiring targeted extensions rather than architectural redesigns. The research reveals that only one new dependency is needed (microdiff for structural comparison) while existing libraries (better-sqlite3, chokidar) require configuration changes from TTL-based caching to persistent storage with WAL mode.

The recommended approach involves five sequential phases: persistent storage foundation, auto-generation on repo add, enhanced change detection, visual change indicators, and diagram-to-diff navigation. Critical risks include database migration complexity, file watcher race conditions causing duplicate API calls, and cache invalidation that never fires. These are mitigated through versioned schema migrations, debounced file watching with hash-based comparison, and multiple invalidation triggers including git operations and manual refresh.

The path forward is clear: minimal dependencies, incremental enhancement of existing services, and focus on user cost awareness through explicit prompts before expensive operations. Total implementation effort estimated at 38-51 hours across 5 phases.

## Key Findings

### Recommended Stack

v1.1 requires minimal stack changes: one new dependency (microdiff) and configuration updates to existing libraries. The current stack (better-sqlite3 ^11.10.0, chokidar ^4.0.3, Zustand ^4.4.7, PlantUML) already supports all required functionality. The lightweight approach avoids bloat from heavy visualization libraries (rejected: Recharts, D3.js, cytoscape.js) and oversized diff tools (rejected: jsondiffpatch at 16KB vs microdiff at <1KB).

**Core technologies:**
- **microdiff ^1.5.0** (NEW): Structural comparison for change detection — 2x faster than alternatives, <1KB, TypeScript native, zero dependencies
- **better-sqlite3 ^11.10.0**: Persistent storage with WAL mode — switch from `:memory:` to userData path, remove TTL expiration logic, add diagram_metadata table
- **chokidar ^4.0.3**: File watching with change tracking — track file paths instead of binary staleness, debounce 500ms-2s to prevent API waste
- **PlantUML AddElementTag()**: Change visualization — use native styling tags (no new dependencies) for green/yellow/red change indicators

**What NOT to add:**
- SVG diff libraries (wrong problem: diff structure not pixels)
- React visualization libraries (PlantUML already renders)
- Heavy JSON diff tools (microdiff sufficient)
- Graph visualization libraries (duplicate layout engine)

### Expected Features

Research identified clear feature hierarchy with existing infrastructure providing strong foundations. The v1.0 codebase already has SQLite persistence, file watching, navigation stores, diff viewer, and stale badges — v1.1 extends rather than replaces.

**Must have (table stakes):**
- Diagram persistence across sessions — users expect diagrams without regeneration
- Auto-generate on repo add — users expect diagrams ready without manual trigger
- Stale diagram indicators — users need to know when outdated
- Click to regenerate — one-click refresh when stale
- Loading indicators during generation — feedback for multi-minute operations

**Should have (competitive advantage):**
- Hierarchical change indicators — Context shows badge if Container changed, Container shows badge if Component changed (bubble-up pattern)
- Click element → jump to diff viewer — navigate from diagram to code changes, mapping element IDs to file paths
- Changed element visual highlighting — green/yellow/red color coding in PlantUML via AddElementTag()
- Persistent navigation state — return to same diagram level/element across sessions
- Cross-level change summary — "3 containers changed, 12 components changed" statistics

**Defer (v2+):**
- Diagram generation history/versioning — view previous diagram versions or rollback
- Commit-linked diagram snapshots — "show diagram at commit abc123"
- Architecture drift detection — compare intended vs actual architecture
- Change impact analysis — "if I change Component X, what's affected?"

**Anti-features (reject):**
- Real-time live diagram updates — destroys performance, explodes API costs, causes flicker
- Automatic background regeneration — silent API costs, no user control
- Inline diff overlay on diagram — mixes architecture/code concerns, unreadable

### Architecture Approach

The v1.1 architecture extends v1.0 through targeted service additions and schema evolution rather than replacement. Main process handles all database operations via IPC to prevent locks. File watcher enriches events with element context. SVG post-processing adds change indicators without modifying PlantUML source.

**Major components:**

1. **C4CacheService (extended)** — Migrate from `:memory:` to persistent userData storage, remove TTL logic, add diagram_metadata table tracking state (never_generated → generating → fresh/stale/error)

2. **DiagramAutoGenerator (NEW)** — Check state on repo add, prompt user with cost estimate, queue Context generation first, emit progress events, handle error recovery

3. **ChangeAggregationService (NEW)** — Buffer file change events for 500ms, merge affectedElements arrays, emit aggregated IPC events, track changes in diagram_changes table with JSON file arrays

4. **FileWatcherService (enriched)** — Map changed files to element IDs, track changeType (add/modify/delete), bubble up hierarchy (Code → Component → Container → Context)

5. **PlantUMLRenderer (SVG post-processing)** — Parse generated SVG, find changed element IDs, add amber borders/backgrounds/animations, create change badges with tooltips

6. **NavigationStore (change tracking)** — Add changedElements Map, markElementChanged/clearChanges actions, diffContext for cross-tab navigation with back button

7. **Cross-tab navigation** — DiagramViewer click → query diagram_changes → setActiveTab('commit-workflow') → setDiffContext → CommitWorkflowTab highlights files → DiffContextBanner shows back button

**Integration points:**
- Database: All writes through main process IPC (prevent locks)
- File watching: Debounced events with hash comparison (prevent race conditions)
- SVG rendering: Post-process after PlantUML generation (preserve source)
- Navigation: Store-based state with IPC coordination (sync renderer/main)

### Critical Pitfalls

1. **Migration without backward compatibility** — Existing v1.0 caches lost on upgrade forcing expensive regeneration. Use versioned migrations with schema_migrations table, test upgrade path, fallback to read-only old cache on failure. Address in Phase 1.

2. **File watcher race conditions** — Multiple rapid changes trigger overlapping regeneration jobs wasting API calls. Empty file reads because write incomplete. Implement 500ms-2s debounce, hash-based content comparison, queue deduplication, chokidar awaitWriteFinish option. Address in Phase 2.

3. **Database lock deadlocks** — Concurrent writes cause "database is locked" errors. ALL database operations must run in main process via IPC, enable WAL mode with `PRAGMA journal_mode=WAL`, set busy timeout 5000ms, single-threaded write queue. Address in Phase 1.

4. **Cache invalidation never fires** — Diagrams stay permanently stale after refactors. Multiple triggers needed: file hash changes, git HEAD changes (branch switch), dependency file changes, explicit refresh. Log invalidation decisions. Provide manual force regenerate. Address in Phase 2.

5. **Change bubble-up loses context** — "3 changes" indicator doesn't show which components affected. Store hierarchical change metadata not boolean: `{ elementId, hasChanges, changedChildren: [], changedFiles: [] }`. Preserve change path through navigation. Address in Phase 3.

6. **Auto-generate without cost awareness** — User adds 10 repos, app burns $5-10 API credits without warning. Show cost estimation modal with "Generate Now/Skip/Settings", remember preference, start with Context level only (cheapest), show running total. EU regulations require informed consent. Address in Phase 2.

7. **SVG click detection breaks with PlantUML updates** — Element ID extraction assumes specific structure. Traverse upward until ID found (don't hardcode depth), implement fallback strategies, test multiple PlantUML versions, add ARIA labels for accessibility. Address in Phase 5.

8. **Diff navigation without file context** — Opens wrong file or no line number. Store element-to-file mapping in diagram metadata with line ranges, change detection enriches with changedLines, navigation scrolls to first changed line. Address in Phase 5.

## Implications for Roadmap

Based on research, the milestone naturally splits into 5 sequential phases with clear dependencies. Persistent storage foundation blocks everything else. Change detection depends on storage. Visualization requires detection. Navigation builds on visualization.

### Phase 1: Persistent Storage Foundation
**Rationale:** All other features assume diagrams persist across sessions. Must remove TTL-based expiration and establish migration patterns before building on top.

**Delivers:**
- Diagrams survive app restarts without regeneration
- Database schema with diagram_metadata table
- State machine: never_generated → generating → fresh/stale/error
- Migration from v1.0 memory cache to v1.1 persistent storage

**Addresses features:**
- Table stakes: Diagram persistence across sessions
- Enables: Auto-generation, change tracking, navigation state

**Avoids pitfalls:**
- Migration without backward compatibility (versioned migrations)
- Database lock deadlocks (main process only, WAL mode)

**Research flags:** Standard SQLite patterns, well-documented. Skip phase-specific research.

**Estimated effort:** 4-6 hours

### Phase 2: Auto-Generation on Repo Add
**Rationale:** Users expect diagrams ready without manual triggering. Depends on Phase 1 persistent storage to save generated diagrams.

**Delivers:**
- DiagramAutoGenerator service
- Electron native dialog for cost estimation/consent
- Background generation queue with progress events
- IPC integration with repository add flow

**Uses stack:**
- Electron dialog API for user prompts
- Existing C4AnalyzerService for generation
- IPC for main/renderer coordination

**Addresses features:**
- Table stakes: Auto-generate on repo add, Loading indicators
- Competitive: Background generation queue with progress

**Avoids pitfalls:**
- Auto-generate without cost awareness (explicit prompt)
- File watcher race conditions (queue with deduplication)

**Research flags:** Standard Electron dialog patterns. Skip research.

**Estimated effort:** 7-9 hours

### Phase 3: Real-Time Change Detection Enhancement
**Rationale:** Foundation for visual indicators and navigation. Requires persistent storage (Phase 1) to track changes across sessions.

**Delivers:**
- Enriched FileWatcherService with element mapping
- ChangeAggregationService with 500ms debouncing
- diagram_changes table with propagation logic
- NavigationStore change tracking (changedElements Map)

**Uses stack:**
- microdiff for structural comparison
- chokidar with debouncing configuration
- better-sqlite3 diagram_changes table

**Implements architecture:**
- File-to-element mapping (Code → Component → Container → Context)
- Change event buffering and aggregation
- Hierarchical change propagation

**Addresses features:**
- Competitive: Hierarchical change indicators, Cross-level change summary

**Avoids pitfalls:**
- File watcher race conditions (debouncing + hash comparison)
- Cache invalidation never fires (multiple triggers + logging)
- Change bubble-up loses context (hierarchical metadata)

**Research flags:** NEEDS RESEARCH for file-to-element mapping accuracy in Electron+TypeScript codebases. Complex heuristic logic.

**Estimated effort:** 9-12 hours

### Phase 4: Change Visualization
**Rationale:** Make changes visible in diagrams. Depends on Phase 3 change detection to know what to highlight.

**Delivers:**
- SVG post-processing in PlantUMLRenderer
- PlantUML AddElementTag() styling (amber/orange theme)
- ChangeVisualizationLegend component
- Pulsing animations for changed elements
- Change badge tooltips with file lists

**Uses stack:**
- PlantUML native styling (no new dependencies)
- DOMParser for SVG manipulation
- Material Design color palette (WCAG AA compliant)

**Addresses features:**
- Competitive: Changed element visual highlighting

**Avoids pitfalls:**
- SVG click detection breaks (robust ID extraction with fallbacks)

**Research flags:** Standard DOM manipulation patterns. Skip research.

**Estimated effort:** 8-11 hours

### Phase 5: Diagram-to-Diff Navigation
**Rationale:** Connect visual changes to code context. Depends on Phase 3 change tracking and Phase 4 visualization for complete UX.

**Delivers:**
- Enhanced click handling (Meta+Click for changes)
- Element ID → file path mapping in diagram metadata
- Cross-tab navigation (visual-map → commit-workflow)
- DiffContextBanner component with back button
- Auto-highlight files in EnhancedChangesPanel

**Uses stack:**
- Existing DiffViewer component
- NavigationStore diffContext state
- GitService for file diffs

**Implements architecture:**
- Cross-tab navigation pattern
- Element-to-file mapping storage
- Contextual diff viewer integration

**Addresses features:**
- Competitive: Click element → jump to diff viewer

**Avoids pitfalls:**
- Diff navigation without file context (store line ranges)
- SVG click detection breaks (fallback strategies)

**Research flags:** NEEDS RESEARCH for optimal element-to-file mapping schema and line number tracking in static analysis output.

**Estimated effort:** 10-13 hours

### Phase Ordering Rationale

- **Sequential dependencies:** Each phase builds on previous. No parallelization possible without breaking dependencies.
- **Risk mitigation order:** Critical pitfalls (migration, locks, races) addressed in early phases before building complex features.
- **User value progression:** Phase 1-2 deliver immediate value (persistent diagrams + auto-gen). Phase 3-5 add polish.
- **API cost awareness:** Phase 2 implements cost prompts before Phase 3-5 add features that might trigger regeneration.
- **Testing pyramid:** Foundation phases (1-2) are simpler to test. Complex phases (3-5) build on stable base.

### Research Flags

**Phases needing deeper research:**
- **Phase 3 (Change Detection):** File-to-element mapping heuristics for TypeScript/React/Electron codebases. How to reliably map `src/renderer/components/DiagramViewer.tsx` to element ID `diagram_viewer`? Needs analysis of C4AnalyzerService static analysis output format.
- **Phase 5 (Navigation):** Element-to-file metadata schema design. What structure best supports multi-file components, line range tracking, and change region highlighting? Should metadata be JSON column or relational tables?

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** SQLite migrations are well-documented. better-sqlite3 migration patterns established.
- **Phase 2:** Electron dialog API is mature. Background queue patterns are standard.
- **Phase 4:** DOM manipulation and SVG styling have abundant resources. PlantUML AddElementTag() documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only one new dependency (microdiff). Existing stack proven in v1.0. Configuration changes well-documented. |
| Features | HIGH | Clear hierarchy from competitor analysis (VS Code, IntelliJ, Hava.io). Feature dependencies mapped. Anti-features identified. |
| Architecture | HIGH | Builds incrementally on v1.0 foundations. Integration points identified. No major redesigns required. Component responsibilities clear. |
| Pitfalls | MEDIUM | Common patterns well-researched (migrations, race conditions, locks). Some domain-specific risks need validation (element mapping accuracy). |

**Overall confidence:** HIGH

### Gaps to Address

Research was comprehensive but some areas need validation during implementation:

- **Element ID standardization:** Should PlantUML element IDs follow strict naming convention? Current approach infers from file paths. Needs testing with real codebases to verify mapping accuracy.

- **WAL checkpoint frequency:** SQLite docs recommend periodic checkpoints but don't specify frequency. Need to monitor WAL file growth in long-running Electron apps and tune checkpoint strategy (startup? weekly? after N writes?).

- **Performance at scale:** SVG post-processing tested conceptually but needs real-world validation. How does highlighting perform with >100 changed elements in enterprise monorepos? May need progressive disclosure or virtualization.

- **Change indicator persistence semantics:** Unclear whether change indicators should clear after user views diagram (ephemeral) or persist until next change (permanent). Needs UX research or user feedback to decide.

- **Cross-level change propagation depth:** Should code-level changes always bubble up to Context level, or only when viewing higher levels? Impacts performance and UX. Needs experimentation.

**Handling during execution:**
- Element ID mapping: Add logging in Phase 3, collect real examples, iterate on heuristics
- WAL checkpoints: Start conservative (checkpoint on startup), monitor metrics, tune based on data
- Performance: Implement in Phase 4, benchmark with large test repos, add progressive features if needed
- Change semantics: Start with "clear on view" (ephemeral), add settings toggle, gather feedback
- Propagation depth: Implement full propagation in Phase 3, add settings to control depth if performance issues

## Sources

### Primary (HIGH confidence)
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3) — 11.10.0, 2.3M weekly downloads, WAL mode documentation
- [microdiff npm](https://www.npmjs.com/package/microdiff) — 1.5.0, <1KB, 105 dependents, TypeScript native
- [C4-PlantUML GitHub](https://github.com/plantuml-stdlib/C4-PlantUML) — Official library, AddElementTag() documentation
- [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog) — Official docs for user prompts
- [chokidar GitHub](https://github.com/paulmillr/chokidar) — 4.0.3, official file watching docs
- [SQLite WAL mode](https://www.sqlite.org/wal.html) — Official SQLite Write-Ahead Logging documentation
- [PlantUML SVG styling](https://plantuml.com/style-evolution) — Official PlantUML styling documentation

### Secondary (MEDIUM confidence)
- [Hava.io automated visualization](https://www.hava.io/blog/automated-real-time-visualization-of-cloud-architecture) — Infrastructure diagram patterns
- [VS Code Source Control UI](https://code.visualstudio.com/docs/sourcecontrol/overview) — Change indicator patterns
- [Antithesis Readyset caching bug](https://antithesis.com/blog/2026/readyset/) — Cache invalidation lessons learned
- [SQLite performance tuning](https://phiresky.github.io/blog/2020/sqlite-performance-tuning/) — PRAGMA benchmarks and WAL checkpoints
- [better-sqlite3 Electron integration](https://dev.to/arindam1997007/a-step-by-step-guide-to-integrating-better-sqlite3-with-electron-js-app-using-create-react-app-3k16) — Persistent storage patterns
- [chokidar performance issues](https://github.com/paulmillr/chokidar/issues/228) — File watching at scale
- [Dark pattern avoidance checklist 2026](https://secureprivacy.ai/blog/dark-pattern-avoidance-2026-checklist) — Cost awareness requirements

### Tertiary (LOW confidence)
- [Data visualization trends 2026](https://medium.com/@anuj.rawat_17321/data-visualization-trends-2026-cxo-guide-to-stay-ahead-15d380261809) — General trends, not domain-specific
- [Architecture drift detection patterns](https://archtocode.com/) — Future feature inspiration (v2+)
- [Code change visualization](https://softagram.com/docs/visualizing-code-changes) — Alternative approaches reviewed

---
*Research completed: 2026-02-24*
*Ready for roadmap: yes*
