# Milestones

## v1.4 Repo-Stored Diagrams (Shipped: 2026-03-28)

**Delivered:** Store C4 diagram artifacts (`.puml`, `.svg`, `.meta.json`) in a `.reef/` folder within each repository — diagrams are shared via git, version-controlled, and render instantly on import.

**Phases completed:** 4 phases (17-20), 8 plans
**Timeline:** 2 days (2026-03-27 → 2026-03-28)
**Commits:** 47
**Files modified:** 78 (+8,824 insertions, -1,299 deletions)
**Requirements:** 9/11 satisfied (STOR-03 partial, REGEN-01 partial)

**Key accomplishments:**

1. ReefStorageService with atomic temp-then-rename writes, Zod schema validation, lazy `.reef/` directory creation, and auto-generated `.gitattributes` marking SVGs as binary
2. Chokidar `.reef/` exclusion preventing false stale-diagram events during file writes
3. Automatic `.reef/` write-through on every diagram generation — PlantUML source, rendered SVG, and SHA-256 source hash written to `.meta.json`
4. Instant `.reef/` import on repo add — stored SVGs loaded into LRU cache + SQLite, bypassing PlantUML rendering entirely
5. Hash-based staleness detection with 2.5s debounced file change handling, comparing recomputed source hash against stored `.meta.json`
6. Stale-aware regeneration UI — confirmation dialog shows stale level count, only stale levels regenerated, toast feedback on completion

**Known Gaps (from audit):**

- STOR-03 partial: Runtime chokidar exclusion works, but `hasNewerFiles` startup walk omits `.reef` from `IGNORED_DIRS`
- REGEN-01 partial: `.reef/` write-back is indirect through async PlantUML render; success toast fires before `.reef/` is actually updated
- Phase 20 missing VERIFICATION.md (human verification deferred due to pre-existing drill-down generation issue)
- Pre-existing: Drill-down navigation triggers generation instead of loading cached/stored diagrams

---

## v1.3 Diagram Explorer (Shipped: 2026-03-26)

**Delivered:** Overhauled the diagram UI from a configure-and-generate interface to a clean browse-and-navigate experience with sidebar tree hierarchy navigation.

**Phases completed:** 2 phases (15-16), 4 plans, 6 tasks
**Timeline:** 3 days (2026-03-04 → 2026-03-06)
**Commits:** 29
**Files modified:** 72 (+4,760 insertions, -1,018 deletions)
**Requirements:** 9/9 checked (GEN-01 partial — component/code levels require elementId from drill-down)

**Key accomplishments:**

1. Removed all legacy UI controls — settings landing page, DiagramInfo sidebar, non-C4 toolbar buttons, and Beta badge (610 lines deleted across 4 source files)
2. Built C4HierarchyTree sidebar with collapsible 4-level navigation and auto-highlight on drill-down
3. Replaced configuration-heavy toolbar with minimal 2-button controls (Regenerate + Show/Hide Changes)
4. Added single-button "Generate All Diagrams" flow for first-visit experience
5. Added breadcrumb navigation showing current C4 hierarchy position with clickable ancestors
6. Full TDD coverage with 12 UICL absence tests and explorer component tests

**Known Gaps (from audit):**

- GEN-01 partial: component/code generation requires elementId from drill-down (architectural constraint)
- DiagramViewer.uicl.test.tsx regression: Zustand mock not selector-aware
- VisualMapTab.gen01.test.tsx timeout: asserts 4 generate calls, implementation does 2
- DiagramInfo.tsx dead code file not deleted
- SUMMARY frontmatter missing requirements_completed fields

---

## v1.2 Diagrams That Deliver (Shipped: 2026-03-03)

**Delivered:** Fixed diagram quality across all C4 levels with rich static analysis, AI enrichment pipeline, end-to-end drill-down navigation, and sub-500ms cached rendering.

**Phases completed:** 4 phases (11-14), 9 plans
**Timeline:** 2 days (2026-03-02 → 2026-03-03)
**Commits:** 50
**Lines of code:** 35,637 TypeScript (+2,665 insertions, -254 deletions)
**Requirements:** 15/15 satisfied (all verified in VERIFICATION.md)
**Git range:** feat(11-01) → docs(v1.2)

**Key accomplishments:**

