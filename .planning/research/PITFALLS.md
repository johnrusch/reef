# Pitfalls Research

**Domain:** C4 Architecture Diagram Generation for Desktop Applications
**Researched:** 2026-02-21
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Mixing C4 Abstraction Levels

**What goes wrong:**
Developers confuse the four C4 levels and mix abstractions in the same diagram—putting database schemas (Component level) on Context diagrams (Level 1), or showing internal implementation details of external systems, or treating containers and components interchangeably.

**Why it happens:**
Modern software systems have many different types of compile-time, runtime, deployment, and infrastructure building blocks which can be difficult to categorize into C4's hierarchical abstractions. Teams misunderstand that a "container" is a *deployable unit* (SPA, microservice, database) while a "component" is a *non-deployable element inside a container*.

**How to avoid:**
- Enforce strict type checking in diagram generation prompts—explicitly define which C4 level is being generated
- Add validation that checks diagram elements match the expected abstraction level
- Create separate generation functions for each C4 level with level-specific prompts
- Before accepting generated diagrams, validate that Context shows only systems/actors, Container shows only deployable units, Component shows only logical groupings within containers, and Code shows only implementation

**Warning signs:**
- Prompts that don't explicitly specify C4 level
- Generated diagrams showing database tables in system context views
- External systems with internal component details exposed
- Mixing runtime units (containers) with organizational units (packages, modules, namespaces)

**Phase to address:**
Phase 1 (C4 Foundation) - Build level-specific generation with strict validation from the start

---

### Pitfall 2: LLM Hallucination of Non-Existent Architecture

**What goes wrong:**
AI generates plausible-looking architecture diagrams that include components, relationships, or patterns that don't actually exist in the codebase. The diagram looks professional and convincing but represents a fictional architecture.

**Why it happens:**
LLMs predict what's most likely to follow rather than what's guaranteed to be true, prioritizing fluent phrasing over factual accuracy. Every current large language model hallucinates to some extent—the difference lies in frequency and severity. When context is incomplete or niche information is absent from training data, models fill gaps with probable-but-incorrect architectural patterns.

**How to avoid:**
- Implement hybrid generation: static code analysis for deterministic structure + AI for architectural insights/labels
- Use RAG (Retrieval-Augmented Generation): first extract actual code structure, then generate diagram based on verified data
- Add three-layer validation: (A) input controls that optimize context, (B) design layer with better prompts, (C) output validation that cross-checks generated elements against extracted code structure
- Track which elements come from static analysis (high confidence) vs. AI inference (lower confidence)
- When generating from limited context, explicitly prompt: "Only include elements visible in the provided code. Mark inferred relationships as tentative."

**Warning signs:**
- Diagrams show common patterns (MVC, layered architecture) when codebase uses different structure
- Relationships between components that don't actually interact
- Technology stack elements not present in package.json or dependencies
- Generic component names that don't match actual codebase naming conventions
- Diagrams that look "too clean" compared to actual messy code

**Phase to address:**
Phase 1 (C4 Foundation) - Implement static analysis baseline before adding AI enrichment

---

### Pitfall 3: Token Limit Context Truncation Creating Incomplete Diagrams

**What goes wrong:**
Large codebases exceed LLM context windows, forcing severe truncation of code context. The AI generates diagrams based on only 10-20% of the actual codebase, missing critical components, relationships, and architectural patterns. Users assume they're seeing the full architecture when they're seeing a partial, misleading view.

**Why it happens:**
A typical enterprise monorepo spans thousands of files and several million tokens. Model attention is not uniform across long sequences—research shows performance grows increasingly unreliable as input length grows. Reef's current implementation uses a 15,000 token target (60KB of code) which may only capture a small portion of the architecture. The existing file prioritization (critical/important/optional) helps but can still miss essential architectural context.

**How to avoid:**
- Implement intelligent code chunking with architectural awareness (not just file-size chunking)
- Use semantic search and dependency analysis to identify truly critical architectural boundaries
- Show users explicit warnings: "Diagram generated from X% of codebase (Y files out of Z total)"
- For large codebases, generate multiple focused diagrams (per-module C4 hierarchies) rather than one incomplete overview
- Cache extracted architectural structure (dependency graph, component boundaries) separately from full code
- Consider iterative refinement: generate initial diagram, then do focused extraction for specific areas
- Track token usage metadata: store what was included/excluded for each diagram generation

