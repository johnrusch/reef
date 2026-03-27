# Roadmap: Reef C4 Architecture Diagrams

## Milestones

- ✅ **v1.0 C4 Diagram Feature Release** — Phases 1-4 (shipped 2026-02-24)
- ✅ **v1.1 Persistent Diagrams with Change Visualization** — Phases 5-10 (shipped 2026-02-28)
- ✅ **v1.2 Diagrams That Deliver** — Phases 11-14 (shipped 2026-03-03)
- ✅ **v1.3 Diagram Explorer** — Phases 15-16 (shipped 2026-03-06)
- 🚧 **v1.4 Repo-Stored Diagrams** — Phases 17-20 (in progress)

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

### 🚧 v1.4 Repo-Stored Diagrams (In Progress)

**Milestone Goal:** Store C4 diagram artifacts in a `.reef/` folder within each repository so diagrams are shared, version-controlled, and render instantly.

- [x] **Phase 17: Storage Foundation** - Define `.reef/` folder contract, chokidar exclusion, and ReefStorageService core (completed 2026-03-27)
- [ ] **Phase 18: Write Path** - Hook generation pipeline to auto-write artifacts to `.reef/` after every successful generation
- [ ] **Phase 19: Read Path** - Load existing `.reef/` artifacts on repo import for instant display without AI regeneration
- [ ] **Phase 20: Regeneration and Stale Detection** - Manual regenerate-and-save UI and stale indicator when stored diagrams predate code changes

## Phase Details

### Phase 17: Storage Foundation
**Goal**: The `.reef/` folder contract is stable, safe, and self-contained — ReefStorageService handles all file I/O with atomic writes, schema validation, and chokidar exclusion before any files are ever written
**Depends on**: Phase 16 (v1.3 complete)
**Requirements**: STOR-01, STOR-02, STOR-03, STOR-04
**Success Criteria** (what must be TRUE):
  1. A `.reef/` folder with per-level `.puml`, `.svg`, and `.meta.json` files appears in a managed repository after the service writes artifacts
  2. Every `metadata.json` file contains a `schemaVersion: 1` field and is rejected gracefully (fallback to regeneration) when the field is absent or mismatched
  3. Writing files to `.reef/` does not trigger the stale-diagram state or any file-change event in the app (chokidar exclusion active)
  4. A `.gitattributes` file marking `.reef/*.svg` and `.reef/*.puml` as binary is created alongside the first write, preventing SVG merge conflicts
**Plans**: 2 plans
Plans:
- [x] 17-01-PLAN.md — ReefStorageService types, service, and tests (STOR-01, STOR-02, STOR-04)
- [ ] 17-02-PLAN.md — Chokidar .reef/ exclusion patch and tests (STOR-03)

### Phase 18: Write Path
**Goal**: Every successful C4 diagram generation automatically writes PlantUML source, rendered SVG, and source-code hash to `.reef/` — no user action required
**Depends on**: Phase 17
**Requirements**: WRITE-01, WRITE-02
**Success Criteria** (what must be TRUE):
  1. After generating diagrams for a repository, a user can open `.reef/` in their file explorer and find `.puml`, `.svg`, and `.meta.json` files for each generated C4 level
  2. The `.meta.json` for each level contains a hash of the analyzed source files, enabling downstream staleness comparison
  3. A failure writing to `.reef/` does not prevent diagram display or corrupt the SQLite state (write is non-fatal; SQLite remains source of truth)
**Plans**: 2 plans
Plans:
- [ ] 17-01-PLAN.md — ReefStorageService types, service, and tests (STOR-01, STOR-02, STOR-04)
- [ ] 17-02-PLAN.md — Chokidar .reef/ exclusion patch and tests (STOR-03)

### Phase 19: Read Path
**Goal**: Users who add a repository that already has a `.reef/` folder see diagrams immediately — no AI call, no PlantUML render, no wait
**Depends on**: Phase 18
**Requirements**: READ-01, READ-02, READ-03
**Success Criteria** (what must be TRUE):
  1. When a user adds a repository with a complete `.reef/` folder, the generation prompt is skipped and diagrams appear instantly from stored SVGs
  2. SVGs from `.reef/` display in the diagram viewer at the same visual quality as freshly rendered diagrams — no additional PlantUML rendering step occurs
  3. When a user adds a repository with a partial `.reef/` folder (e.g., only the context level present), the available levels display immediately and the missing levels are automatically queued for generation
**Plans**: 2 plans
Plans:
- [ ] 17-01-PLAN.md — ReefStorageService types, service, and tests (STOR-01, STOR-02, STOR-04)
- [ ] 17-02-PLAN.md — Chokidar .reef/ exclusion patch and tests (STOR-03)
**UI hint**: yes

### Phase 20: Regeneration and Stale Detection
**Goal**: Users can explicitly refresh stored diagrams after code changes and see a clear indicator when their `.reef/` data is older than recent commits
**Depends on**: Phase 19
**Requirements**: REGEN-01, REGEN-02
**Success Criteria** (what must be TRUE):
  1. A user can trigger regeneration from the toolbar and, on completion, find the updated `.puml`, `.svg`, and `.meta.json` artifacts written to `.reef/` — ready to commit and share with teammates
  2. When `.reef/` diagram data predates recent code changes (detected by comparing stored hash or generation timestamp against current file state), the user sees a stale indicator without having to trigger regeneration to find out
**Plans**: 2 plans
Plans:
- [ ] 17-01-PLAN.md — ReefStorageService types, service, and tests (STOR-01, STOR-02, STOR-04)
- [ ] 17-02-PLAN.md — Chokidar .reef/ exclusion patch and tests (STOR-03)
**UI hint**: yes

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
| 17. Storage Foundation | v1.4 | 1/2 | Complete    | 2026-03-27 |
| 18. Write Path | v1.4 | 0/? | Not started | - |
| 19. Read Path | v1.4 | 0/? | Not started | - |
| 20. Regeneration and Stale Detection | v1.4 | 0/? | Not started | - |

---
*Last updated: 2026-03-26 — v1.4 roadmap created*
