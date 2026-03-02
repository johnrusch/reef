# Feature Research

**Domain:** C4 diagram quality and rendering performance for AI-generated architecture diagrams
**Researched:** 2026-03-02
**Confidence:** HIGH

## Context

This is a SUBSEQUENT MILESTONE research pass for v1.2 "Diagrams That Deliver." The v1.1 features
(persistent storage, change tracking, amber highlighting, diff navigation) are already shipped.
This research focuses exclusively on what makes C4 diagrams useful vs shallow, and what rendering
performance improvements are achievable.

The existing pipeline: ts-morph static analysis → Claude API enrichment → C4PlantUMLGenerator →
PlantUML SVG → React renderer. Diagrams are described as "shallow/empty" and Component level
errors out.

## Diagnosis: Why Diagrams Are Currently Shallow

Code audit revealed three root causes:

**1. AI enrichment output is not used for diagram content (critical bug)**
In `c4PlantUMLGenerator.ts`, every generator method ignores the `enrichedData` parameter:
```typescript
generateContainerDiagram(_enrichedData: string, staticData: AnalysisResult): string
generateComponentDiagram(_enrichedData: string, staticData: AnalysisResult, containerId: string): string
generateCodeDiagram(_enrichedData: string, staticData: AnalysisResult, componentId: string): string
```
The underscore prefix is the TypeScript convention for "intentionally unused." The AI enrichment
call costs tokens but its output is discarded. Only static analysis data shapes the diagram.

**2. Static analysis extracts raw structure but no architectural semantics**
`staticAnalyzerService.ts` extracts classes, interfaces, imports, and entry points — but passes
raw file paths and class names to the generator. The generator's `detectContainers()` matches
only known Electron patterns (hardcoded) and `detectComponents()` groups by directory name, not
architectural role. For non-Electron repos, containers default to sequential `Rel(A, B, "Uses")`
chains with no semantic labeling.

**3. Component diagram fails when elementId format doesn't match container path mapping**
`getContainerPath()` has a hardcoded map of `{'Main Process': 'src/main', 'Renderer Process': 'src/renderer'}`.
Any container name not in this map returns `containerId.toLowerCase()`, which never matches file
paths. `detectComponents()` returns empty array → diagram generates with no components inside the
boundary → PlantUML may error on empty `Container_Boundary` block.