1. Fixed static analysis depth — forgetDescendants bug fixed, enriched extraction with functions, decorators, JSDoc, directory-based component grouping, and non-TypeScript repo fallback
2. Built AI enrichment pipeline — structured JSON output with Zod schemas, framework-aware prompts, and AI-provided component names consumed by PlantUML generator
3. Fixed drill-down navigation end-to-end — ElementIdRegistry with shared sanitizeId, dynamic container-to-path resolution, SVG click transparency fix, and elementId passthrough closure
4. Implemented rendering performance — SVG storage in SQLite, in-process LRU cache for sub-500ms cached diagram display, and Nailgun warm JVM feature flag
5. All 15 requirements satisfied across 4 phases with full cross-phase integration wiring

**Tech Debt (from audit):**

- `modelUsed: 'haiku'` hardcoded in c4AnalyzerService.ts (records wrong model in metadata)
- Type cast workaround for Anthropic SDK TS limitations in aiEnricherService.ts
- Pre-existing better-sqlite3 native module mismatch blocks integration tests
- SUMMARY frontmatter bookkeeping gaps (12-01, 13-02 missing requirements_completed)
- Cosmetic: placeholder API key text visible in VisualMapTab.tsx

---

## v1.1 Persistent Diagrams with Change Visualization (Shipped: 2026-02-28)

**Delivered:** Persistent C4 diagrams with real-time change visualization and contextual navigation from architecture diagrams to code diffs.

**Phases completed:** 6 phases (5-10), 19 plans
**Timeline:** 4 days (2026-02-25 → 2026-02-28)
**Commits:** 73
**Lines of code:** 29,938 TypeScript (+14,364 insertions, -503 deletions)
**Requirements:** 21/21 satisfied, 2 deferred to v1.2 (CHNG-01, CHNG-04)
**Git range:** feat(05-00) → feat(10-01)

**Key accomplishments:**

1. Persistent diagram storage with SQLite WAL mode and automatic v1.0 TTL-to-persistent migration
2. Auto-generation prompt on repo add with background queue, progress tracking, and toast notifications
3. File-to-element change tracking with C4 hierarchy propagation (Code → Component → Container)
4. Visual change indicators with amber SVG highlighting and change count badges with file-list tooltips
5. Diagram-to-diff navigation with context banner, back-to-diagram flow, and file highlighting
6. Integration gap closure: state transitions in generation pipeline, singleton storage, dead listener cleanup

**Deferred to v1.2:**

- CHNG-01: File watching stale indicator runtime behavior
- CHNG-04: Debounce aggregation (depends on CHNG-01)

**Tech Debt (from audit):**

- 20 human verification tests pending across phases 5-9
- handleRegenerateFromBadge missing IPC state transitions (medium UX gap)
- Static cost estimate in GenerationPromptModal (getCostEstimate IPC exists but not called)
- Debug console.log statements in PlantUMLRenderer.tsx and CommitWorkflowTab.tsx

---

## v1.0 C4 Diagram Feature Release (Shipped: 2026-02-24)

**Delivered:** Complete C4 architecture visualization system for understanding codebases through AI-generated hierarchical diagrams.

**Phases completed:** 4 phases, 11 plans, 25 tasks
**Timeline:** 4 days (2026-02-21 → 2026-02-24)
**Lines of code:** 23,772 TypeScript

**Key accomplishments:**

1. Complete C4 diagram generation engine with hybrid static+AI analysis, prompt caching for 90% cost reduction, and level-aware caching (7d/3d/1d/6h TTL)
2. UI staleness indicator and regeneration controls - Yellow badge on file changes, click-to-regenerate, Force Regenerate button
3. SVG click detection with drill-down navigation - DOM traversal for element IDs, CSS hover indicators, breadcrumb trail
4. Command palette navigation (Cmd/Ctrl+K) - Fuzzy search using cmdk and Fuse.js for instant diagram jumping
5. Complete keyboard shortcuts - react-hotkeys-hook (F fullscreen, Escape exit, Cmd+R regenerate, arrows navigate)

**Tech Stack Added:**

- ts-morph (static analysis)
- @anthropic-ai/sdk v0.78.0 (prompt caching)
- better-sqlite3 (persistent caching)
- chokidar (file watching)
- react-hotkeys-hook (keyboard shortcuts)
- cmdk + fuse.js (command palette)

---
