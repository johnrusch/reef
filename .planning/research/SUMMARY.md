# Project Research Summary

**Project:** C4 Architecture Diagram Visualization in Reef Desktop Application
**Domain:** Desktop Application - C4 Model Diagram Generation from Code Analysis
**Researched:** 2026-02-21
**Confidence:** HIGH

## Executive Summary

C4 architecture diagrams provide hierarchical visualization of software systems through four levels: Context (system interactions), Container (deployable units), Component (logical groupings), and Code (implementation details). The recommended approach for Reef is a hybrid architecture combining static code analysis (using ts-morph for TypeScript AST parsing) with AI-powered semantic understanding (using Claude API) to generate C4-PlantUML diagram syntax, then rendering with PlantUML locally or via server.

The core value proposition is automatic C4 diagram generation from codebase analysis, maintaining freshness through intelligent cache invalidation and file change detection. This positions Reef competitively against manual tools like Structurizr and Ilograph by eliminating the burden of hand-coded DSL. However, this automation introduces critical risks: LLM hallucination of non-existent architecture, token limit truncation creating incomplete diagrams, and cache invalidation failures causing stale outputs.

The mitigation strategy centers on hybrid generation (static analysis provides deterministic structure, AI enriches with insights), progressive context loading (prioritize critical files within token budgets), and level-aware caching (Context diagrams cache longer than Code diagrams). Success depends on strict C4 level validation, transparent coverage metrics showing users what percentage of codebase was analyzed, and robust drill-down navigation maintaining element ID consistency across hierarchy levels.

## Key Findings

### Recommended Stack

Reef already has most infrastructure in place, requiring only strategic additions. The core C4 framework is C4-PlantUML (included via `!include` directives, not an npm package), which provides standardized macros for all four C4 levels with 127+ verified code examples. PlantUML rendering tools (plantuml-encoder@1.4.0, node-plantuml@0.9.0) are already installed. The critical additions are ts-morph@27.0.2 for deterministic TypeScript structure extraction and dependency-cruiser@17.3.8 for dependency graph visualization.

**Core technologies:**
- **C4-PlantUML**: Industry standard for C4-as-code with high source reputation (Context7 verified, 127+ snippets)
- **ts-morph@27.0.2**: Best-in-class TypeScript AST parsing for deterministic structure extraction (790 Context7 snippets, 76.3 benchmark score, 70-80% faster in 2026)
- **dependency-cruiser@17.3.8**: Current standard for dependency graph visualization (977K weekly downloads, outputs dot/GraphViz for C4 Container/Component insights)
- **@anthropic-ai/sdk@0.78.0**: Upgrade needed from 0.59.0 for latest improvements; use for architectural insights and C4 narrative generation
- **node-plantuml@0.9.0**: Already installed; enables local diagram rendering without external server dependency
- **plantuml-encoder@1.4.0**: Already installed; converts PlantUML text to encoded format

**Installation requirements:**
```bash
npm install ts-morph@^27.0.2 dependency-cruiser@^17.3.8
npm install @anthropic-ai/sdk@^0.78.0  # upgrade from 0.59.0
```

**Critical stack decisions:**
- Use C4-PlantUML over Mermaid.js (Mermaid C4 is experimental with poor layout control, multiple open GitHub issues)
- Prefer hybrid generation (Pattern 1: ts-morph + dependency-cruiser + Claude) over pure AI (lower costs, deterministic structure, faster) or pure static (no semantic understanding)
- Use async IPC (ipcRenderer.invoke) over deprecated synchronous patterns
- Avoid @electron/remote (deprecated, performance overhead)

### Expected Features

The C4 diagram feature landscape distinguishes between table stakes (users expect these), differentiators (competitive advantage), and anti-features (commonly requested but problematic).

