# Requirements: Reef

**Defined:** 2026-03-03
**Core Value:** Users can quickly grasp unfamiliar codebase architecture through AI-generated C4 diagrams that update as code changes

## v1.3 Requirements

Requirements for the Diagram Explorer milestone. Each maps to roadmap phases.

### UI Cleanup

- [ ] **UICL-01**: User sees no configuration landing page — the settings view (C4 level picker, detail level, focus area, AI model, feature info cards, file tree button) is removed from VisualMapTab
- [ ] **UICL-02**: User sees no legacy toolbar controls — non-C4 diagram type buttons (Component/Class/Sequence), detail level slider, and focus area toggles are removed
- [ ] **UICL-03**: User sees no DiagramInfo sidebar — generation metadata, cost, tokens, and cache controls are removed from the diagram view
- [ ] **UICL-04**: User sees no Beta badge on the Visual Map tab

### Navigation

- [ ] **NAV-01**: User can browse the full C4 hierarchy via a collapsible sidebar tree (Context → Containers → Components → Code)
- [ ] **NAV-02**: User can see current position in C4 hierarchy via a breadcrumb bar with clickable ancestors
- [ ] **NAV-03**: Sidebar tree auto-expands and highlights the active node when user drills down by clicking diagram elements

### Generation UX

- [ ] **GEN-01**: User sees a clean single-button prompt on first visit that generates all 4 C4 levels with one click
- [ ] **GEN-02**: User can regenerate diagrams and toggle change visibility via a minimal toolbar replacing the old DiagramControls

## Future Requirements

### Deferred

- **UICL-05**: Consolidate duplicate zoom controls (DiagramPanel overlay vs PlantUMLRenderer internal toolbar)
- **UICL-06**: Relocate API key configuration out of VisualMapTab into global settings

## Out of Scope

| Feature | Reason |
|---------|--------|
| Tech debt cleanup (hardcoded model, console.logs) | Separate from UI overhaul, defer to future |
| DiagramSettings global page changes | Keeping as-is per user decision |
| GenerationPromptModal on repo add | Existing auto-generate flow stays unchanged |
| New diagram types or generation features | v1.3 is UI-only, no generation pipeline changes |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UICL-01 | Phase 15 | Pending |
| UICL-02 | Phase 15 | Pending |
| UICL-03 | Phase 15 | Pending |
| UICL-04 | Phase 15 | Pending |
| NAV-01 | Phase 16 | Pending |
| NAV-02 | Phase 16 | Pending |
| NAV-03 | Phase 16 | Pending |
| GEN-01 | Phase 16 | Pending |
| GEN-02 | Phase 16 | Pending |

**Coverage:**
- v1.3 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after roadmap creation — all 9 requirements mapped*
