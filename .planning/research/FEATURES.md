# Feature Research

**Domain:** Persistent diagram storage with real-time change visualization and navigation
**Researched:** 2026-02-24
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Diagram persistence across sessions | Users expect diagrams to survive app restarts without regeneration | LOW | Already have better-sqlite3 + cacheService.ts infrastructure. Need to remove TTL expiration logic. |
| Auto-generate on repo add | Users expect diagrams ready without manual trigger | MEDIUM | Need UI prompt for API cost awareness + background generation queue. Chokidar already monitoring changes. |
| Stale diagram indicators | Users need to know when diagrams are outdated | LOW | StalenessBadge.tsx exists. FileWatcherService emits 'diagram:stale' events. Just needs persistence + UI refresh. |
| Click to regenerate stale diagrams | Users expect one-click refresh when outdated | LOW | UI pattern exists (StalenessBadge onClick). Backend generation already works. Just wire together. |
| Loading indicators during generation | Users need feedback for multi-minute generation | LOW | Existing regeneration flow has spinner. Just ensure it shows during initial generation too. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Hierarchical change indicators (bubble-up) | See at-a-glance which parts of architecture changed without drilling down | MEDIUM | Container shows badge if Component changed. Component shows badge if Code changed. Requires tracking changed elements through navigation tree. |
| Click element → jump to diff viewer | Navigate from architecture diagram directly to code changes | MEDIUM | SVG click detection exists (DiagramViewer). DiffViewer exists. Need: (1) map element IDs to file paths, (2) fetch git diff for file, (3) show DiffViewer in split pane or modal. |
| Changed element visual highlighting | Changed containers/components visually stand out in diagram | HIGH | Requires: (1) detecting which elements changed via git diff, (2) modifying PlantUML source to add styling, (3) regenerating SVG. PlantUML styling via #[bold]ElementName or <<changed>> stereotype. |
| Persistent navigation state | Users return to same diagram level/element across sessions | LOW | navigationStore.ts already has zustand persist. Just ensure it doesn't reset on repo switch if diagrams exist. |
| Diagram generation history/versioning | Users can view previous diagram versions or rollback | HIGH | Would require: (1) storing multiple diagram versions per repo, (2) UI for browsing history, (3) timestamp/commit linkage. Similar to Hava's version comparison. Defer to v2+. |
| Cross-level change summary | Show aggregated "3 containers changed, 12 components changed" stats | LOW | Query generation_timestamps table for last change per level + file watcher events. Display in DiagramInfo panel. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time live diagram updates | "IDE should always show current state" | Constant regeneration destroys performance, API costs explode, diagram flickers during typing | File watcher with debounced staleness indicators. User controls when to regenerate. |
| Automatic background regeneration | "App should keep diagrams fresh automatically" | Silent API costs, wasted cycles regenerating while user not viewing, no control | Show stale badge, let user decide when to regenerate. Consider "Regenerate All" action with cost estimate. |
| Per-file change indicators on diagram | "Show which exact files changed in each component" | Too granular for architecture view, clutters diagram, doesn't scale to large codebases | Click element → diff viewer shows all changed files for that element. Hierarchy badges show "something changed below". |
| Inline diff overlay on diagram | "Show code diff directly on diagram element" | Diagram is for architecture, not code review. Mixing concerns. Tiny text unreadable. | Separate panes: diagram on left, diff viewer on right. Clean separation of concerns. |
| Diff-based diagram generation (only show changes) | "Only generate diagrams for what changed" | Loses architectural context. Container might not change but relationships did. Incomplete picture. | Generate full diagram, highlight changed elements. Context + changes together. |

## Feature Dependencies

```
[Persistent storage (no TTL)]
    └──requires──> [Remove C4CacheService TTL checks]
                       └──requires──> [Migration strategy for existing caches]

[Auto-generate on repo add]
    └──requires──> [Persistent storage]
    └──requires──> [Cost estimate + user prompt]
    └──requires──> [Background generation queue]

[Hierarchical change indicators]
    └──requires──> [Persistent storage]
    └──requires──> [File watcher staleness tracking]
    └──enhances──> [Navigation breadcrumbs]

[Click element → diff viewer]
    └──requires──> [Element ID → file path mapping]
    └──requires──> [Git service file diff fetch]
    └──enhances──> [Existing DiffViewer component]

[Changed element highlighting]
    └──requires──> [Element ID → file path mapping]
    └──requires──> [Git diff parsing per element]
    └──requires──> [PlantUML styling injection]
    └──requires──> [Diagram regeneration]
    └──conflicts──> [Performance] (requires regeneration on every view)

[Persistent navigation state]
    └──requires──> [Persistent storage]
    └──enhances──> [Existing navigationStore persist]
```