**Must have (table stakes):**
- All 4 C4 levels generated (Context, Container, Component, Code) — core C4 requirement, cannot market as "C4 diagrams" without this
- Hierarchical drill-down navigation (double-click element) — fundamental C4 concept
- Visual indicators for navigable elements — essential for usability
- Tier-based element ordering — prevents unreadable spaghetti layouts; research shows declaration order affects PlantUML layout algorithm
- Zoom, pan, fullscreen — already implemented in Reef
- Export PNG/SVG — already implemented
- Element metadata (type labels) — prevents ambiguity about whether something is a System, Container, or Component
- System boundary grouping — core C4 visual requirement

**Should have (competitive advantage):**
- AI-powered automatic generation from code analysis — Reef's core differentiator; competitors (Structurizr, Ilograph) require manual DSL coding
- Automatic regeneration on file changes — keeps diagrams current; already implemented via file change detection, needs C4-aware extension
- Hybrid approach (static + AI) — better quality than pure AI, less manual than pure static
- Multi-level caching with 15min TTL like Firecrawl — already implemented; extend with level-specific caching (Context caches days, Code caches hours)
- Context-aware element selection — already implemented in ContextExtractorService; prioritizes critical files for token limits
- Dark theme — already implemented

**Defer (v2+):**
- Multi-repository combined diagrams — complexity vs value unclear; diagram cross-repo dependencies adds significant complexity
- Sequence diagrams from C4 elements — different use case; defer until C4 static diagrams proven
- Custom element styling/themes — low ROI; default C4 colors sufficient
- Collaboration features (comments, annotations) — requires backend infrastructure

**Anti-features to avoid:**
- Manual diagram editing — diagrams become stale immediately, defeats auto-generation purpose; focus on improving AI prompts instead
- Too many abstraction levels — adding "sub-components" or "subsystems" reintroduces the chaos C4 aims to solve
- Showing external system internals — creates coupling and volatility; show boundaries only
- Everything as a single diagram — unreadable, overwhelming; use focused diagrams with drill-down

### Architecture Approach

The recommended architecture follows Electron's multi-process model with a clear service layer separation. The Diagram Generation Orchestrator coordinates the workflow: code analysis → AI generation → caching → rendering. This orchestrator manages C4 level hierarchy (Context→Container→Component→Code), handles state transitions between levels, and coordinates the three main services.

**Major components:**
1. **C4HierarchyService** (NEW) — Manages state machine for C4 level transitions, maintains parent-child relationships between diagrams, implements drill-down/drill-up logic with breadcrumb navigation
2. **Code Analysis Service** (EXTEND) — Scans repository, prioritizes files (critical/important/optional), extracts relevant code context within token budgets; add optional AST parsing via ts-morph for deterministic structure
3. **DiagramGeneratorService** (EXTEND) — Converts code context into C4-PlantUML syntax using Claude API; add level-specific prompts (separate prompts for Context, Container, Component, Code levels)
4. **CacheService** (EXTEND) — Stores/retrieves diagrams with hash-based invalidation; extend with level-aware caching (Context TTL: days, Container TTL: hours, Component/Code TTL: 15min)
5. **PlantUMLService** (EXISTS) — Converts PlantUML text to SVG; already implemented, no changes needed

**Key architectural patterns:**
- **Pattern 1: Hybrid Code Analysis** — Combine deterministic static analysis (ts-morph extracts classes, imports, dependencies) with AI enrichment (Claude identifies architectural relationships and semantic groupings). Pros: Lower AI costs, faster generation, deterministic structure. Cons: More complex implementation.
- **Pattern 2: C4 Hierarchy State Machine** — Manage transitions between C4 levels with parent-child relationships. Each C4HierarchyNode stores level, elementId, parentId, diagram, metadata, and children references. Enables coherent drill-down navigation and efficient regeneration of specific levels.
- **Pattern 3: Cache-First Generation with Invalidation** — Check cache before expensive AI generation using hash from critical files + settings. Generate cacheKey as `${repoHash}-${level}-${focusArea}`. Store metadata (timestamp, tokensUsed, coverage %) with each cached diagram.
- **Pattern 4: Progressive Context Loading** — Load code in priority order (critical → important → optional) up to token budget. Critical files always included if under budget, then important, then optional until budget exhausted.