**Warning signs:**
- Diagrams always showing roughly the same complexity regardless of codebase size
- Critical architectural layers (e.g., entire API layer) missing from diagrams
- User reports of "my service X isn't shown" when service X exists
- Token budget consistently maxed out (hitting 15,000 limit)
- No feedback showing how much of codebase was analyzed

**Phase to address:**
Phase 1 (C4 Foundation) - Add context coverage metrics and warnings; Phase 3 (Hierarchy Navigation) - Implement focused extraction per C4 level

---

### Pitfall 4: Cache Invalidation Failures Causing Stale Diagrams

**What goes wrong:**
Diagrams are cached for performance but cache invalidation doesn't fire when code changes, or fires too frequently causing expensive regeneration. Users see outdated architecture that no longer matches the current codebase. Manual documentation approaches become obsolete the moment something changes—automated diagrams promise to solve this but fail if caching logic is wrong.

**Why it happens:**
Cache invalidation is notoriously difficult. File change detection can miss indirect impacts (changing interface used by 10 components should invalidate all 10 component diagrams). Git status monitoring is coarse-grained (any file change triggers full regeneration wastes money/time). Reef already has file change detection but needs intelligent invalidation strategy per C4 level—Context diagrams rarely change, Code diagrams change frequently.

**How to avoid:**
- Implement granular, level-aware caching: Context diagrams cache for days/weeks, Code diagrams cache for hours
- Use hybrid invalidation: TTL-based (each diagram has expiration) + event-driven (specific file patterns trigger specific diagram invalidation)
- Track dependency mappings: which source files influence which diagram elements
- Add "freshness" indicator in UI showing when diagram was last generated and what code version it reflects
- Provide manual "Regenerate" button as escape hatch when auto-invalidation fails
- For large codebases, use change stream monitoring that tracks specific changes affecting diagram (e.g., new files in /services/ invalidates Container diagram)

**Warning signs:**
- Diagram shows deleted components that no longer exist
- New services/modules not appearing until manual refresh
- Cache hit rate near 100% even as code changes frequently
- Cache hit rate near 0% causing excessive regeneration costs
- No timestamp/version metadata stored with cached diagrams
- Single global cache key instead of per-level, per-repository keys

**Phase to address:**
Phase 2 (Automatic Regeneration) - Design entire phase around intelligent invalidation

---

### Pitfall 5: PlantUML Rendering Failures with Large/Complex Diagrams

**What goes wrong:**
AI generates valid PlantUML syntax but rendering fails due to timeout, memory issues, or visual layout becoming unintelligible spaghetti. Diagrams with 15+ elements show randomly scattered boxes with relationships crossing each other like tangled wires. Large diagrams (20,000 x 10,000 pixels) cause memory errors or server timeouts.

**Why it happens:**
PlantUML's automatic layout algorithm struggles with complex graphs—AI can generate instructions the layout engine cannot act on. Performance issues exist with certain JRE versions. Layout directives in generated code may conflict. Reef uses PlantUML server which can timeout on complex diagrams. The problem: AI gives logical structure but PlantUML requires spatial layout hints.

**How to avoid:**
- Add layout directives to AI-generated code: use C4-PlantUML's LAYOUT_* macros, explicit left-to-right/top-to-bottom hints
- Limit element count per diagram: Context (max 10-12 systems), Container (max 15-20 containers), Component (max 20-25 components)
- For large architectures, auto-split into multiple focused diagrams rather than one giant diagram
- Configure PlantUML memory: `-Xmx1024m` JVM parameter for large diagrams
- Add timeout detection and fallback: if rendering takes >10s, offer simplified version
- Pre-validate layout complexity before sending to renderer: count elements, relationships, estimate rendering difficulty
- Use C4-PlantUML library which provides better defaults than raw PlantUML for architectural diagrams
- Consider progressive disclosure: overview diagram with drill-down to detailed sub-diagrams

**Warning signs:**
- Diagram generation succeeds but rendering times out
- "spaghetti" layouts where relationships cross chaotically
- Memory errors in PlantUML server logs
- Diagrams too large to view/export (>10MB SVG files)
- Elements overlapping or positioned off-canvas
- Broken image icons in UI instead of rendered diagrams

