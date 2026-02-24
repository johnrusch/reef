# Requirements: Reef

**Defined:** 2026-02-24
**Core Value:** Users can quickly grasp unfamiliar codebase architecture through AI-generated C4 diagrams that update as code changes

## v1.1 Requirements

Requirements for v1.1 Persistent Diagrams with Change Visualization. Each maps to roadmap phases.

### Persistent Storage

- [x] **STOR-01**: User can close and reopen app without losing generated diagrams
- [x] **STOR-02**: App migrates v1.0 TTL-based cache to persistent storage on first launch
- [x] **STOR-03**: Database uses WAL mode for concurrent read performance
- [x] **STOR-04**: App tracks diagram state (never_generated, generating, fresh, stale, error)

### Auto-Generation

- [ ] **AGEN-01**: User sees prompt with cost estimate when adding repository asking whether to generate diagrams
- [ ] **AGEN-02**: User can choose to generate diagrams immediately, skip for now, or set preference for all repos
- [ ] **AGEN-03**: User sees loading indicator with progress during diagram generation
- [ ] **AGEN-04**: Diagram generation runs in background queue without blocking UI
- [ ] **AGEN-05**: User receives notification when background generation completes

### Change Detection

- [ ] **CHNG-01**: User sees stale indicator when files have changed since last diagram generation
- [ ] **CHNG-02**: Changed files map to specific C4 elements (Code, Component, Container)
- [ ] **CHNG-03**: Changes bubble up through hierarchy (Code change marks parent Component, Component change marks parent Container)
- [ ] **CHNG-04**: File changes are debounced and aggregated to prevent rapid-fire updates
- [ ] **CHNG-05**: User can see count of changed elements at each C4 level

### Change Visualization

- [ ] **VISU-01**: Changed elements in diagram are visually highlighted (amber/orange styling)
- [ ] **VISU-02**: User can see change badge on diagram elements showing number of changed children
- [ ] **VISU-03**: User can hover on change badge to see tooltip listing affected files
- [ ] **VISU-04**: User can distinguish between direct changes and inherited changes (children changed)

### Navigation

- [ ] **NAVG-01**: User can click stale indicator or button to regenerate diagram
- [ ] **NAVG-02**: User can click on changed code-level element to navigate to diff viewer
- [ ] **NAVG-03**: Diff viewer shows context banner indicating navigation source (from diagram)
- [ ] **NAVG-04**: User can click back button in diff viewer to return to diagram position
- [ ] **NAVG-05**: Changed files are highlighted in the changes panel when navigating from diagram

## Future Requirements

Deferred to v1.2+. Tracked but not in current roadmap.

### History & Versioning

- **HIST-01**: User can view previous versions of diagrams
- **HIST-02**: User can compare diagrams at different commits
- **HIST-03**: User can see architecture drift over time

### Advanced Analysis

- **ANAL-01**: User can see change impact analysis (what's affected by changing X)
- **ANAL-02**: User can compare intended vs actual architecture

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time live diagram updates | Destroys performance, explodes API costs, causes visual flicker |
| Automatic background regeneration | Silent API costs, no user control over spending |
| Inline diff overlay on diagram | Mixes architecture/code concerns, becomes unreadable |
| Commit-linked diagram snapshots | High complexity, defer to v1.2+ |
| Multi-repository combined diagrams | Out of scope since v1.0, single repo focus |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STOR-01 | Phase 5 | Complete |
| STOR-02 | Phase 5 | Complete |
| STOR-03 | Phase 5 | Complete |
| STOR-04 | Phase 5 | Complete |
| AGEN-01 | Phase 6 | Pending |
| AGEN-02 | Phase 6 | Pending |
| AGEN-03 | Phase 6 | Pending |
| AGEN-04 | Phase 6 | Pending |
| AGEN-05 | Phase 6 | Pending |
| CHNG-01 | Phase 7 | Pending |
| CHNG-02 | Phase 7 | Pending |
| CHNG-03 | Phase 7 | Pending |
| CHNG-04 | Phase 7 | Pending |
| CHNG-05 | Phase 7 | Pending |
| VISU-01 | Phase 8 | Pending |
| VISU-02 | Phase 8 | Pending |
| VISU-03 | Phase 8 | Pending |
| VISU-04 | Phase 8 | Pending |
| NAVG-01 | Phase 9 | Pending |
| NAVG-02 | Phase 9 | Pending |
| NAVG-03 | Phase 9 | Pending |
| NAVG-04 | Phase 9 | Pending |
| NAVG-05 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-24 after roadmap creation*
