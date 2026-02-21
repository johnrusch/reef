# Feature Research

**Domain:** C4 Architecture Diagram Visualization
**Researched:** 2026-02-21
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Zoom & Pan | Standard for any diagram viewer; users need to see detail | LOW | Already implemented in Reef |
| Fullscreen mode | Users want to focus on diagrams without distractions | LOW | Already implemented in Reef |
| Export (PNG/SVG) | Users need to share diagrams in docs, presentations | LOW | Already implemented in Reef |
| Hierarchical navigation (drill-down) | Core C4 concept: Context → Container → Component → Code | MEDIUM | Double-click element to zoom to next level |
| Visual indicators for navigable elements | Users need to know what's clickable | LOW | Icons like zoom-in symbol on drillable elements |
| Diagram thumbnails/list | Users manage multiple diagrams, need quick switching | MEDIUM | Left panel with diagram previews |
| Keyboard navigation | Power users expect arrow keys for prev/next diagram | LOW | Up/Down/Left/Right for diagram switching |
| Auto-layout optimization | Diagrams must be readable without manual positioning | HIGH | Declaration order affects layout algorithm |
| Proper element grouping | System boundaries, containers grouped visually | MEDIUM | C4-PlantUML subgraph support |
| Element metadata display | Type labels (System, Container, Component) reduce ambiguity | LOW | Text in boxes showing element type |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-powered diagram generation | Automatic C4 diagrams from code analysis | HIGH | Reef's core differentiator; competitors are manual |
| Automatic regeneration on file changes | Diagrams stay current as code evolves | MEDIUM | Already implemented via file change detection |
| Hybrid approach (static + AI) | Better quality than pure AI, less manual than pure static | HIGH | Static analysis for structure, AI for insights |
| Multi-level caching | Fast diagram access; 15min cache like Firecrawl | MEDIUM | Already implemented; extend with level-specific caching |
| Context-aware element selection | Smart file prioritization for token limits | HIGH | Already implemented in ContextExtractorService |
| Clickable elements with metadata | Double-click to drill down, view docs, or open URLs | MEDIUM | PlantUML hyperlink support enables this |
| Quick navigation dialog | Keyboard shortcut (Space) to jump to any diagram | LOW | Fast access in large diagram collections |
| Search/filter diagrams | Find diagrams by element name or type | MEDIUM | Useful for large codebases with many diagrams |
| Dark theme optimized | Developer-focused aesthetic | LOW | Already implemented in Reef |
| Model-based approach | Single model → multiple views | HIGH | Anti-pattern to duplicate elements across diagrams |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Manual diagram editing | Users want to "fix" AI output | Diagrams become stale immediately; defeats auto-generation purpose | Improve AI prompts; regenerate instead |
| Real-time live updates | "Live collaboration" sounds good | Costly, complex, unnecessary; file save is sufficient trigger | File change detection on save |
| Too many abstraction levels | Users want "sub-components" or custom levels | Reintroduces chaos C4 aims to solve; ambiguous diagrams | Stick to 4 C4 levels; use filtering instead |
| Showing external system internals | Users want to diagram third-party services | Creates coupling and volatility; diagrams break when vendor changes | Show boundaries only; focus on interfaces |
| Subsystems as abstraction | "Seems to add structure" | Superficial grouping without meaningful architectural info | Use proper containers/components instead |
| Mixing abstraction levels | Class diagrams on container views | Confuses viewers; violates C4 hierarchy | Keep levels distinct; drill down for detail |
| Random element declaration order | AI outputs elements as it thinks of them | Creates edge crossings and unreadable layouts | Force tier-based ordering: actors → UI → API → services → data |
| Over-detailed external elements | Showing third-party database schemas | Unnecessary complexity; breaks when external system changes | Abstract to single container with interface |
| Everything as a single diagram | "One diagram to rule them all" | Unreadable, overwhelming, defeats hierarchy | Multiple focused diagrams with drill-down |

## Feature Dependencies