**Phase to address:**
Phase 1 (C4 Foundation) - Build element limits and layout validation; Phase 4 (Polish) - Add progressive rendering and fallbacks

---

### Pitfall 6: C4-PlantUML Library Not Available/Configured

**What goes wrong:**
AI generates C4-PlantUML syntax (`!include C4_Context.puml`, `System()`, `Container()` macros) but PlantUML server doesn't have C4 library installed or can't access it. Rendering fails with syntax errors or missing macro definitions. Users see "undefined legend colors" errors or generic PlantUML errors.

**Why it happens:**
C4-PlantUML is a separate library from standard PlantUML—requires explicit inclusion via `!include <C4/C4_Context>` or URL imports. Different PlantUML versions have different C4 library versions. Some features require minimum PlantUML version (e.g., dynamic legend colors needs v1.2021.6+). Reef's current prompts don't enforce C4-specific syntax, just generic PlantUML.

**How to avoid:**
- Verify PlantUML server has C4 library during initial setup—add health check endpoint
- Update AI prompts to always include proper C4 imports: `!include <C4/C4_Context>` at diagram start
- Version-pin both PlantUML and C4-PlantUML library to known-good combination
- Add validation step: before sending to renderer, check for required C4 macros and imports
- Provide clear error messages: "C4 library not available" instead of cryptic syntax error
- Document PlantUML server setup requirements in deployment/development docs
- Consider bundling local C4 library files as fallback if remote includes fail

**Warning signs:**
- Syntax errors mentioning `System()`, `Container()`, `Component()` macros
- "HIDE_STEREOTYPE" procedure errors
- Diagrams render with raw PlantUML syntax visible instead of C4 formatting
- "undefined legend colors" messages
- Diagrams using C4 elements but missing color coding and standardized layouts

**Phase to address:**
Phase 1 (C4 Foundation) - Setup verification and import templates at project start

---

### Pitfall 7: Broken Drill-Down Navigation Between C4 Levels

**What goes wrong:**
Users click on a Container in Context diagram expecting to drill down to Component view, but navigation fails—either clicking does nothing, navigates to wrong diagram, or loads diagram for different container. The hierarchical navigation that makes C4 valuable becomes frustrating broken experience.

**Why it happens:**
Linking diagrams requires consistent element IDs across C4 levels. AI generates each level independently without coordination—"UserService" container in Context becomes "User-Service" in Container diagram due to inconsistent naming. No metadata tracks which Container diagram corresponds to which Context element. PlantUML supports clickable links but requires explicit URL/reference syntax that AI may not generate consistently.

**How to avoid:**
- Establish strict ID schema: use slugified names as stable identifiers across all levels
- Store diagram hierarchy metadata: map each Context element to its Container diagram, each Container to Components
- Generate drill-down links during diagram creation: embed clickable URLs in PlantUML elements
- Add breadcrumb navigation showing current position in C4 hierarchy
- Validate link targets exist before generating clickable elements
- Consider generating all 4 levels together in single pass to ensure consistency
- UI should handle missing drill-down gracefully: "Component view not yet generated for this container"

**Warning signs:**
- Element names differ between levels (capitalization, spacing, special chars)
- Click handlers on diagram elements don't trigger navigation
- Navigation goes to random/wrong diagrams
- No visual indication which elements are clickable
- Breadcrumbs showing wrong hierarchy position
- Dead-end diagrams with no way to navigate back up the hierarchy