**4. Code diagram filtering uses filename substring match, not class lookup**
```typescript
const classes = staticData.structure.classes.filter(cls => {
  const fileName = cls.file.split('/').pop() || '';
  return fileName.includes(componentId) || cls.name === componentId;
});
```
If `componentId` is "Services" (directory-derived), this matches no classes by name. If it is
"GitService", it matches the file `gitService.ts` via substring but misses all classes in that
file that don't have "gitservice" in their name.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Container diagram shows real tech stack | "Container = technology choice" is the C4 contract. Users expect React app, Node API, SQLite DB — not "Renderer Process (TypeScript)" | MEDIUM | Fix `detectContainers()` to use technology detection + directory heuristics. Add protocols to relationships (IPC, REST, JDBC). |
| Component diagram works end-to-end | Core value proposition of drill-down. Currently errors at Component level | HIGH | Fix elementId passing: use sanitized container names in IDs, fix `getContainerPath()` to derive paths dynamically, not from hardcoded map. |
| Component diagram shows architectural roles | Users expect to see services, controllers, stores, repositories — not directory buckets like "services" and "stores" | HIGH | Use class name suffix patterns (Service, Controller, Store, Repository, Handler) to assign `Component()` vs `ComponentDb()` shapes. Name components individually, not as folders. |
| Code diagram shows classes for a component | When drilling from Component to Code, users expect to see the classes in that component | MEDIUM | Fix filtering: look up classes by which container/component they belong to using the hierarchical elementId, not filename substring. |
| AI enrichment content appears in diagrams | Users pay API costs expecting AI to enrich diagrams. Currently a no-op | HIGH | Parse AI enrichment output (structured JSON or prose) and merge into PlantUML generation: relationship labels, component descriptions, external system details. |
| Relationships labeled with protocols | C4 container diagrams must show communication protocols (IPC, HTTP/REST, JDBC). Unlabeled arrows are insufficient | MEDIUM | Static analysis can detect protocols: Octokit imports → REST, better-sqlite3 imports → SQL, IPC channels → Electron IPC. |
| Non-TypeScript repos produce useful diagrams | Users analyze JS, Python, and other language repos. ts-morph only handles TypeScript | HIGH | Fallback to file structure heuristics + AI-only generation when no tsconfig.json. Currently returns empty analysis with error message. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-driven container inference (not rule-based) | Instead of hardcoded Electron patterns, AI analyzes actual code and produces real containers. Generalist approach works for any codebase | HIGH | Restructure pipeline: AI output must be structured JSON. Prompt asks for container list with name, tech, description, relationships. Generator renders from structured AI output. |
| Domain-specific few-shot prompting | Research shows domain examples dramatically improve LLM architecture output quality. Electron prompts differ from Django prompts | MEDIUM | Add detected framework to system prompt. Include concrete C4-PlantUML syntax examples in prompt. Specify expected output structure (JSON schema or PlantUML skeleton). |
| Relationship labels from import analysis | Call relationships labeled with actual protocol: `Rel(main, db, "Reads/writes", "SQL/SQLite")` instead of just `Rel(A, B, "uses")` | MEDIUM | Map known package imports to protocols in `detectExternalSystems()`. Extend to container-to-container relationships. |
| Pre-render SVG from cached PlantUML | Currently the PlantUML → SVG conversion runs every time the diagram tab is opened, adding 5+ seconds even for cached diagrams | MEDIUM | Store SVG in SQLite alongside PlantUML source. On cache hit, return stored SVG directly. Only re-render when PlantUML source changes. This is the most impactful rendering speed fix. |
| Structured AI output format | Prompting AI for free-form architectural prose then ignoring it is the core quality bug. Prompt for JSON with elements + relationships arrays | HIGH | Change `aiEnricherService.ts` to request structured JSON output. Add response parsing + validation. Feed structured data to generator instead of static-analysis-only path. |
| Component-level architecture classification | Beyond directory grouping: classify components by architectural role (API layer, business logic, data access, infrastructure) | MEDIUM | Analyze class names + import patterns. Classes importing from `express`/`fastify` → API layer. Classes importing `prisma`/`sqlite` → data access. Display role as `Component()` technology field. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Show all classes as components | "I want to see every class in the diagram" | 50+ class nodes in one diagram is unreadable. C4 Component level is for logical groupings, not individual classes | Show individual classes only at Code level. Component level groups related classes into architectural roles. |
| Auto-detect language and switch parsers | "It should work for Python, Go, Java repos" | Multi-language AST parsing is a separate product. Each language needs a different parser, different heuristics | AI-only mode for non-TS repos: use file structure + imports from package.json/requirements.txt/go.mod. Flag as lower confidence. |
| Real-time diagram updates as user edits code | "The diagram should live-update" | SVG render takes 5+ seconds even cached. PlantUML JVM startup costs. API calls for AI enrichment. Unworkable | Stale indicators (v1.1 already built). User-initiated regeneration. Pre-rendered SVG for instant display of cached results. |
| Include node_modules in analysis | "Show all dependencies including libraries" | Produces hundreds of external system nodes. Illegible. Static analysis with `skipFileDependencyResolution: false` is prohibitively slow | Detect libraries from package.json (already done). Show as `System_Ext()` at Context/Container level only. Never include in Component/Code diagrams. |
| Full class diagrams with all methods and properties | "Show all getters/setters/private methods" | PlantUML class diagram with 30 methods per class is wall-of-text. C4 Code level is for key public API | Filter to public methods only. Omit getters/setters. Maximum 8-10 methods per class in Code diagram. |
| Diagram-level manual editing | "Let me adjust the generated diagram" | Manual edits are overwritten on regeneration. Maintenance nightmare. PlantUML source editing is developer-hostile | Copy PlantUML source to clipboard (already exists). External editing with copy-paste is sufficient for power users. |

## Feature Dependencies

```
[Structured AI output format]
    └──requires──> [Prompt engineering for JSON output]
    └──enables──> [AI-driven container inference]
    └──enables──> [Relationship labels from AI]
    └──enables──> [Component classification]

[Fix elementId passing for Component level]
    └──requires──> [Understand container name → path mapping]
    └──enables──> [Component diagram end-to-end]
    └──enables──> [Code diagram end-to-end]

[Pre-render SVG caching]
    └──requires──> [SQLite schema addition: svg_content column]
    └──requires──> [PlantUML service returns SVG on generation]
    └──conflicts with──> [Current storage only saves PlantUML source]

[AI-driven container inference]
    └──requires──> [Structured AI output format]
    └──requires──> [Generator can accept structured data, not just AnalysisResult]

[Relationship labels with protocols]
    └──requires──> [Protocol detection from imports]
    └──enhances──> [Container diagram quality]
    └──enhances──> [Component diagram quality]

[Domain-specific few-shot prompting]
    └──requires──> [Technology detection already working]
    └──enhances──> [Structured AI output format]
    └──enhances──> [All four C4 levels]
```

### Dependency Notes