**Data flow:**
User selects settings → IPC → Orchestrator → Check cache (cache hit = return) → (cache miss) → Context extraction → AI generation → Store cache → PlantUML rendering → SVG → IPC → Display

### Critical Pitfalls

Research identified seven critical pitfalls from C4 implementation case studies, LLM research papers, PlantUML community issues, and analysis of Reef's existing implementation.

1. **Mixing C4 Abstraction Levels** — Developers confuse the four C4 levels, putting database schemas (Component level) on Context diagrams, or treating containers and components interchangeably. **Prevention:** Enforce strict type checking in prompts, add validation checking elements match expected abstraction level, create separate generation functions per C4 level. **Phase:** Phase 1 (C4 Foundation).

2. **LLM Hallucination of Non-Existent Architecture** — AI generates plausible-looking diagrams with components, relationships, or patterns that don't exist in the codebase. Every LLM hallucinates to some extent. **Prevention:** Implement hybrid generation (static analysis baseline + AI enrichment), use RAG approach with verified data, add three-layer validation (input controls, better prompts, output cross-checking), track element confidence levels. **Phase:** Phase 1 (C4 Foundation).

3. **Token Limit Truncation Creating Incomplete Diagrams** — Large codebases exceed LLM context windows, forcing severe truncation. Users see partial architecture assuming it's complete. Reef's 15,000 token target may only capture 10-20% of enterprise codebases. **Prevention:** Implement intelligent chunking with architectural awareness, use semantic search for critical boundaries, show explicit warnings ("Diagram from X% of codebase"), generate focused per-module diagrams for large codebases, cache architectural structure separately from full code. **Phase:** Phase 1 (Coverage metrics), Phase 3 (Focused extraction per level).

4. **Cache Invalidation Failures Causing Stale Diagrams** — Diagrams cached for performance but invalidation doesn't fire when code changes, or fires too frequently causing expensive regeneration. File change detection can miss indirect impacts. **Prevention:** Implement granular level-aware caching (Context caches days, Code caches hours), use hybrid TTL + event-driven invalidation, track dependency mappings (which files influence which diagrams), add freshness indicator in UI, provide manual "Regenerate" button. **Phase:** Phase 2 (Automatic Regeneration).

5. **PlantUML Rendering Failures with Large/Complex Diagrams** — AI generates valid PlantUML syntax but rendering fails due to timeout, memory issues, or unintelligible spaghetti layouts. **Prevention:** Add layout directives to generated code (LAYOUT_* macros, left-to-right/top-to-bottom hints), limit element count per diagram (Context: 10-12, Container: 15-20, Component: 20-25), auto-split large architectures into focused diagrams, configure PlantUML memory (-Xmx1024m), add timeout detection with simplified fallback. **Phase:** Phase 1 (Element limits), Phase 4 (Progressive rendering).

6. **C4-PlantUML Library Not Available/Configured** — AI generates C4-PlantUML syntax but PlantUML server doesn't have C4 library installed or accessible. Rendering fails with "undefined legend colors" or missing macro errors. **Prevention:** Verify PlantUML server has C4 library during setup, always include proper imports (`!include <C4/C4_Context>`), version-pin PlantUML and C4-PlantUML, add validation before rendering, provide clear error messages, document setup requirements. **Phase:** Phase 1 (C4 Foundation).

7. **Broken Drill-Down Navigation Between C4 Levels** — Users click Container in Context diagram but navigation fails, goes to wrong diagram, or loads different container due to inconsistent element IDs across levels. **Prevention:** Establish strict ID schema (slugified names as stable identifiers), store hierarchy metadata mapping Context elements to Container diagrams, generate drill-down links during creation, add breadcrumb navigation, validate link targets exist, consider generating all 4 levels in single pass for consistency. **Phase:** Phase 3 (Hierarchy Navigation).

