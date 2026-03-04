# Roadmap: Reef C4 Architecture Diagrams

## Milestones

- ✅ **v1.0 C4 Diagram Feature Release** — Phases 1-4 (shipped 2026-02-24)
- ✅ **v1.1 Persistent Diagrams with Change Visualization** — Phases 5-10 (shipped 2026-02-28)
- ✅ **v1.2 Diagrams That Deliver** — Phases 11-14 (shipped 2026-03-03)
- 🚧 **v1.3 Diagram Explorer** — Phases 15-16 (in progress)

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

### 🚧 v1.3 Diagram Explorer (In Progress)

**Milestone Goal:** Overhaul the diagram UI from a configure-and-generate interface to a clean browse-and-navigate experience with sidebar tree hierarchy navigation.

- [x] **Phase 15: UI Cleanup** — Remove the configuration landing page, legacy toolbar controls, DiagramInfo sidebar, and Beta badge to create a clean canvas for the new explorer UI
- [x] **Phase 16: Explorer UI** — Build the sidebar tree navigation, breadcrumb bar, single-button generation prompt, and minimal toolbar that replace everything removed in Phase 15
 (completed 2026-03-04)
## Phase Details

### Phase 15: UI Cleanup
**Goal**: Users see a clean, distraction-free diagram view with all legacy configuration and metadata controls removed
**Depends on**: Phase 14 (v1.2 complete)
**Requirements**: UICL-01, UICL-02, UICL-03, UICL-04
**Success Criteria** (what must be TRUE):
  1. User opens VisualMapTab and sees no configuration landing page — no C4 level picker, detail level slider, focus area toggles, AI model selector, feature info cards, or file tree button
  2. User viewing a diagram sees no legacy toolbar buttons — no Component/Class/Sequence type buttons, no detail level slider, no focus area toggles
  3. User viewing a diagram sees no DiagramInfo sidebar — no generation metadata, cost, token count, or cache controls
  4. User sees no Beta badge on the Visual Map tab label
**Plans**: 2 plans
Plans:
- [x] 15-01-PLAN.md — Remove all legacy UI controls (tests + implementation)
- [x] 15-02-PLAN.md — Visual verification checkpoint

### Phase 16: Explorer UI
**Goal**: Users can browse the full C4 hierarchy through a sidebar tree and always know where they are via breadcrumbs, with a clean single-button path to generate and a minimal toolbar for the only two controls they need
**Depends on**: Phase 15
**Requirements**: NAV-01, NAV-02, NAV-03, GEN-01, GEN-02
**Success Criteria** (what must be TRUE):
  1. User sees a collapsible sidebar tree listing all four C4 levels (Context, Containers, Components, Code) and can click any node to navigate directly to that diagram level
  2. User sees a breadcrumb bar showing their current position in the hierarchy (e.g., "Context > Containers > UserService") with clickable ancestor nodes that navigate back up
  3. When user drills down by clicking a diagram element, the sidebar tree automatically expands and highlights the newly active node without any manual interaction
  4. User arriving at VisualMapTab before any diagrams exist sees a single "Generate Diagrams" button that triggers generation of all 4 C4 levels with one click
  5. User sees a minimal toolbar with exactly two controls: regenerate and toggle change visibility
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
| 15. UI Cleanup | v1.3 | Complete    | 2026-03-04 | 2026-03-04 |
| 16. Explorer UI | v1.3 | 0/TBD | Not started | - |

---
*Last updated: 2026-03-04 — Phase 15 complete, visual verification approved*