- **Structured AI output is the foundational fix:** Currently the most expensive API call produces output that is completely discarded. Fixing this one issue improves all four C4 levels simultaneously. Must be first.
- **elementId fix unblocks Component + Code levels:** Two diagrams (out of four) fail because of the path mapping bug. High value fix with low risk.
- **Pre-render SVG caching is independent:** Can be done in parallel with content quality fixes. Requires schema change to add `svg_content` column in `diagram_storage` table.
- **AI-driven container inference requires structured AI output:** Do not attempt inference rewrite until JSON output format is reliable.
- **Protocol detection enhances but doesn't block:** Container diagram already generates. Protocol labels make it richer.

## MVP Definition

### Launch With (v1.2)

Minimum features to meet "diagrams that deliver rich, useful content" goal.

- [ ] Fix: Use AI enrichment output in PlantUML generation — eliminates the biggest quality gap
- [ ] Fix: elementId passing for Component diagram (dynamic path mapping, not hardcoded) — unblocks Component level
- [ ] Fix: Code diagram class filtering uses elementId hierarchy, not filename substring — unblocks Code level
- [ ] Prompt AI for structured JSON output (containers, components, relationships arrays) — enables all downstream quality
- [ ] Container diagram: show actual named tech components with relationship protocols — table stakes
- [ ] Component diagram: show individual classes in architectural roles, not directory buckets — table stakes
- [ ] Pre-render SVG on generation and cache in SQLite — eliminates 5+ second render delay for cached diagrams

### Add After Validation (v1.2.x)

Features to add once core quality is working and tested.

- [ ] Domain-specific few-shot examples in prompts — improves AI output quality further
- [ ] Non-TypeScript repo fallback (file structure heuristics) — broadens usability
- [ ] Component role classification (API/Business/Data/Infra layers) — richer component diagrams
- [ ] Relationship protocol auto-detection from import patterns — richer container diagrams

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Multi-language AST parsing (Python, Go, Java) — requires separate parsers per language
- [ ] Diagram version comparison — show architecture drift over time
- [ ] Interactive component filtering — hide/show architectural layers
- [ ] Architecture validation rules — flag violations of detected patterns

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Use AI output in generation | HIGH | MEDIUM | P1 |
| Fix elementId for Component level | HIGH | MEDIUM | P1 |
| Fix Code diagram class filtering | HIGH | LOW | P1 |
| Structured JSON AI output | HIGH | MEDIUM | P1 |
| Container diagram with protocols | HIGH | MEDIUM | P1 |
| Individual class components (not dir buckets) | HIGH | MEDIUM | P1 |
| Pre-render SVG caching | HIGH | MEDIUM | P1 |
| Domain-specific prompting | MEDIUM | LOW | P2 |
| Non-TS repo fallback | MEDIUM | HIGH | P2 |
| Component role classification | MEDIUM | MEDIUM | P2 |
| Protocol auto-detection | LOW | LOW | P2 |
| Multi-language parsing | HIGH | HIGH | P3 |
| Diagram version comparison | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Required for v1.2 — diagrams currently broken or empty without these
- P2: Quality improvements — diagrams work but become noticeably richer
- P3: Scope expansion — new user segments or advanced capabilities

## Competitor Feature Analysis

| Feature | Structurizr | IcePanel | Swimm | Our v1.2 Approach |
|---------|-------------|----------|-------|-------------------|
| Container detail level | Named services, protocols, technologies | Named services, explicit protocols | N/A | Fix to show named services + protocols |
| Component detail level | Individual named components by role | Individual named components | Named components | Fix to show individual classes in roles |
| AI generation | None (manual only) | AI drafting (partial) | AI suggestions | AI provides structure; static validates |
| SVG render speed | Instant (pre-generated) | ~2s (their server) | N/A | Fix: pre-render + cache SVG in SQLite |
| Non-TS language support | All languages (manual) | All languages | N/A | Fallback to AI-only for non-TS |

**Key differentiator preserved:** Reef generates diagrams automatically from code without manual
authoring. Quality fix closes the gap between "AI generated something" and "AI generated something
useful." Structurizr requires architects to write DSL. IcePanel requires manual layout. Reef's
value is automation — the v1.2 work makes that automation produce real results.

## C4 Level Quality Standards

What each level must show to be considered non-shallow (based on official C4 model guidance):

### Context Level (currently functional, minor gaps)
- Primary user personas (not just "User") — detect from README or class names like `AdminDashboard`
- External systems with purpose descriptions: "GitHub (stores repositories, REST API)" not just "GitHub"
- Relationship labels explaining data flow: "Fetches repo metadata and file contents" not just "Uses"
- Current status: ACCEPTABLE — produces real diagram, could be richer