## Implications for Roadmap

Based on research findings, a four-phase structure is recommended, ordered to reduce risk and validate assumptions early while building on Reef's existing infrastructure.

### Phase 1: C4 Foundation (2-3 weeks)
**Rationale:** Establish core C4 generation capability with proper level separation before building navigation hierarchy. Must solve hallucination and validation problems first or all downstream features inherit these defects. Builds on existing DiagramGeneratorService and ContextExtractorService.

**Delivers:**
- All 4 C4 levels generated (Context, Container, Component, Code) with level-specific prompts
- Hybrid generation combining ts-morph static analysis with Claude AI enrichment
- Validation preventing abstraction level mixing
- Element count limits preventing rendering failures
- Coverage metrics showing what percentage of codebase was analyzed
- C4-PlantUML library verification and proper imports

**Addresses from FEATURES.md:**
- All 4 C4 levels generation (must-have)
- Element metadata labels (must-have)
- System boundary grouping (must-have)
- AI-powered diagram generation (differentiator)
- Hybrid approach static + AI (differentiator)

**Avoids from PITFALLS.md:**
- Pitfall 1: Mixing C4 abstraction levels (level-specific prompts + validation)
- Pitfall 2: LLM hallucination (hybrid approach with static baseline)
- Pitfall 3: Token limit truncation (coverage metrics, warnings)
- Pitfall 5: PlantUML rendering failures (element limits)
- Pitfall 6: Missing C4-PlantUML library (setup verification)

**Uses from STACK.md:**
- C4-PlantUML (include directives)
- ts-morph@27.0.2 (static analysis)
- dependency-cruiser@17.3.8 (dependency graphs)
- @anthropic-ai/sdk@0.78.0 (upgrade from 0.59.0)

**Implements from ARCHITECTURE.md:**
- Pattern 1: Hybrid Code Analysis (static + AI)
- Pattern 3: Cache-First Generation (extend existing CacheService)
- Pattern 4: Progressive Context Loading (extend existing ContextExtractorService)

### Phase 2: Automatic Regeneration (1-2 weeks)
**Rationale:** Leverage Reef's existing file change detection to keep diagrams current automatically. This is a core differentiator vs manual tools (Structurizr, Ilograph require manual DSL updates). Must implement intelligent invalidation to avoid stale diagrams (critical user trust issue) while preventing expensive over-regeneration.

**Delivers:**
- Level-aware cache invalidation (Context caches days, Code caches hours)
- File change pattern detection triggering diagram-specific invalidation
- Dependency mapping (which files affect which diagrams)
- Freshness indicators in UI (timestamp, code version, coverage %)
- Manual "Regenerate" override button
- Background regeneration with progress indicator

**Addresses from FEATURES.md:**
- Automatic regeneration on file changes (differentiator, already partially implemented)
- Multi-level caching (differentiator, extend existing 15min cache)
- Dark theme optimized (already implemented, ensure regeneration UI matches)

**Avoids from PITFALLS.md:**
- Pitfall 4: Cache invalidation failures (level-aware TTL + event-driven invalidation)

**Uses from STACK.md:**
- Reef's existing CacheService (extend with level-specific logic)
- Reef's existing file change detection (add C4-aware triggers)

**Implements from ARCHITECTURE.md:**
- Pattern 3: Cache-First Generation with Invalidation (intelligent invalidation strategy)

### Phase 3: Hierarchy Navigation (2-3 weeks)
**Rationale:** Drill-down navigation is fundamental to C4's value proposition (Context→Container→Component→Code). This phase has high complexity due to element ID consistency requirements across levels and parent-child relationship tracking. Builds on Phase 1's validated C4 generation and Phase 2's caching infrastructure.

