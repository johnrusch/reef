# Requirements: Reef

**Defined:** 2026-03-02
**Core Value:** Users can quickly grasp unfamiliar codebase architecture through AI-generated C4 diagrams that update as code changes

## v1.2 Requirements

Requirements for "Diagrams That Deliver" milestone. Each maps to roadmap phases.

### Static Analysis

- [x] **ANLZ-01**: Static analysis multi-pass extraction produces accurate results (fix forgetDescendants call order)
- [x] **ANLZ-02**: User sees richer diagram content from extracted functions, decorators, JSDoc, parameter types, and return types
- [x] **ANLZ-03**: User sees components grouped by directory structure and architectural role, not just class suffix matching
- [x] **ANLZ-04**: User can generate diagrams for non-TypeScript repos using file structure heuristics and AI-only analysis

### AI Enrichment

- [ ] **ENRCH-01**: AI enrichment output is consumed by the PlantUML generator (fix _enrichedData discard bug)
- [x] **ENRCH-02**: AI returns structured JSON with typed containers, components, and relationships (not free-text prose)
- [ ] **ENRCH-03**: AI provides meaningful component and container names based on domain understanding
- [x] **ENRCH-04**: AI prompts adapt per detected framework/repo type for domain-specific enrichment

### Drill-Down Navigation

- [ ] **NAV-01**: User can drill from Container diagram into Component diagram without errors (fix elementId sanitization mismatch)
- [ ] **NAV-02**: Container-to-path resolution works for any repo structure (replace hardcoded Main Process/Renderer Process map)
- [ ] **NAV-03**: Element IDs are consistent across generation, storage, click detection, and navigation (ElementId registry)
- [ ] **NAV-04**: SVG click detection works correctly on all PlantUML versions (patch transparency bug)

### Rendering Performance

- [ ] **PERF-01**: User sees cached diagrams in under 500ms (store rendered SVG in SQLite, skip Java re-render)
- [ ] **PERF-02**: Frequently viewed diagrams load from in-process LRU cache for instant display
- [ ] **PERF-03**: PlantUML JVM stays warm between renders when available (Nailgun mode, feature-flagged)

## Future Requirements

Deferred to v1.2.x or later. Tracked but not in current roadmap.

### Diagram Quality Enhancements

- **QUAL-01**: Architecture validation rules flag violations of detected patterns
- **QUAL-02**: Interactive component filtering to hide/show architectural layers
- **QUAL-03**: Diagram version comparison showing architecture drift over time

### Language Support

- **LANG-01**: Multi-language AST parsing for Python repos
- **LANG-02**: Multi-language AST parsing for Go repos
- **LANG-03**: Multi-language AST parsing for Java repos

### Tech Debt (from v1.1 audit)

- **DEBT-01**: Complete 20 pending human verification tests
- **DEBT-02**: Fix handleRegenerateFromBadge missing IPC state transitions
- **DEBT-03**: Wire up static cost estimate in GenerationPromptModal
- **DEBT-04**: Remove debug console.log statements from PlantUMLRenderer.tsx and CommitWorkflowTab.tsx
- **DEBT-05**: CHNG-01 file watching stale indicator runtime behavior
- **DEBT-06**: CHNG-04 debounce aggregation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Show all classes as components | 50+ nodes unreadable; C4 Component level is for logical groupings, Code level shows individual classes |
| Include node_modules in analysis | Produces hundreds of external system nodes; detect from package.json only |
| Full class diagrams with all methods | Wall-of-text; Code level shows public API only (max 8-10 methods per class) |
| Manual diagram editing | Edits overwritten on regeneration; copy PlantUML source to clipboard is sufficient |
| Real-time live diagram updates | SVG render too slow; stale indicators + user-initiated regeneration is sufficient |
| Multi-language AST parsing in v1.2 | Each language needs separate parser; AI-only mode for non-TS is v1.2 scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANLZ-01 | Phase 11 | Complete |
| ANLZ-02 | Phase 11 | Complete |
| ANLZ-03 | Phase 11 | Complete |
| ANLZ-04 | Phase 11 | Complete |
| ENRCH-01 | Phase 12 | Pending |
| ENRCH-02 | Phase 12 | Complete |
| ENRCH-03 | Phase 12 | Pending |
| ENRCH-04 | Phase 12 | Complete |
| NAV-01 | Phase 13 | Pending |
| NAV-02 | Phase 13 | Pending |
| NAV-03 | Phase 13 | Pending |
| NAV-04 | Phase 13 | Pending |
| PERF-01 | Phase 14 | Pending |
| PERF-02 | Phase 14 | Pending |
| PERF-03 | Phase 14 | Pending |

**Coverage:**
- v1.2 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 — traceability complete, all 15 requirements mapped*
