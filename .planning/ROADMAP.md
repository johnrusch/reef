# Roadmap: Reef C4 Architecture Diagrams

## Milestones

- ✅ **v1.0 C4 Diagram Feature Release** — Phases 1-4 (shipped 2026-02-24)
- ✅ **v1.1 Persistent Diagrams with Change Visualization** — Phases 5-10 (shipped 2026-02-28)
- ✅ **v1.2 Diagrams That Deliver** — Phases 11-14 (shipped 2026-03-03)
- ✅ **v1.3 Diagram Explorer** — Phases 15-16 (shipped 2026-03-06)
- ✅ **v1.4 Repo-Stored Diagrams** — Phases 17-20 (shipped 2026-03-28)
- 🚧 **v1.5 Bug Fixes & Navigation Overhaul** — Phases 21-23 (in progress)

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

<details>
<summary>✅ v1.2 Diagrams That Deliver (Phases 11-14) — SHIPPED 2026-03-03</summary>

- [x] Phase 11: Static Analysis Depth (2/2 plans) — completed 2026-03-02
- [x] Phase 12: AI Enrichment Pipeline (2/2 plans) — completed 2026-03-02
- [x] Phase 13: Drill-Down Navigation Fix (3/3 plans) — completed 2026-03-03
- [x] Phase 14: Rendering Performance (2/2 plans) — completed 2026-03-03

See: `.planning/milestones/v1.2-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.3 Diagram Explorer (Phases 15-16) — SHIPPED 2026-03-06</summary>

- [x] Phase 15: UI Cleanup (2/2 plans) — completed 2026-03-04
- [x] Phase 16: Explorer UI (2/2 plans) — completed 2026-03-06

See: `.planning/milestones/v1.3-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.4 Repo-Stored Diagrams (Phases 17-20) — SHIPPED 2026-03-28</summary>

- [x] Phase 17: Storage Foundation (2/2 plans) — completed 2026-03-27
- [x] Phase 18: Write Path (2/2 plans) — completed 2026-03-27
- [x] Phase 19: Read Path (2/2 plans) — completed 2026-03-27
- [x] Phase 20: Regeneration and Stale Detection (2/2 plans) — completed 2026-03-28

See: `.planning/milestones/v1.4-ROADMAP.md` for full details.

</details>

### 🚧 v1.5 Bug Fixes & Navigation Overhaul (In Progress)

**Milestone Goal:** Fix broken diagram navigation to load from cache instead of regenerating, overhaul the sidebar and breadcrumb UX, and improve code-level diagram quality.

## Phase Details

### Phase 21: Cache-First Navigation
**Goal**: Users can navigate between diagram levels and trigger full generation without silently overwriting .reef/ data
**Depends on**: Phase 20
**Requirements**: NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):
  1. User can click a diagram element to drill down and see the cached diagram instantly — no generation is triggered
  2. User can switch between C4 levels via sidebar or breadcrumb and see cached diagrams instantly — no generation is triggered
  3. User's .reef/ diagram files are unchanged after any navigation action — only an explicit Regenerate action can modify .reef/
  4. User can click "Generate All" and all 4 C4 levels are generated and stored, including component and code levels
**Plans**: TBD
**UI hint**: yes

### Phase 22: Sidebar & Breadcrumb Overhaul
**Goal**: Users can navigate the C4 hierarchy through a reliable sidebar that reflects current position and a breadcrumb trail without redundant segments
**Depends on**: Phase 21
**Requirements**: SIDE-01, SIDE-02, SIDE-03, BRCR-01
**Success Criteria** (what must be TRUE):
  1. User sees the currently active C4 level highlighted in the sidebar immediately after any navigation (drill-down, level switch, breadcrumb click)
  2. User can drag the sidebar edge to resize it, and the new width persists across navigation actions
  3. User sees a nested tree of clickable elements under each C4 level in the sidebar that matches what is clickable in the diagram canvas
  4. User sees a breadcrumb trail where each segment appears exactly once with no duplicate level names, and the current level is clearly indicated
**Plans**: TBD
**UI hint**: yes

### Phase 23: Code-Level Diagram Quality
**Goal**: Users see meaningful class structure in code-level diagrams from static analysis alone, not empty or near-empty diagrams
**Depends on**: Phase 21
**Requirements**: QUAL-01
**Success Criteria** (what must be TRUE):
  1. User sees classes, public methods, and key properties in code-level diagrams generated from a TypeScript repository without AI enrichment
  2. User sees a non-empty code-level diagram for any repository that contains TypeScript source files with at least one class or exported function
**Plans**: TBD

## Progress

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
| 11. Static Analysis Depth | v1.2 | 2/2 | Complete | 2026-03-02 |
| 12. AI Enrichment Pipeline | v1.2 | 2/2 | Complete | 2026-03-02 |
| 13. Drill-Down Navigation Fix | v1.2 | 3/3 | Complete | 2026-03-03 |
| 14. Rendering Performance | v1.2 | 2/2 | Complete | 2026-03-03 |
| 15. UI Cleanup | v1.3 | 2/2 | Complete | 2026-03-04 |
| 16. Explorer UI | v1.3 | 2/2 | Complete | 2026-03-06 |
| 17. Storage Foundation | v1.4 | 2/2 | Complete | 2026-03-27 |
| 18. Write Path | v1.4 | 2/2 | Complete | 2026-03-27 |
| 19. Read Path | v1.4 | 2/2 | Complete | 2026-03-27 |
| 20. Regeneration and Stale Detection | v1.4 | 2/2 | Complete | 2026-03-28 |
| 21. Cache-First Navigation | v1.5 | 0/TBD | Not started | - |
| 22. Sidebar & Breadcrumb Overhaul | v1.5 | 0/TBD | Not started | - |
| 23. Code-Level Diagram Quality | v1.5 | 0/TBD | Not started | - |

---
*Last updated: 2026-03-28 — v1.5 roadmap created*
