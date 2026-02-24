# Requirements: Reef C4 Diagrams

**Defined:** 2026-02-21
**Core Value:** Users can quickly grasp unfamiliar codebase architecture through AI-generated C4 diagrams that update as code changes

## v1 Requirements

Requirements for C4 diagram feature release. Each maps to roadmap phases.

### C4 Generation

- [x] **C4GEN-01**: System generates C4 Context diagram showing system in its environment with external dependencies
- [x] **C4GEN-02**: System generates C4 Container diagram showing high-level tech stack (apps, databases, services)
- [x] **C4GEN-03**: System generates C4 Component diagram showing components within each container
- [x] **C4GEN-04**: System generates C4 Code diagram showing class-level implementation details
- [x] **C4GEN-05**: System uses hybrid approach combining static code analysis (ts-morph) with AI enrichment
- [x] **C4GEN-06**: System validates C4 abstraction levels to prevent Container/Component confusion
- [x] **C4GEN-07**: System generates C4-PlantUML syntax compatible with PlantUML rendering
- [x] **C4GEN-08**: System includes element metadata (technology choices, relationships, descriptions) in diagrams

### Navigation & Hierarchy

- [x] **NAV-01**: User can click diagram elements to drill down from Context to Container level
- [x] **NAV-02**: User can click diagram elements to drill down from Container to Component level
- [x] **NAV-03**: User can click diagram elements to drill down from Component to Code level
- [x] **NAV-04**: User sees breadcrumb trail showing current position in C4 hierarchy
- [x] **NAV-05**: User can click breadcrumbs to navigate back up hierarchy levels
- [x] **NAV-06**: User can switch between C4 levels using level selector controls
- [x] **NAV-07**: User can use keyboard shortcuts to navigate diagram (fullscreen toggle, zoom, regenerate)
- [x] **NAV-08**: Diagram elements show visual indicators when clickable for drill-down

### Auto-Update & Caching

- [x] **UPDATE-01**: System detects when repository files change
- [x] **UPDATE-02**: System shows visual indicator when diagram is potentially stale due to file changes
- [x] **UPDATE-03**: System automatically regenerates diagrams when user confirms file changes
- [x] **UPDATE-04**: User can manually trigger diagram regeneration at any time
- [x] **UPDATE-05**: System implements level-aware caching (Context cached longer, Code cached shorter)
- [x] **UPDATE-06**: System invalidates cache intelligently based on changed files and C4 level
- [x] **UPDATE-07**: System reuses cached diagrams when codebase hasn't changed to avoid API costs

### Infrastructure

- [x] **INFRA-01**: System integrates ts-morph library for TypeScript static analysis
- [x] **INFRA-02**: System uses ts-morph to extract classes, functions, and dependencies
- [x] **INFRA-03**: System upgrades @anthropic-ai/sdk to v0.78.0
- [x] **INFRA-04**: System verifies PlantUML server supports C4-PlantUML library
- [x] **INFRA-05**: System generates proper C4-PlantUML include statements in diagram code
- [x] **INFRA-06**: System maintains consistent element IDs across C4 hierarchy levels for navigation
- [x] **INFRA-07**: System tracks parent-child relationships between C4 diagram elements

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Analytics & Feedback

- **ANALYTICS-01**: System shows coverage metrics indicating what % of codebase is analyzed
- **ANALYTICS-02**: System warns when token limits force partial codebase analysis
- **ANALYTICS-03**: System provides diagram comparison view to see architectural changes over time

### Advanced Navigation

- **ADVNAV-01**: User can search for specific components/containers via quick navigation dialog
- **ADVNAV-02**: User can view thumbnail previews of all diagram levels simultaneously
- **ADVNAV-03**: System provides "back" history navigation like web browser

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Manual diagram editing | Defeats auto-regeneration purpose; diagrams should reflect actual code |
| Real-time live updates | Unnecessary complexity; file change detection on save is sufficient |
| Custom abstraction levels beyond C4's 4 levels | Violates C4 model principles; arbitrary levels harm consistency |
| Multi-repository combined diagrams | Single repository at a time; defer to future based on demand |
| UML sequence diagrams | Not part of C4 model; existing feature can remain separately |
| UML component diagrams (non-C4) | Replaced by C4 Component diagrams for consistency |
| UML class diagrams (non-C4) | Replaced by C4 Code diagrams for consistency |
| Cross-repository system context | Complex dependency mapping; single repo provides sufficient value |
| Showing external system internals | C4 principle: external systems are black boxes in Context diagrams |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| C4GEN-01 | Phase 1 | Complete |
| C4GEN-02 | Phase 1 | Complete |
| C4GEN-03 | Phase 1 | Complete |
| C4GEN-04 | Phase 1 | Complete |
| C4GEN-05 | Phase 1 | Complete |
| C4GEN-06 | Phase 1 | Complete |
| C4GEN-07 | Phase 1 | Complete |
| C4GEN-08 | Phase 1 | Complete |
| NAV-01 | Phase 3 | Complete (03-02) |
| NAV-02 | Phase 3 | Complete (03-02) |
| NAV-03 | Phase 3 | Complete (03-02) |
| NAV-04 | Phase 3 | Complete (03-01) |
| NAV-05 | Phase 3 | Complete (03-01) |
| NAV-06 | Phase 1 | Complete (01-04) |
| NAV-07 | Phase 4 | Complete |
| NAV-08 | Phase 3 | Complete (03-02) |
| UPDATE-01 | Phase 2 | Complete (02-01) |
| UPDATE-02 | Phase 2 | Complete |
| UPDATE-03 | Phase 2 | Complete |
| UPDATE-04 | Phase 2 | Complete |
| UPDATE-05 | Phase 1 | Complete |
| UPDATE-06 | Phase 2 | Complete (02-01) |
| UPDATE-07 | Phase 2 | Complete (02-01) |
| INFRA-01 | Phase 1 | Complete (01-01) |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete (01-01) |
| INFRA-04 | Phase 1 | Complete (01-01) |
| INFRA-05 | Phase 1 | Complete (01-01) |
| INFRA-06 | Phase 3 | Complete |
| INFRA-07 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30/30 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-21 after roadmap creation*