**Phase to address:**
Phase 3 (Hierarchy Navigation) - Core feature requiring careful design

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping static analysis, using AI-only generation | Faster implementation, simpler code | High hallucination risk, inaccurate diagrams, user distrust | Never—hybrid approach is essential |
| Single global cache for all diagram types | Simple cache implementation | Inappropriate invalidation (Context changes as often as Code), storage waste | Only for MVP/prototype, must refactor in Phase 2 |
| Hardcoded 15k token limit without user control | Predictable costs, simple UX | Misses critical context in large codebases, can't adapt to codebase size | Only during Phase 1, add configurability in Phase 2 |
| Using Haiku model for all generations | Lower API costs | Lower quality architectural insights, more hallucinations | Acceptable for MVP if budget-constrained, offer Sonnet/Opus in settings |
| Generating one diagram per C4 level (no focused sub-diagrams) | Simpler generation logic | Diagrams too complex for large systems, poor UX | Acceptable for small-medium codebases (<50 files), blocks enterprise use |
| No element count limits | Faster to implement | Rendering timeouts, unreadable spaghetti diagrams | Never—limits are critical for stability |
| Manual diagram refresh only | Simpler implementation, no cache invalidation logic | Diagrams become stale immediately, defeats automation value | Only for MVP, auto-refresh is core value prop |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PlantUML Server | Assuming PlantUML server supports all syntax/libraries | Verify C4 library availability, version-pin PlantUML, test rendering during setup |
| Claude API | Exceeding context limits without warnings | Track token counts, show coverage %, truncate gracefully with user notification |
| File System Monitoring | Watching all files causing excessive regeneration | Filter by relevant file patterns (skip tests, assets, configs), debounce changes |
| Git Integration | Triggering regeneration on every git operation | Debounce git events, only regenerate on checkout/pull/commit affecting source files |
| Multi-Repository Management | Generating diagrams with cross-repo dependencies | Scope each diagram to single repository boundary, show external repos as Context-level systems |
| Caching Layer | Using file path as cache key (breaks on renames) | Use repository ID + diagram type + C4 level as stable cache key |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Generating all 4 C4 levels on every code change | Slow refresh, high API costs, UI freezes | Lazy generation (only generate on-demand), intelligent invalidation per level | Any non-trivial codebase (>20 files) |
| Extracting full codebase for token counting | Multi-second delays before generation starts | Cache file list, use fast glob patterns, estimate without full read | Repositories with >1000 files |
| No pagination/streaming for large diagram results | UI freezes rendering huge SVGs | Progressive rendering, zoom-to-load, split large diagrams | Diagrams with >50 elements or >2MB SVG |
| Synchronous diagram generation blocking UI | Application unresponsive during 10-30s generation | Background generation with progress indicator, cancel support | Any generation request |
| Re-parsing same files for every diagram type | Wasted computation, slow generation | Cache parsed AST/dependency graph, reuse across diagram types | Codebases with >50 files |
| Loading all cached diagrams on app start | Slow startup, memory bloat | Lazy-load diagrams on tab switch, purge old cache entries | After generating 10+ diagrams per repo |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Sending sensitive code to external API without warning | Proprietary code leaked to Anthropic, compliance violations | Warn users before first generation, add "local-only" mode (skip AI, use static analysis only) |
| Caching diagrams with embedded code snippets unencrypted | Sensitive logic exposed in cache files | Encrypt cached diagram data, store in OS-protected location |
| Including .env files, credentials in context extraction | API keys sent to Claude, appear in diagrams | Maintain strict EXCLUDE_PATTERNS (already present), validate no secrets leaked |
| No rate limiting on diagram generation | API key abuse, unexpected costs | Track generation count per hour, warn at thresholds, hard limit option |
| Storing API key in plain text (even temporarily) | Key exposed in memory dumps, logs | Reef already handles this well (encrypted storage), maintain this discipline |
| Allowing arbitrary PlantUML code execution | Remote code execution via PlantUML server vulnerabilities | Sandbox PlantUML server, validate/sanitize generated code, keep PlantUML updated |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual indication which C4 level user is viewing | Confusion about diagram type, mixing abstraction levels mentally | Clear level indicators (badges, headers), breadcrumb navigation |
| Clicking element for drill-down with no feedback | User assumes nothing happened, tries again, triggering multiple generations | Immediate loading state, disable clicks during generation, show "Generating..." |
| Diagrams update automatically without user awareness | Confusion why diagram changed, lost mental model | Show notification "Diagram updated" with diff preview, allow undo/pin to version |
| No way to compare old vs new diagram versions | Can't understand what changed in architecture | Version history, visual diff view showing added/removed elements |
| Generic error messages on generation failure | User doesn't know how to fix (is it API key? codebase too large? syntax error?) | Specific actionable errors: "Context too large (45k tokens). Try focusing on specific module." |
| Diagrams load with no context about coverage | User assumes seeing full architecture when seeing 20% | Show metadata: "Generated from 23 of 156 files (15% coverage). Focused on: /src/services/" |
| No control over detail level | Diagrams too complex OR too simplified, no middle ground | Offer detail slider (overview/balanced/detailed), save preference per repo |
| Diagrams use unfamiliar notation | Users don't understand C4 symbols, relationships | Include legend, tooltips explaining symbols, link to C4 model docs |
| No way to export/share diagrams | Diagrams trapped in app, can't include in docs | Export as PNG/SVG/PlantUML source, copy to clipboard, markdown embed |

