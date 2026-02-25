# Roadmap: Reef C4 Architecture Diagrams

## Milestones

- ✅ **v1.0 C4 Diagram Feature Release** — Phases 1-4 (shipped 2026-02-24)
- 🚧 **v1.1 Persistent Diagrams with Change Visualization** — Phases 5-9 (in progress)

## Phases

<details>
<summary>✅ v1.0 C4 Diagram Feature Release (Phases 1-4) — SHIPPED 2026-02-24</summary>

- [x] Phase 1: C4 Foundation (5/5 plans) — completed 2026-02-23
- [x] Phase 2: Automatic Regeneration (2/2 plans) — completed 2026-02-23
- [x] Phase 3: Hierarchy Navigation (2/2 plans) — completed 2026-02-23
- [x] Phase 4: Polish & Advanced Features (2/2 plans) — completed 2026-02-24

See: `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

### 🚧 v1.1 Persistent Diagrams with Change Visualization (In Progress)

**Milestone Goal:** Make C4 diagrams a persistent, always-ready feature with real-time architectural change visualization.

- [x] **Phase 5: Persistent Storage Foundation** - Remove TTL expiration, establish diagram persistence across sessions (UAT gap closure in progress) (completed 2026-02-25)
- [x] **Phase 6: Auto-Generation on Repo Add** - Prompt users to generate diagrams when adding repositories (completed 2026-02-25)
- [ ] **Phase 7: Enhanced Change Detection** - Real-time file-to-element mapping with hierarchical propagation
- [ ] **Phase 8: Change Visualization** - Visual indicators for changed elements with tooltips and badges
- [ ] **Phase 9: Diagram-to-Diff Navigation** - Contextual navigation from changed elements to diff viewer

## Phase Details

### Phase 5: Persistent Storage Foundation
**Goal**: Diagrams survive app restarts without regeneration
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: STOR-01, STOR-02, STOR-03, STOR-04
**Success Criteria** (what must be TRUE):
  1. User can close and reopen app without losing any generated diagrams
  2. Database migrates v1.0 TTL-based cache to v1.1 persistent storage automatically on first launch
  3. App displays diagram state accurately (never generated, generating, fresh, stale, error) in UI
  4. Multiple diagram reads complete without blocking during generation operations
**Plans**: 7 plans (Wave 0 + 4 implementation plans + 2 gap closures)

Plans:
- [x] 05-00-PLAN.md — Wave 0: Test scaffolds for Nyquist compliance (3 tasks, 8 files)
- [x] 05-01-PLAN.md — Storage infrastructure: types, C4StorageService, MigrationService (3 tasks, 3 files)
- [x] 05-02-PLAN.md — Frontend state: diagramStateStore, DiagramStateBadge, GeneratePromptCard (3 tasks, 3 files)
- [x] 05-03-PLAN.md — Integration: IPC handlers, preload API, DiagramViewer wiring (3 tasks, 5 files)
- [x] 05-04-PLAN.md — Settings UI and test implementation (3 tasks, 8 files)
- [x] 05-05-PLAN.md — Gap closure: Wire generation pipeline to storage and state management (3 tasks, 3 files)
- [ ] 05-06-PLAN.md — Gap closure: Fix unreachable GeneratePromptCard and first-time generating indicator (1 task, 1 file)

### Phase 6: Auto-Generation on Repo Add
**Goal**: Users see diagrams ready without manual triggering
**Depends on**: Phase 5
**Requirements**: AGEN-01, AGEN-02, AGEN-03, AGEN-04, AGEN-05
**Success Criteria** (what must be TRUE):
  1. User sees cost estimation prompt when adding repository asking whether to generate diagrams
  2. User can choose immediate generation, skip for now, or set preference for all future repos
  3. User sees progress indicator showing generation status (level and percentage) while diagrams generate
  4. User can continue using app without blocking while background generation runs
  5. User receives notification when background generation completes successfully or encounters error
**Plans**: 3 plans (2 waves)

Plans:
- [ ] 06-01-PLAN.md — Backend infrastructure: generationQueueService, IPC handlers, preload API, preference persistence (2 tasks, 5 files)
- [ ] 06-02-PLAN.md — Frontend stores and UI: generationQueueStore, toastStore, GenerationStatusBar, ToastContainer (2 tasks, 5 files)
- [ ] 06-03-PLAN.md — Integration: GenerationPromptModal, AddRepositoryModal flow, MainLayout wiring, settings toggle (2 tasks, 4 files)

### Phase 7: Enhanced Change Detection
**Goal**: Real-time tracking of which C4 elements are affected by file changes
**Depends on**: Phase 6
**Requirements**: CHNG-01, CHNG-02, CHNG-03, CHNG-04, CHNG-05
**Success Criteria** (what must be TRUE):
  1. User sees stale indicator appear within 2 seconds of saving changed files
  2. Changed files accurately map to specific Code, Component, or Container elements in diagrams
  3. Changes bubble up hierarchy visibly (Code change marks parent Component, Component marks parent Container)
  4. Multiple rapid file saves result in single aggregated update without API call spam
  5. User can see count of changed elements at each C4 level (e.g., "3 components changed")
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

### Phase 8: Change Visualization
**Goal**: Changed elements are visually distinct in diagrams
**Depends on**: Phase 7
**Requirements**: VISU-01, VISU-02, VISU-03, VISU-04
**Success Criteria** (what must be TRUE):
  1. Changed elements display with amber/orange styling clearly distinguishable from normal elements
  2. Elements with changed children display badge showing count of affected descendants
  3. User can hover on change badge to see tooltip listing specific affected files
  4. User can distinguish between direct changes (files in this element) and inherited changes (descendant elements changed)
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: Diagram-to-Diff Navigation
**Goal**: Contextual navigation from diagram changes to code diff viewer
**Depends on**: Phase 8
**Requirements**: NAVG-01, NAVG-02, NAVG-03, NAVG-04, NAVG-05
**Success Criteria** (what must be TRUE):
  1. User can click stale indicator or regenerate button to update diagram with latest changes
  2. User can click on changed code-level element to navigate directly to diff viewer showing that file
  3. Diff viewer displays context banner indicating navigation came from diagram
  4. User can click back button in diff viewer to return to exact diagram position
  5. Changed files are visually highlighted in changes panel when navigating from diagram
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. C4 Foundation | v1.0 | 5/5 | Complete | 2026-02-23 |
| 2. Automatic Regeneration | v1.0 | 2/2 | Complete | 2026-02-23 |
| 3. Hierarchy Navigation | v1.0 | 2/2 | Complete | 2026-02-23 |
| 4. Polish & Advanced Features | v1.0 | 2/2 | Complete | 2026-02-24 |
| 5. Persistent Storage Foundation | 8/8 | Complete   | 2026-02-25 | - |
| 6. Auto-Generation on Repo Add | 3/3 | Complete   | 2026-02-25 | - |
| 7. Enhanced Change Detection | v1.1 | 0/TBD | Not started | - |
| 8. Change Visualization | v1.1 | 0/TBD | Not started | - |
| 9. Diagram-to-Diff Navigation | v1.1 | 0/TBD | Not started | - |

---
*Last updated: 2026-02-25 — Phase 6: Plan created (3 plans, 2 waves)*
