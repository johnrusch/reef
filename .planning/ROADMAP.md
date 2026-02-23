# Roadmap: Reef C4 Architecture Diagrams

## Overview

Transform Reef's existing diagram generation into a C4 architecture visualization system. Starting with foundation work to establish validated C4 generation across all four levels (Context, Container, Component, Code), then adding intelligent auto-regeneration to keep diagrams current as code changes. Next, implement hierarchical drill-down navigation enabling users to explore from system context down to implementation details. Finally, polish the experience with advanced navigation features and performance optimizations.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: C4 Foundation** - Establish validated C4 generation across all four levels with hybrid static+AI approach
- [x] **Phase 2: Automatic Regeneration** - Implement intelligent cache invalidation and auto-regeneration on file changes (completed 2026-02-23)
- [ ] **Phase 3: Hierarchy Navigation** - Build drill-down navigation system with element clickability and breadcrumbs
- [ ] **Phase 4: Polish & Advanced Features** - Add quick navigation, keyboard shortcuts, and performance optimizations

## Phase Details

### Phase 1: C4 Foundation
**Goal**: Users can generate accurate C4 diagrams at all four levels (Context, Container, Component, Code) using hybrid static analysis and AI enrichment
**Depends on**: Nothing (first phase)
**Requirements**: C4GEN-01, C4GEN-02, C4GEN-03, C4GEN-04, C4GEN-05, C4GEN-06, C4GEN-07, C4GEN-08, INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, UPDATE-05, NAV-06
**Success Criteria** (what must be TRUE):
  1. User can generate C4 Context diagram showing system boundaries and external dependencies
  2. User can generate C4 Container diagram showing high-level tech stack components
  3. User can generate C4 Component diagram showing internal component structure
  4. User can generate C4 Code diagram showing class-level implementation details
  5. System shows coverage percentage indicating how much of codebase was analyzed within token limits
  6. Generated diagrams use valid C4-PlantUML syntax and render without errors
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Upgrade dependencies and fix PlantUML security (ts-morph, SDK v0.78.0, C4 includes whitelist)
- [x] 01-02-PLAN.md — Create C4 type system and ts-morph static analyzer (deterministic code extraction)
- [x] 01-03-PLAN.md — Implement C4 generation engine (all 4 levels with hybrid static+AI approach)
- [x] 01-04-PLAN.md — Add elementId UI controls for Component/Code drill-down (gap closure)
- [x] 01-05-PLAN.md — Fix better-sqlite3 native module ABI mismatch (gap closure)

### Phase 2: Automatic Regeneration
**Goal**: Diagrams automatically stay current with codebase changes through intelligent cache invalidation
**Depends on**: Phase 1
**Requirements**: UPDATE-01, UPDATE-02, UPDATE-03, UPDATE-04, UPDATE-06, UPDATE-07
**Success Criteria** (what must be TRUE):
  1. User sees visual indicator when diagram is potentially stale due to file changes
  2. User can trigger automatic regeneration with single click when files change
  3. User can manually force regeneration at any time via dedicated button
  4. System reuses cached diagrams when codebase hasn't changed to avoid unnecessary API costs
  5. Cached diagrams invalidate intelligently based on changed files and C4 level (Context cached longer than Code)
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Create FileWatcherService with chokidar and extend C4CacheService with timestamp persistence
- [x] 02-02-PLAN.md — Implement StalenessBadge UI, IPC integration, and Force Regenerate controls

### Phase 3: Hierarchy Navigation
**Goal**: Users can navigate C4 hierarchy through clickable elements drilling from Context down to Code level
**Depends on**: Phase 2
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-08, INFRA-06, INFRA-07
**Success Criteria** (what must be TRUE):
  1. User can click diagram elements to drill down from Context to Container level
  2. User can click diagram elements to drill down from Container to Component level
  3. User can click diagram elements to drill down from Component to Code level
  4. User sees breadcrumb trail showing current position in C4 hierarchy (e.g., "Context > API Container > Auth Component")
  5. User can click breadcrumbs to navigate back up hierarchy levels
  6. Diagram elements show visual indicators (hover effects, cursor changes) when clickable for drill-down
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Create navigation Zustand store and accessible breadcrumb component
- [x] 03-02-PLAN.md — Implement SVG click detection and hover indicators for drill-down

### Phase 4: Polish & Advanced Features
**Goal**: Users experience polished navigation with keyboard shortcuts, quick search, and optimized performance
**Depends on**: Phase 3
**Requirements**: NAV-07
**Success Criteria** (what must be TRUE):
  1. User can use keyboard shortcuts for common actions (F11 fullscreen, Ctrl+R regenerate, arrows navigate)
  2. User can open quick navigation dialog with keyboard shortcut to jump directly to any diagram by name
  3. User can search for specific containers or components across diagrams using fuzzy text search
  4. Large diagrams (>2MB SVG) load progressively without blocking UI
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. C4 Foundation | 5/5 | Complete   | 2026-02-23 |
| 2. Automatic Regeneration | 2/2 | Complete   | 2026-02-23 |
| 3. Hierarchy Navigation | 2/2 | Complete   | 2026-02-23 |
| 4. Polish & Advanced Features | 0/2 | Not started | - |