## "Looks Done But Isn't" Checklist

- [ ] **C4 Hierarchy:** Often missing proper element linking between levels—verify Context elements map to Container diagrams, Containers to Components, Components to Code
- [ ] **Cache Invalidation:** Often missing level-specific invalidation—verify Context caches longer than Code, dependency changes invalidate affected diagrams
- [ ] **Token Coverage:** Often missing warnings about truncation—verify shows "X% of codebase analyzed" and which files were included/excluded
- [ ] **Layout Quality:** Often missing element limits and layout hints—verify diagrams with >15 elements have progressive disclosure or auto-splitting
- [ ] **Error Recovery:** Often missing graceful fallbacks—verify handles PlantUML timeout (show simplified version), API rate limits (queue for later), missing C4 library (clear error)
- [ ] **Drill-Down Navigation:** Often missing bidirectional navigation—verify can go down (Context→Container) and up (Container→Context) in hierarchy
- [ ] **Hallucination Validation:** Often missing static analysis baseline—verify generated elements exist in codebase, relationships match actual imports/calls
- [ ] **Multi-Repository Boundaries:** Often missing scope enforcement—verify diagrams don't mix elements from different repositories, external repos shown at Context level only
- [ ] **Progress Feedback:** Often missing during long operations—verify shows progress during context extraction (X/Y files), generation (waiting for API), rendering
- [ ] **Version Metadata:** Often missing diagram provenance—verify stores timestamp, code commit hash, model used, token count, coverage % with each diagram

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Mixed abstraction levels in generated diagrams | LOW | Add post-generation validation, regenerate failed diagrams, update prompts with stricter level definitions |
| LLM hallucinated architecture | MEDIUM | Implement static analysis layer, add element verification, regenerate with hybrid approach, mark inferred elements |
| Context truncation missing critical components | MEDIUM | Add coverage metrics, implement focused extraction per module, regenerate with better file prioritization |
| Stale cached diagrams | LOW | Add cache timestamps, implement manual refresh, purge old cache entries, regenerate with new invalidation logic |
| PlantUML rendering failures | LOW | Add element count limits, regenerate with layout hints, split large diagrams, update PlantUML server configuration |
| Missing C4-PlantUML library | LOW | Install C4 library on PlantUML server, add proper imports to templates, regenerate all diagrams |
| Broken drill-down navigation | MEDIUM | Establish ID schema, regenerate all levels with consistent naming, add hierarchy metadata, rebuild navigation |
| Performance issues with large codebases | HIGH | Implement caching at multiple layers (file list, parsed structure, diagram results), add lazy loading, optimize extraction |
| Security exposure of sensitive code | HIGH | Audit what was sent to API, rotate credentials if exposed, implement local-only mode, add pre-send warnings |
| UX confusion about coverage/accuracy | LOW | Add metadata displays, implement diagram legends, provide export/comparison features |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Mixing C4 abstraction levels | Phase 1 (C4 Foundation) | Unit tests validating Context has no Components, Container has no Code elements |
| LLM hallucination | Phase 1 (C4 Foundation) | Integration tests comparing generated elements against static analysis baseline |
| Token limit truncation | Phase 1 (C4 Foundation) | Coverage % shown in UI, warning if <80% of critical files included |
| Cache invalidation failures | Phase 2 (Automatic Regeneration) | Test that changes to /services/ invalidate Container diagram, changes to /utils/ don't invalidate Context |
| PlantUML rendering failures | Phase 1 (C4 Foundation) | Automated tests rendering sample diagrams with 5, 15, 25, 50 elements |
| Missing C4-PlantUML library | Phase 1 (C4 Foundation) | Setup verification script, CI/CD health check for PlantUML server |
| Broken drill-down navigation | Phase 3 (Hierarchy Navigation) | E2E tests clicking through Context→Container→Component→Code and back |
| Performance issues | Phase 4 (Polish) | Performance tests with repos of 100, 500, 1000 files measuring generation time <10s |
| Security exposure | Phase 1 (C4 Foundation) | Code review of context extraction, audit logs of API calls, test EXCLUDE_PATTERNS |
| UX confusion | Phase 4 (Polish) | User testing sessions, confusion metrics (time to understand diagram, error recovery rate) |

