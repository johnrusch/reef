# Roadmap: Reef C4 Architecture Diagrams

## Milestones

- ✅ **v1.0 C4 Diagram Feature Release** — Phases 1-4 (shipped 2026-02-24)
- ✅ **v1.1 Persistent Diagrams with Change Visualization** — Phases 5-10 (shipped 2026-02-28)
- 🚧 **v1.2 Diagrams That Deliver** — Phases 11-14 (in progress)

## Phases

<details>
<summary>✅ v1.0 C4 Diagram Feature Release (Phases 1-4) — SHIPPED 2026-02-24</summary>

- [x] Phase 1: C4 Foundation (5/5 plans) — completed 2026-02-23
- [x] Phase 2: Automatic Regeneration (2/2 plans) — completed 2026-02-23
- [x] Phase 3: Hierarchy Navigation (2/2 plans) — completed 2026-02-23
- [x] Phase 4: Polish & Advanced Features (2/2 plans) — completed 2026-02-24

See: `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.1 Persistent Diagrams with Change Visualization (Phases 5-10) — SHIPPED 2026-02-28</summary>

- [x] Phase 5: Persistent Storage Foundation (8/8 plans) — completed 2026-02-25
- [x] Phase 6: Auto-Generation on Repo Add (3/3 plans) — completed 2026-02-25
- [x] Phase 7: Enhanced Change Detection (3/3 plans) — completed 2026-02-27
- [x] Phase 8: Change Visualization (2/2 plans) — completed 2026-02-28
- [x] Phase 9: Diagram-to-Diff Navigation (2/2 plans) — completed 2026-02-28
- [x] Phase 10: State Transition Wiring & Cleanup (1/1 plan) — completed 2026-02-28

See: `.planning/milestones/v1.1-ROADMAP.md` for full details.

</details>

### 🚧 v1.2 Diagrams That Deliver (In Progress)

**Milestone Goal:** Fix diagram quality across all C4 levels so drill-down works end-to-end with rich, accurate content, and cached diagrams load fast.

- [x] **Phase 11: Static Analysis Depth** - Fix multi-pass extraction and enrich with functions, decorators, JSDoc, directory structure, and non-TypeScript fallback (completed 2026-03-02)
- [x] **Phase 12: AI Enrichment Pipeline** - Wire AI output into PlantUML generation with structured JSON schemas and framework-aware prompts (completed 2026-03-02)
- [ ] **Phase 13: Drill-Down Navigation Fix** - Establish a canonical element ID registry and fix SVG click detection end-to-end
- [ ] **Phase 14: Rendering Performance** - Store pre-rendered SVG in SQLite and add in-process LRU cache for sub-500ms cached diagram display

## Phase Details

### Phase 11: Static Analysis Depth
**Goal**: Accurate, rich AnalysisResult feeds every downstream phase with correct structural data for any repo type
**Depends on**: Phase 10 (v1.1 complete)
**Requirements**: ANLZ-01, ANLZ-02, ANLZ-03, ANLZ-04
**Success Criteria** (what must be TRUE):
  1. Container and Component diagrams for Reef itself show more nodes and relationships after regeneration (no empty levels)
  2. User can generate diagrams for a JavaScript or Python repo without an error — a partial diagram is produced instead of a crash
  3. Component groupings reflect directory structure and architectural roles (e.g., "services", "controllers") rather than only class-name suffix matches
  4. Code-level diagram includes functions, decorated classes, and JSDoc-annotated symbols alongside plain classes
**Plans**: 2 plans
- [ ] 11-01-PLAN.md — Fix forgetDescendants bug + enrich extraction with functions, decorators, JSDoc (ANLZ-01, ANLZ-02)
- [ ] 11-02-PLAN.md — Directory-based component grouping + non-TypeScript repo fallback + PlantUML consumption (ANLZ-03, ANLZ-04)

### Phase 12: AI Enrichment Pipeline
**Goal**: AI enrichment output is consumed by the PlantUML generator, producing named technology components and relationships across all four C4 levels
**Depends on**: Phase 11
**Requirements**: ENRCH-01, ENRCH-02, ENRCH-03, ENRCH-04
**Success Criteria** (what must be TRUE):
  1. Container diagram shows real named components (e.g., "Electron Main Process", "SQLite Storage") with labeled relationship protocols, not generic placeholders
  2. Component diagram shows logical architectural roles (e.g., "Generation Queue", "IPC Handler") rather than raw directory names
  3. Regenerating a diagram for a React app produces different, framework-specific component names than regenerating for an Express API
  4. AI enrichment cost is incurred and AI-provided elements appear in the rendered SVG (no silent discard)
**Plans**: 2 plans
- [x] 12-01-PLAN.md — Structured output schemas, AIEnricherService rewrite with messages.parse + zodOutputFormat, framework-aware prompts (ENRCH-02, ENRCH-04)
- [x] 12-02-PLAN.md — Wire enrichment into PlantUML generator, fix _enrichedData discard bug, update integration tests (ENRCH-01, ENRCH-03)

### Phase 13: Drill-Down Navigation Fix
**Goal**: User can click any element in Context, Container, or Component diagrams and reliably drill into the next level for any repository
**Depends on**: Phase 12
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. Clicking a container element in a Container diagram opens a non-empty Component diagram for that container
  2. Clicking a component element in a Component diagram opens a non-empty Code diagram for that component
  3. Amber change highlighting identifies the same elements before and after a diagram regeneration (stable IDs)
  4. SVG element clicks fire drill-down navigation regardless of which PlantUML JAR version is installed
**Plans**: TBD

### Phase 14: Rendering Performance
**Goal**: Cached diagrams display in under 500ms, eliminating the 5-8 second Java re-render on every tab switch
**Depends on**: Phase 13
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. Opening a previously generated diagram displays the SVG in under 500ms (no visible loading delay)
  2. Switching between diagram levels within the same session is instant (no Java subprocess invoked)
  3. First-time generation still works correctly — pre-rendered SVG is stored after the Java render completes and served on all subsequent loads
**Plans**: TBD

## Progress

**Execution Order:** 11 → 12 → 13 → 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. C4 Foundation | v1.0 | 5/5 | Complete | 2026-02-23 |
| 2. Automatic Regeneration | v1.0 | 2/2 | Complete | 2026-02-23 |
| 3. Hierarchy Navigation | v1.0 | 2/2 | Complete | 2026-02-23 |
| 4. Polish & Advanced Features | v1.0 | 2/2 | Complete | 2026-02-24 |
| 5. Persistent Storage Foundation | v1.1 | 8/8 | Complete | 2026-02-25 |
| 6. Auto-Generation on Repo Add | v1.1 | 3/3 | Complete | 2026-02-25 |
| 7. Enhanced Change Detection | v1.1 | 3/3 | Complete | 2026-02-27 |
| 8. Change Visualization | v1.1 | 2/2 | Complete | 2026-02-28 |
| 9. Diagram-to-Diff Navigation | v1.1 | 2/2 | Complete | 2026-02-28 |
| 10. State Transition Wiring & Cleanup | v1.1 | 1/1 | Complete | 2026-02-28 |
| 11. Static Analysis Depth | 2/2 | Complete    | 2026-03-02 | - |
| 12. AI Enrichment Pipeline | v1.2 | Complete    | 2026-03-02 | 2026-03-02 |
| 13. Drill-Down Navigation Fix | v1.2 | 0/TBD | Not started | - |
| 14. Rendering Performance | v1.2 | 0/TBD | Not started | - |

---
*Last updated: 2026-03-02 — Phase 12 complete (2/2 plans), ready for Phase 13*