### Container Level (currently shallow)
**Must have:**
- Named, deployable units with specific technology: "React Frontend (React 18, Vite)" not "Renderer Process (TypeScript)"
- Database containers with technology: "Diagram Store (SQLite, WAL mode)" not just "Config Store (electron-store)"
- Relationship protocols between containers: `Rel(frontend, api, "Reads/writes diagrams", "Electron IPC")` not `Rel(A, B, "Uses")`
- External system relationships labeled with protocols: `Rel(mainProcess, github, "Fetches repos", "REST/HTTPS")`
**Currently missing:** Protocols on relationships, meaningful technology descriptions, database differentiation

### Component Level (currently broken)
**Must have:**
- Individual named components (classes/class groups) shown inside Container_Boundary
- Architectural role visible via shape: `Component()` for services, `ComponentDb()` for repositories
- Technology in component: "Spring Bean" → for us "TypeScript Service Class" or specific framework
- Relationships between components: `Rel(gitService, fileWatcher, "Notifies of changes", "events")`
- Description explaining responsibility: "Manages git operations and repository status" not "1 services handling service logic"
**Currently missing:** Everything — empty Container_Boundary due to path mapping bug

### Code Level (currently broken)
**Must have:**
- Individual class boxes with public methods listed
- Interface definitions with property signatures
- Inheritance arrows: `Parent <|-- Child`
- Implementation arrows: `Interface <|.. ImplementingClass`
- Usage relationships between classes in scope: `ServiceA --> ServiceB : uses`
- Omit private methods, getters/setters — only show public contract
**Currently missing:** Everything — filename-substring filter returns empty for directory-named components

## Rendering Performance Analysis

### Current Architecture (Why 5+ Seconds)

```
Tab open → PlantUMLRenderer mounts → useEffect fires
→ window.reef.plantuml.checkJava() [IPC round-trip, ~200ms]
→ window.reef.plantuml.generateSVG(plantUML) [IPC + JVM + render, ~4-8s]
→ setSvgContent() → DOM injection
```

Even for cached diagrams (PlantUML source already in SQLite), the SVG is re-rendered from scratch on every tab open. The PlantUML JAR generates SVG by spawning a Java process each time.

### Recommended Fix: Store SVG in SQLite

Add `svg_content TEXT` column to `diagram_storage` table. When diagram is generated:
1. Call PlantUML → get SVG string
2. Store both `diagram_content` (PlantUML source) and `svg_content` (rendered SVG)

On tab open:
1. Check SQLite for stored diagram
2. If `svg_content` exists and is non-null → return SVG directly, skip Java entirely
3. Only trigger PlantUML render when PlantUML source changes

This reduces cached diagram display from 5+ seconds to <100ms (SQLite read + DOM injection).

### Secondary Fix: Remove Java Check on Every Render

`PlantUMLRenderer` calls `checkJava()` on every render, even when Java was confirmed available
moments ago. Cache this result in app-level state (Zustand or module-level singleton). One check
at startup is sufficient.

### Why Not Switch to Pure Server-Side Rendering

The current architecture already falls back to a PlantUML server when Java is absent. The issue
is not the rendering engine — it is the lack of SVG caching. Local Java rendering is fast per-diagram
once the JVM is warm; the problem is cold-starting on every view.

## Sources

- [C4 model - Container Diagram specification](https://c4model.com/diagrams/container) — HIGH confidence (official)
- [C4 model - Component Diagram specification](https://c4model.com/diagrams/component) — HIGH confidence (official)
- [C4 model - Code Diagram specification](https://c4model.com/diagrams/code) — HIGH confidence (official)
- [C4-PlantUML Component Diagrams - DeepWiki](https://deepwiki.com/plantuml-stdlib/C4-PlantUML/3.3-component-diagrams) — HIGH confidence (comprehensive C4-PlantUML reference)
- [Generating C4 Diagrams with LLMs - IcePanel comparison](https://icepanel.io/blog/2025-08-18-comparison-llms-for-creating-software-architecture-diagrams) — MEDIUM confidence (2025 empirical comparison)
- [LLM-Based Architecture Diagram Generation from Source Code](https://arxiv.org/html/2511.05165v1) — HIGH confidence (peer-reviewed, 2025)
- [Auto-Generate Architecture Diagrams from Code - BSWEN](https://docs.bswen.com/blog/2026-02-25-auto-generate-architecture-diagrams/) — MEDIUM confidence (current practice patterns, 2026)
- [Practical C4 Modeling Tips - Revision](https://revision.app/blog/practical-c4-modeling-tips) — MEDIUM confidence
- [C4 Diagram Best Practices - Visual C4](https://visual-c4.com/blog/c4-component-diagram-best-practices) — MEDIUM confidence

---
*Feature research for: C4 diagram quality improvements and rendering performance (v1.2)*
*Researched: 2026-03-02*
*Context: v1.1 shipped — persistent storage, change tracking, amber highlighting, diff navigation all working. v1.2 goal: make diagrams rich and useful end-to-end.*