```
[Hierarchical Navigation]
    └──requires──> [C4 Level Generation (all 4 levels)]
                       └──requires──> [AI Prompt Engineering for C4]

[Clickable Elements] ──requires──> [PlantUML Hyperlink Support]
                     ──enhances──> [Hierarchical Navigation]

[Auto-regeneration on File Changes] ──requires──> [File Change Detection]
                                     ──already exists in Reef──

[Diagram Caching] ──requires──> [C4 Level Generation]
                  ──enhances──> [Performance]

[Search/Filter Diagrams] ──requires──> [Diagram Metadata Storage]
                         ──enhances──> [Quick Navigation]

[Tier-based Element Ordering] ──conflicts──> [Manual Diagram Editing]
                              ──requires──> [AI Prompt Constraints]

[Model-based Approach] ──conflicts──> [Diagramming-first Tools]
                       ──requires──> [Single Source of Truth for Elements]
```

### Dependency Notes

- **Hierarchical Navigation requires C4 Level Generation:** Cannot drill down if only Context diagrams exist; need all 4 levels
- **Clickable Elements enhances Navigation:** PlantUML `[[URL]]` syntax enables drill-down clicks
- **Tier-based Ordering conflicts with Manual Editing:** Manual edits break AI regeneration's declaration order
- **Model-based Approach conflicts with Diagramming-first:** Storing diagrams as code prevents model reuse
- **Auto-regeneration requires File Change Detection:** Already exists; needs C4-aware regeneration logic

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] All 4 C4 levels generated (Context, Container, Component, Code) — Core C4 requirement
- [ ] Hierarchical drill-down navigation (double-click element) — Differentiator vs manual tools
- [ ] Visual indicators for navigable elements (icons) — Essential for usability
- [ ] Tier-based AI prompt engineering (left-to-right flow) — Prevents unreadable diagrams
- [ ] Automatic regeneration when files change — Keeps diagrams current
- [ ] Zoom, pan, fullscreen (already implemented) — Table stakes
- [ ] Export PNG/SVG (already implemented) — Table stakes
- [ ] Diagram caching per level — Performance requirement
- [ ] Element metadata (type labels) — Prevents ambiguity
- [ ] System boundary grouping — Core C4 visual requirement

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Diagram thumbnails/list view — Add when users have multiple diagrams
- [ ] Quick navigation dialog (Space key) — Add when diagram collections grow
- [ ] Search/filter diagrams by element — Add when >10 diagrams exist
- [ ] Keyboard navigation (arrow keys) — Add based on power user feedback
- [ ] Tooltips on hover for element details — Add to reduce click fatigue
- [ ] Documentation links from elements — Add when integrating with ADRs
- [ ] Comparison view (before/after changes) — Add when diagram history matters

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Multi-repository combined diagrams — Complexity vs value unclear
- [ ] Sequence diagrams from C4 elements — Different use case; defer
- [ ] Custom element styling/themes — Low ROI; default C4 colors sufficient
- [ ] Diagram versioning/history beyond caching — Git handles this
- [ ] Collaboration features (comments, annotations) — Requires backend; defer
- [ ] Integration with architecture decision records — Needs ADR implementation first

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| All 4 C4 levels generation | HIGH | HIGH | P1 |
| Hierarchical drill-down navigation | HIGH | MEDIUM | P1 |
| Tier-based element ordering | HIGH | MEDIUM | P1 |
| Auto-regeneration on file changes | HIGH | LOW | P1 |
| Visual indicators for navigation | MEDIUM | LOW | P1 |
| Element metadata labels | HIGH | LOW | P1 |
| System boundary grouping | HIGH | MEDIUM | P1 |
| Diagram caching per level | MEDIUM | MEDIUM | P1 |
| Diagram thumbnails/list | MEDIUM | MEDIUM | P2 |
| Quick navigation dialog | MEDIUM | LOW | P2 |
| Search/filter diagrams | MEDIUM | MEDIUM | P2 |
| Keyboard navigation | LOW | LOW | P2 |
| Tooltips on element hover | MEDIUM | LOW | P2 |
| Documentation links | LOW | MEDIUM | P2 |
| Comparison view | LOW | HIGH | P3 |
| Custom styling/themes | LOW | MEDIUM | P3 |
| Multi-repo combined diagrams | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (validates C4 diagram concept)
- P2: Should have, add when possible (improves UX)
- P3: Nice to have, future consideration (low ROI)