### Dependency Notes

- **Persistent storage blocks everything:** Auto-generation, change tracking, and navigation state all assume diagrams persist. Must be first.
- **Element ID → file path mapping is critical:** Both "click to diff" and "changed element highlighting" need this. Staticized during static analysis phase (C4AnalyzerService).
- **Changed element highlighting conflicts with performance:** Requires full regeneration + git diff analysis on every view. Heavy operation. Consider deferring to v2+ or making optional "deep analysis" mode.
- **Hierarchical change indicators enhance navigation:** Breadcrumbs already exist. Adding badges to breadcrumb levels shows "Container (2 changes)" without leaving current view.

## MVP Definition

### Launch With (v1.1)

Minimum features to meet "persistent diagrams with change visualization" goal.

- [x] Persistent storage (no TTL expiration) — Essential for "always-ready diagrams"
- [x] Auto-generate diagrams on repo add with cost prompt — Users shouldn't manually trigger
- [x] Stale diagram indicators at current level — Users need to know when outdated
- [x] Click badge to regenerate stale diagram — One-click refresh
- [x] Element ID → file path mapping during static analysis — Foundation for navigation
- [x] Click element → show diff viewer — Core "diagram to diff" navigation
- [ ] Hierarchical change badges on breadcrumbs — "Bubble-up" indicators (OPTIONAL if time allows)

### Add After Validation (v1.2)

Features to add once core is proven and user feedback collected.

- [ ] Changed element visual highlighting — Requires PlantUML styling + performance testing
- [ ] Cross-level change summary in DiagramInfo — "3 containers, 12 components changed"
- [ ] Persistent navigation state improvements — Handle edge cases, better reset logic
- [ ] Background generation queue with progress — For large repos with multiple diagrams
- [ ] "Regenerate All" action with cost estimate — Bulk refresh for all stale diagrams

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Diagram generation history/versioning — View/compare previous diagram versions
- [ ] Commit-linked diagram snapshots — "Show diagram at commit abc123"
- [ ] Architecture drift detection — Compare intended vs actual architecture
- [ ] Change impact analysis — "If I change Component X, what's affected?"
- [ ] Multi-repository architecture views — Cross-repo dependency diagrams

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Persistent storage (no TTL) | HIGH | LOW | P1 |
| Auto-generate on repo add | HIGH | MEDIUM | P1 |
| Stale diagram indicators | HIGH | LOW | P1 |
| Click to regenerate | HIGH | LOW | P1 |
| Element → diff navigation | HIGH | MEDIUM | P1 |
| Element ID → file mapping | HIGH | LOW | P1 |
| Hierarchical change badges | MEDIUM | MEDIUM | P2 |
| Changed element highlighting | MEDIUM | HIGH | P2 |
| Cross-level change summary | MEDIUM | LOW | P2 |
| Persistent nav state | LOW | LOW | P2 |
| Background generation queue | MEDIUM | MEDIUM | P2 |
| Regenerate all with cost | LOW | LOW | P2 |
| Diagram history/versioning | HIGH | HIGH | P3 |
| Commit-linked snapshots | MEDIUM | HIGH | P3 |
| Architecture drift detection | HIGH | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.1 launch (persistent diagrams + change viz)
- P2: Should have for v1.2 (polish + enhancement)
- P3: Nice to have for v2+ (advanced features)

## Competitor Feature Analysis

| Feature | VS Code Extensions | IntelliJ IDEA | Hava.io | Our Approach |
|---------|-------------------|---------------|---------|--------------|
| Diagram persistence | Regenerate on view | Regenerate on view | Auto-persist, version history | Persist + staleness indicators |
| Change detection | File watcher, manual refresh | Manual refresh | Auto-detect cloud changes | File watcher + bubble-up indicators |
| Diagram-to-code nav | Click → jump to definition | Click → jump to definition | N/A (infrastructure) | Click → diff viewer (change-focused) |
| Change visualization | N/A | N/A | Diff diagrams side-by-side | Highlight + indicators + diff pane |
| Auto-generation | Manual command | Manual command | Automatic for cloud | Automatic on repo add with prompt |

**Key differentiators:**
1. **Change-first navigation:** VS Code/IntelliJ jump to current code. We jump to *what changed* in code.
2. **Hierarchical change indicators:** Competitors don't bubble up change state through architecture levels.
3. **Persistent + stale model:** Competitors regenerate on view (slow) or auto-update (expensive). We persist + show staleness (fast + cost-aware).