**Delivers:**
- C4HierarchyService managing state machine for level transitions
- Element ID schema ensuring consistency across levels (slugified stable identifiers)
- Clickable diagram elements with PlantUML hyperlink syntax
- Breadcrumb navigation showing current position in hierarchy
- Drill-down (Context→Container) and drill-up (Container→Context) navigation
- Visual indicators showing which elements are drillable
- DiagramStore (Zustand) for hierarchy state management
- useC4Navigation hook for navigation logic

**Addresses from FEATURES.md:**
- Hierarchical drill-down navigation (must-have, core C4 concept)
- Visual indicators for navigable elements (must-have)
- Clickable elements with metadata (differentiator)
- Model-based approach (differentiator, single source of truth)

**Avoids from PITFALLS.md:**
- Pitfall 7: Broken drill-down navigation (strict ID schema, hierarchy metadata, link validation)

**Uses from STACK.md:**
- C4-PlantUML hyperlink support
- Reef's existing Zustand stores (add diagramStore)

**Implements from ARCHITECTURE.md:**
- Pattern 2: C4 Hierarchy State Machine (full implementation)
- New C4HierarchyService component
- New C4Navigator UI component
- New useC4Navigation hook

### Phase 4: Polish & Advanced Features (1-2 weeks)
**Rationale:** After core C4 generation, caching, and navigation are proven, polish the UX and add performance optimizations. These features improve user experience but aren't blocking for MVP validation. Can be prioritized based on user feedback from Phases 1-3.

**Delivers:**
- Diagram thumbnails/list view for quick switching
- Quick navigation dialog (keyboard shortcut to jump to any diagram)
- Search/filter diagrams by element name or type
- Keyboard navigation (arrow keys for prev/next diagram)
- Tooltips on hover for element details
- Progressive rendering for large SVGs (>2MB)
- Performance optimization (parallel rendering, pre-rendering common diagrams)
- Error recovery improvements (graceful fallbacks, specific error messages)

**Addresses from FEATURES.md:**
- Diagram thumbnails/list (table stakes, deferred to v1.x)
- Quick navigation dialog (v1.x feature)
- Search/filter diagrams (v1.x feature)
- Keyboard navigation (v1.x feature)

**Avoids from PITFALLS.md:**
- Performance issues with large codebases (caching at multiple layers, lazy loading)
- UX confusion (metadata displays, legends, export features)

**Uses from STACK.md:**
- PlantUML Server Docker (optional, for offloading rendering if needed)

### Phase Ordering Rationale

1. **Phase 1 before Phase 3:** Must establish validated C4 generation with proper level separation before building navigation hierarchy. Cannot navigate between levels if level mixing occurs or hallucination creates inconsistent diagrams.

2. **Phase 2 before Phase 3:** Cache invalidation strategy must be solid before implementing drill-down navigation which generates multiple related diagrams (Context + N Containers + M Components). Without intelligent invalidation, navigation creates cache explosion or stale child diagrams.

3. **Phase 3 before Phase 4:** Polish features like thumbnails and search assume working hierarchy navigation. Cannot search across diagrams if drill-down is broken.

4. **Hybrid generation in Phase 1, not Phase 4:** Hallucination mitigation must be built into foundation. Retrofitting static analysis baseline after AI-only implementation is expensive and breaks caching.

**Dependency chain:**
```
Phase 1 (validated C4 levels)
  → Phase 2 (smart caching)
    → Phase 3 (hierarchy navigation)
      → Phase 4 (polish)
```

**Risk reduction strategy:**
- Phase 1 addresses the three highest-risk pitfalls (hallucination, level mixing, token truncation)
- Phase 2 addresses the critical user trust issue (stale diagrams)
- Phase 3 tackles the complex navigation before polish
- Phase 4 defers nice-to-haves until core validated

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1:** C4-specific prompt engineering likely needs experimentation to get level-specific prompts right. Budget 2-3 days for prompt iteration and validation. Review C4-PlantUML syntax examples (127 snippets in Context7).