## Competitor Feature Analysis

| Feature | Structurizr (Market Leader) | Ilograph | Our Approach (Reef) |
|---------|----------------------------|----------|---------------------|
| Diagram generation | Manual DSL coding | Manual coding | AI-powered from code analysis |
| Navigation | Double-click drill-down | Multi-perspective views | Double-click + keyboard |
| Layout | Automatic with manual hints | Automatic zoom-based | AI-optimized tier-based ordering |
| Export | PNG, SVG, HTML | Interactive HTML | PNG, SVG (leverage PlantUML) |
| Interactivity | Clickable elements, tooltips | Sequence flows, walkthroughs | PlantUML hyperlinks |
| Updates | Manual code changes | Manual edits | Automatic on file changes |
| Accessibility | Standard web viewer | Screen-reader friendly | Standard PlantUML rendering |
| Cost | Paid SaaS or self-hosted | Paid tiers | Free (desktop app) |
| Storage | Cloud or git | Cloud or desktop | Local git repository |
| Tech stack | Java + web UI | Web-based | Electron + PlantUML |

**Key Differentiators:**
1. **AI generation** vs manual coding (Structurizr/Ilograph require hand-written DSL)
2. **Auto-regeneration** vs static diagrams (stays current with code)
3. **Desktop-first** vs cloud-first (privacy, offline, no subscription)
4. **Integrated with Git client** vs standalone tool (workflow integration)

## Anti-Pattern Research Summary

Based on Simon Brown's "C4 Model: Misconceptions, Misuses & Mistakes" (GOTO 2024):

### Critical Mistakes to Avoid

1. **Container/Component confusion**: Container = deployable unit; Component = non-deployable element inside container
2. **Arbitrary abstraction levels**: Don't add "subsystems" or "sub-components"; use 4 C4 levels only
3. **External system details**: Show boundaries only, not internal implementation
4. **Shared libraries as containers**: Libraries are components, not containers
5. **Message brokers as single containers**: Model topics as individual containers
6. **Metadata removal**: Keep element type labels; ambiguity is worse than clutter
7. **Random declaration order**: Causes edge crossings; use tier-based ordering
8. **Vague AI refinement requests**: "Make it cleaner" doesn't work; specify crossings to fix
9. **Relationships before elements**: Declare all elements first, then relationships

### Layout Quality Research

From "Why Your AI-Generated C4 Diagrams Look Terrible" (David R Oliver, 2026):

- **Edge crossings are the #1 readability factor** (30-40% accuracy improvement when minimized)
- **Declaration order controls layout**: AI must output elements in tier order (actors → UI → API → services → data)
- **Proximity matters**: Elements close together are perceived as related (Gestalt principle)
- **Color should encode meaning**: Persons (dark), Containers (medium), External (grey)
- **PlantUML layout hints**: `Rel_Right`, `Rel_Down`, `Lay_Right` force element positions

## Sources

**C4 Model Official:**
- https://c4model.com/tooling - Official C4 tooling landscape
- Simon Brown GOTO 2024 talk - "C4 Model: Misconceptions, Misuses & Mistakes"

**Leading Tools:**
- https://docs.structurizr.com/ui/diagrams/navigation - Market leader navigation patterns
- https://www.ilograph.com/features.html - Interactive diagram features
- https://plantuml.com/link - PlantUML hyperlink capabilities

**Research & Best Practices:**
- David R Oliver (2026) - "Why Your AI-Generated C4 Diagrams Look Terrible"
- Helen Purchase (University of Queensland) - Graph drawing aesthetics research
- Patrick Roos - "Misuses and Mistakes of the C4 model" summary

**Community Resources:**
- https://github.com/plantuml-stdlib/C4-PlantUML - C4-PlantUML syntax library
- Medium/Reddit discussions on C4 tooling and architecture diagrams

---
*Feature research for: C4 Architecture Diagram Visualization in Desktop Git Client*
*Researched: 2026-02-21*