## Implementation Notes

### Existing Infrastructure (v1.0)

Already built and working:
- ✅ SQLite persistence (better-sqlite3, cacheService.ts)
- ✅ C4 generation pipeline (static analysis → AI → PlantUML)
- ✅ File watcher service (chokidar, FileWatcherService.ts)
- ✅ Staleness detection (generation_timestamps table)
- ✅ SVG click detection (DiagramViewer.tsx)
- ✅ Navigation system (navigationStore.ts with persist)
- ✅ Diff viewer component (DiffViewer.tsx)
- ✅ Stale badge UI (StalenessBadge.tsx)
- ✅ IPC event system ('diagram:stale' events)

### What's Missing (for v1.1)

1. **Remove TTL expiration:**
   - C4CacheService.clearExpiredEntries() should not run
   - isCacheStale() should only check file mtimes, not TTL
   - Keep TTL constants for reference but don't enforce

2. **Auto-generation on repo add:**
   - UI prompt: "Generate C4 diagrams? (Estimated cost: $0.15)"
   - Queue system: Generate Context first, then Container, Component, Code
   - Progress indicator: "Generating Container diagram (2/4)..."

3. **Element ID → file path mapping:**
   - StaticAnalyzerService already identifies files per element
   - Store in diagram_metadata JSON: `{ "elementId": "UserService", "files": ["src/services/UserService.ts"] }`
   - Query on SVG click to find relevant files

4. **Click element → diff viewer:**
   - DiagramViewer onClick: extract element ID from SVG
   - Query diagram_metadata for files
   - GitService: fetch diff for files
   - Show DiffViewer in split pane or modal

5. **Hierarchical change badges (optional):**
   - Track stale state per level in navigationStore
   - Breadcrumb components show badge if child levels stale
   - IPC 'diagram:stale' updates state tree

## Sources

### Architecture & Patterns
- [Hava - Automated Real-time Visualization of Cloud Architecture](https://www.hava.io/blog/automated-real-time-visualization-of-cloud-architecture) — MEDIUM confidence (cloud infrastructure focus)
- [vFunction - Architecture Diagram Basics & Best Practices](https://vfunction.com/blog/architecture-diagram-guide/) — MEDIUM confidence (architecture drift detection patterns)
- [Visual Studio 2026 - Mermaid Charts](https://dellenny.com/visualize-workflows-and-architecture-with-mermaid-charts-in-visual-studio-2026/) — HIGH confidence (inline diagram visualization trends)

### Change Detection & File Watching
- [Chokidar - File Watching Library](https://github.com/paulmillr/chokidar) — HIGH confidence (official docs, production-proven)
- [Git FSMonitor](https://github.com/git-for-windows/git/discussions/3251) — HIGH confidence (file watching best practices)

### UI/UX Patterns
- [VS Code - Source Control UI](https://code.visualstudio.com/docs/sourcecontrol/overview) — HIGH confidence (official docs for change indicators)
- [Badge UI Design Best Practices](https://mobbin.com/glossary/badge) — MEDIUM confidence (notification badge patterns)
- [PatternFly - Notification Badge Guidelines](https://www.patternfly.org/components/notification-badge/design-guidelines/) — HIGH confidence (design system for badges)
- [Tree View UI Patterns](https://medium.com/@hagan.rivers/interaction-design-for-trees-5e915b408ed2) — MEDIUM confidence (hierarchical state visualization)

### Storage & Persistence
- [better-sqlite3 with Electron Best Practices](https://mandeepsingh.hashnode.dev/securing-sqlite3-data-in-electronjs-persistent-and-protected-database-storage) — HIGH confidence (Electron + SQLite patterns)
- [Data Versioning Best Practices](https://lakefs.io/data-version-control/dvc-best-practices/) — MEDIUM confidence (versioning patterns for diagrams)

### Navigation Patterns
- [Visual Studio - Go To Definition](https://learn.microsoft.com/en-us/visualstudio/ide/go-to-and-peek-definition) — HIGH confidence (official docs for click-to-navigate)
- [PlantUML Versioning & History](https://plantuml.com/versioning-scheme) — HIGH confidence (official docs, v1.2026.1 current)

---
*Feature research for: Persistent C4 diagram storage with real-time change visualization*
*Researched: 2026-02-24*
*Context: Adding to existing v1.0 C4 diagram generation system (23,772 lines TypeScript, Electron + React + PlantUML)*