- **Phase 3:** PlantUML hyperlink syntax and click detection may need research if not well-documented. Check PlantUML server clickable region support.

Phases with standard patterns (skip research-phase):

- **Phase 2:** Cache invalidation patterns well-documented; Reef already implements file change detection. No additional research needed.

- **Phase 4:** UI patterns (thumbnails, search, keyboard nav) are standard. No domain-specific research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | C4-PlantUML verified via Context7 (127 snippets), ts-morph via Context7 (790 snippets), npm registry versions checked 2026-02-21, all dependencies compatible with Reef's existing tech stack (Electron 38, TypeScript 5.3.3, Node 22) |
| Features | **HIGH** | Feature landscape based on official C4 model documentation, competitor analysis (Structurizr, Ilograph), Simon Brown's 2024 GOTO talk, David R Oliver's 2026 layout research, Helen Purchase's graph drawing aesthetics research |
| Architecture | **HIGH** | Patterns verified from official C4 model docs, AI-assisted architecture research (88% accuracy with AST+LLM), ArchAgent research paper, Reef's existing implementation provides proven infrastructure (IPC, caching, file change detection) |
| Pitfalls | **HIGH** | Based on official C4 model misconceptions documentation, LLM hallucination research (multiple 2025 sources), PlantUML community issues (GitHub, forums), token limit engineering (multiple authoritative sources), cache invalidation best practices |

**Overall confidence:** HIGH

All four research areas reached HIGH confidence through triangulation of multiple high-quality sources: Context7 verified code libraries, official documentation, recent research papers (2024-2026), and analysis of Reef's existing implementation. No reliance on single sources or speculation.

### Gaps to Address

While overall confidence is high, three areas need attention during implementation:

- **C4-specific prompt engineering:** Research provides general prompt patterns but exact prompts for each C4 level (Context, Container, Component, Code) will require iteration during Phase 1. Budget time for experimentation. Validate with sample codebases of varying sizes.

- **PlantUML layout optimization for AI-generated code:** Research confirms declaration order affects layout algorithm and provides general guidance (tier-based ordering: actors → UI → API → services → data), but specific LAYOUT_* macro usage for best results may require trial-and-error. Monitor for spaghetti layouts during Phase 1 and adjust.

- **Token budget optimization for different codebase sizes:** Research recommends 15,000 token target (already in Reef) but this may need tuning based on real-world usage. Small codebases (<50 files) may benefit from higher limits; large codebases (>500 files) may need focused extraction strategies. Collect metrics during Phase 1 to inform Phase 3 focused extraction.

**Validation strategy during implementation:**
- Phase 1: Test with Reef's own codebase (156 files, known architecture) to validate accuracy
- Phase 1: Test with small (10 files), medium (50 files), large (200 files) sample repos to validate token budgets
- Phase 2: Monitor cache hit rates and invalidation correctness over 2-week period
- Phase 3: User testing of drill-down navigation flow (measure click-to-diagram latency, confusion points)

## Sources

### Primary (HIGH confidence)

**Context7 — verified code libraries and examples:**
- /plantuml-stdlib/c4-plantuml — C4 syntax, macros, examples (127 snippets)
- /dsherret/ts-morph — TypeScript AST parsing, project setup, dependency resolution (790 snippets, 76.3 benchmark score)

