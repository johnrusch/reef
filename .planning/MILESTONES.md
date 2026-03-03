# Milestones

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