## Sources

**C4 Model Implementation:**
- [Misuses and Mistakes of the C4 model](https://www.workingsoftware.dev/misuses-and-mistakes-of-the-c4-model/)
- [C4 Model Diagrams: Practical Tips](https://revision.app/blog/practical-c4-modeling-tips)
- [C4 Model Official Site](https://c4model.com/)
- [C4 Model - InfoQ Article](https://www.infoq.com/articles/C4-architecture-model/)

**AI-Generated Diagrams & Hallucination:**
- [LLM Hallucinations in 2025: Guide](https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models)
- [AI Hallucination Examples](https://www.evidentlyai.com/blog/llm-hallucination-examples)
- [LLM Hallucination Detection](https://www.datadoghq.com/blog/ai/llm-hallucination-detection/)
- [Architectural Intelligence: AI for C4 Diagrams](https://medium.com/@sauravskit749/architectural-intelligence-using-generative-ai-to-automatically-derive-c4-diagrams-from-source-6d908901af7a)

**PlantUML & C4-PlantUML:**
- [C4-PlantUML GitHub](https://github.com/plantuml-stdlib/C4-PlantUML)
- [PlantUML Performance Issues](https://forum.plantuml.net/5882/performance-issue)
- [PlantUML Rendering Timeout Issues](https://github.com/suken/UmlGeneratorTool/issues/4)
- [ChatUML Documentation - Syntax Errors](https://docs.chatuml.com/docs/overview/dealing-with-syntax-errors)

**Token Limits & Context Management:**
- [AI Context Windows: Engineering Around Token Limits](https://www.kinde.com/learn/ai-for-software-engineering/best-practice/ai-context-windows-engineering-around-token-limits-in-large-codebases/)
- [Code Maps: Blueprint Codebases for LLMs](https://origo.prose.sh/code-maps)
- [Context Window Problem: Scaling Agents Beyond Token Limits](https://factory.ai/news/context-window-problem)
- [Understanding LLM Context Windows](https://medium.com/@adityakamat007/understanding-llm-context-windows-why-400k-tokens-doesnt-mean-what-you-think-918704d04085)

**Cache Invalidation:**
- [Cache Invalidation Strategies](https://www.designgurus.io/blog/cache-invalidation-strategies)
- [How to Build Cache Invalidation Strategies](https://oneuptime.com/blog/post/2026-01-30-cache-invalidation-strategies/view)
- [Automatic Diagram Generation for Always-Accurate Diagrams](https://www.pulumi.com/blog/automating-diagramming-in-your-ci-cd/)

**Performance & Large Codebases:**
- [Software Dependency Graphs](https://www.puppygraph.com/blog/software-dependency-graph)
- [Best Code Visualization Tools 2026](https://thectoclub.com/tools/best-code-visualization-tools/)
- [Static Code Analysis: Traversing the AST](https://www.shramos.com/2018/01/static-code-analysis-traversing-ast.html)
- [Static Code Analysis with ASTs](https://medium.com/hootsuite-engineering/static-analysis-using-asts-ebcd170c955e)

**UX & Navigation:**
- [Graph Visualization UX: Designing Intuitive Data Experiences](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/)
- [UX Design Mistakes to Avoid](https://revelry.co/insights/design/ux-design-mistakes/)
- [Navigation UX Best Practices for SaaS](https://www.pencilandpaper.io/articles/ux-pattern-analysis-navigation)

**Monorepo Architecture:**
- [Monorepo Explained](https://monorepo.tools/)
- [Benefits and Challenges of Monorepo Development](https://circleci.com/blog/monorepo-dev-practices/)
- [Monorepo vs. Multi-repo Strategies](https://www.thoughtworks.com/insights/blog/agile-engineering-practices/monorepo-vs-multirepo)

---
*Pitfalls research for: C4 Architecture Diagram Generation in Desktop Git Client*
*Researched: 2026-02-21*
*Confidence: HIGH - Based on official C4 model documentation, LLM research papers, PlantUML community issues, and analysis of existing Reef implementation*