**Official Documentation:**
- [C4 Model Official Site](https://c4model.com/) — C4 methodology, levels, tooling comparison, misconceptions
- [C4-PlantUML GitHub](https://github.com/plantuml-stdlib/C4-PlantUML) — Standard library, releases, examples
- [PlantUML Server Deployment](https://deepwiki.com/plantuml/plantuml-server/5-deployment) — Docker, Kubernetes, production patterns
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc) — Best practices (ipcRenderer.invoke)

**npm Registry — versions verified 2026-02-21:**
- [ts-morph@27.0.2](https://www.npmjs.com/package/ts-morph) — Published 4 months ago
- [dependency-cruiser@17.3.8](https://www.npmjs.com/package/dependency-cruiser) — Published 11 days ago, 977K weekly downloads
- [@anthropic-ai/sdk@0.78.0](https://www.npmjs.com/package/@anthropic-ai/sdk) — Published 2 days ago
- [node-plantuml@0.9.0](https://www.npmjs.com/package/node-plantuml) — Published 6 years ago (stable, no issues)
- [plantuml-encoder@1.4.0](https://www.npmjs.com/package/plantuml-encoder) — Published 6 years ago (stable, no issues)

### Secondary (MEDIUM confidence)

**Automated C4 Generation Research:**
- [AI-Assisted Software Architecture](https://www.workingsoftware.dev/ai-assisted-software-architecture-generating-the-c4-model-and-views-directly-from-code/) — LLM-based C4 generation, 88% accuracy with AST+LLM approach
- [ArchAgent Research](https://arxiv.org/html/2601.13007) — Scalable architecture recovery with LLMs
- [C4InterFlow](https://www.c4interflow.com/) — Framework for automated C4 generation

**C4 Best Practices & Pitfalls:**
- Simon Brown GOTO 2024 talk — "C4 Model: Misconceptions, Misuses & Mistakes"
- [Misuses and Mistakes of the C4 model](https://www.workingsoftware.dev/misuses-and-mistakes-of-the-c4-model/)
- [C4 Model Diagrams: Practical Tips](https://revision.app/blog/practical-c4-modeling-tips)

**LLM Hallucination & Validation:**
- [LLM Hallucinations in 2025: Guide](https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models)
- [AI Hallucination Examples](https://www.evidentlyai.com/blog/llm-hallucination-examples)
- [LLM Hallucination Detection](https://www.datadoghq.com/blog/ai/llm-hallucination-detection/)

**Token Limits & Context Management:**
- [AI Context Windows: Engineering Around Token Limits](https://www.kinde.com/learn/ai-for-software-engineering/best-practice/ai-context-windows-engineering-around-token-limits-in-large-codebases/)
- [Code Maps: Blueprint Codebases for LLMs](https://origo.prose.sh/code-maps)
- [Context Window Problem: Scaling Agents Beyond Token Limits](https://factory.ai/news/context-window-problem)

**Cache Invalidation:**
- [Cache Invalidation Strategies](https://www.designgurus.io/blog/cache-invalidation-strategies)
- [How to Build Cache Invalidation Strategies](https://oneuptime.com/blog/post/2026-01-30-cache-invalidation-strategies/view)
- [Automatic Diagram Generation for Always-Accurate Diagrams](https://www.pulumi.com/blog/automating-diagramming-in-your-ci-cd/)

**PlantUML Integration:**
- [PlantUML Performance Issues](https://forum.plantuml.net/5882/performance-issue)
- [The Hitchhiker's Guide to PlantUML - C4 Section](https://crashedmind.github.io/PlantUMLHitchhikersGuide/C4/c4.html)

**Layout & UX:**
- David R Oliver (2026) — "Why Your AI-Generated C4 Diagrams Look Terrible" (edge crossings are #1 readability factor)
- Helen Purchase (University of Queensland) — Graph drawing aesthetics research
- [Graph Visualization UX](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/)

### Tertiary (LOW confidence — general background)

**Competitor Tools:**
- [Structurizr Documentation](https://docs.structurizr.com/ui/diagrams/navigation) — Market leader navigation patterns
- [Ilograph Features](https://www.ilograph.com/features.html) — Interactive diagram features
- [C4 model tools comparison](https://icepanel.io/blog/2025-08-28-top-9-tools-for-c4-model-diagrams) — 2025 tooling landscape

**Community Resources:**
- Medium/Reddit discussions on C4 tooling
- GitHub community examples and issues
- Stack Overflow C4-PlantUML questions

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
