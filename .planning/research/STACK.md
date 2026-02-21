# Stack Research: C4 Architecture Diagrams

**Domain:** Desktop application - C4 architecture diagram generation
**Researched:** 2026-02-21
**Confidence:** HIGH

## Recommended Stack

### Core C4 Diagram Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| C4-PlantUML | Latest (GitHub) | C4 model syntax for PlantUML | Industry standard for C4-as-code. High source reputation (Context7 verified). 127+ code snippets. Supports all 4 C4 levels (Context, Container, Component, Code). Direct !include from GitHub CDN. |
| plantuml-encoder | 1.4.0 | Encode PlantUML syntax for rendering | **ALREADY INSTALLED**. Converts PlantUML text to encoded format for URL/server rendering. |
| node-plantuml | 0.9.0 | Node.js PlantUML CLI wrapper | **ALREADY INSTALLED**. Enables local diagram generation without external server dependency. |

**CRITICAL NOTE:** C4-PlantUML is NOT an npm package. It's a PlantUML library included via `!include` statements in diagram code:
```plantuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml
```

### Static Code Analysis

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| ts-morph | ^27.0.2 | TypeScript AST parsing and analysis | Best-in-class TypeScript Compiler API wrapper. Context7 verified (790 snippets, 76.3 benchmark score). Provides programmatic navigation of TS/JS code, class/function/import extraction, dependency resolution. 70-80% faster analysis in 2026 improvements. |
| dependency-cruiser | ^17.3.8 | Dependency graph visualization | Current standard (977K weekly downloads). Validates and visualizes dependencies across TypeScript projects. Supports architectural rules enforcement. Outputs dot/GraphViz format for C4 Container/Component insights. |

### AI Integration (Already in Place)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @anthropic-ai/sdk | ^0.78.0 | Claude API integration | **UPGRADE NEEDED** (current: 0.59.0). Latest version includes 2025/2026 improvements. Already integrated for diagram generation. Use for architectural insights and C4 narrative generation. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tiktoken | ^1.0.22 | Token counting for AI context | **ALREADY INSTALLED**. Essential for managing Claude API context limits when analyzing large codebases. |
| axios | ^1.6.5 | HTTP client | **ALREADY INSTALLED**. For PlantUML server requests if using remote rendering. |

### Infrastructure (Optional)

| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| PlantUML Server (Docker) | plantuml/plantuml-server:jetty | Remote diagram rendering | **OPTIONAL**. Use if local node-plantuml performance is insufficient. Jetty variant supports read-only filesystems (OpenShift compatible). Production deployment: Kubernetes + Nginx + multi-replica HA. |

## Installation

```bash
# New dependencies for C4 diagram generation
npm install ts-morph@^27.0.2
npm install dependency-cruiser@^17.3.8

# Upgrade existing AI SDK (currently on 0.59.0)
npm install @anthropic-ai/sdk@^0.78.0

# Already installed (no action needed):
# - plantuml-encoder@1.4.0
# - node-plantuml@0.9.0
# - tiktoken@1.0.22
# - axios@1.6.5
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| C4-PlantUML + PlantUML | Structurizr DSL | Use Structurizr if you need: (1) Commercial web platform, (2) Versioned collaborative editing, (3) DSL-first workflow. Requires Java toolchain. More complex than PlantUML for simple use cases. |
| C4-PlantUML | Mermaid.js C4 | **DO NOT USE**. Mermaid C4 is experimental with poor layout control, no custom tag support, and fixed styling. Search results confirm multiple GitHub issues (mermaid-js/mermaid#3217, #4906). PlantUML C4 is production-ready. |
| ts-morph | TypeScript Compiler API (direct) | Only use direct TS Compiler API if you need absolute control and can handle low-level AST complexity. ts-morph provides same power with 10x better DX. |
| dependency-cruiser | Manual AST traversal | Only build custom solution if you need C4-specific dependency rules that dependency-cruiser cannot express (unlikely). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Mermaid.js C4 diagrams | Experimental feature, poor layout control, multiple open issues, fixed styles only. Not production-ready as of 2025. | C4-PlantUML |
| node-plantuml-latest (npm fork) | Unnecessary. Original node-plantuml@0.9.0 still works perfectly. Fork adds no value. | node-plantuml@0.9.0 |
| plantuml-coder (encoder fork) | Maintained fork of plantuml-encoder, but original still works. No breaking issues reported. Avoid dependency churn. | plantuml-encoder@1.4.0 |
| Synchronous Electron IPC | Blocks UI thread. Anti-pattern for large codebase analysis. | ipcRenderer.invoke (async, Electron 7+) |
| @electron/remote | Deprecated. Performance overhead. | Proper IPC with preload script (already implemented in Reef) |
| Custom C4 syntax generator | C4-PlantUML is the standard. Don't reinvent. 127+ examples in Context7. | C4-PlantUML macros |

## Stack Patterns by Scenario

### Pattern 1: Hybrid Generation (Recommended)
**Scenario:** Generate C4 diagrams combining static analysis + AI insights

**Stack:**
- ts-morph: Extract classes, functions, imports, file structure
- dependency-cruiser: Build dependency graph for Container/Component relationships
- @anthropic-ai/sdk: Enrich with architectural narratives, identify system boundaries, suggest groupings
- C4-PlantUML: Generate standardized diagram syntax
- node-plantuml: Render locally

**Why:** Deterministic structure from static analysis + AI for architectural understanding. Best of both worlds.

### Pattern 2: AI-Heavy Generation
**Scenario:** Generate C4 diagrams primarily from AI analysis of code

**Stack:**
- tiktoken: Manage context windows for large codebases
- @anthropic-ai/sdk: Analyze code and generate C4 insights
- C4-PlantUML: Generate diagram syntax
- node-plantuml: Render

**Why:** Simpler implementation. Good for POC or when static analysis complexity is overkill. Risk: non-deterministic, token costs.

### Pattern 3: Static-Only Generation
**Scenario:** Generate Container/Component diagrams without AI

**Stack:**
- ts-morph: Parse TypeScript structure
- dependency-cruiser: Extract dependencies
- Custom logic: Map to C4 elements (Container = package/module, Component = class/service)
- C4-PlantUML: Generate syntax
- node-plantuml: Render

**Why:** Zero AI costs. Fully deterministic. Fast. Limited: No architectural insights, context understanding, or semantic groupings.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| ts-morph@27.0.2 | TypeScript@5.3.3 (Reef's current version) | ts-morph 27.x supports TS 5.x. Reef uses TS 5.3.3. Fully compatible. |
| dependency-cruiser@17.3.8 | TypeScript@5.3.3 | Supports TS 5.x. No issues. |
| @anthropic-ai/sdk@0.78.0 | Node.js 18+ (Electron 38 uses Node 22) | Fully compatible. Reef uses Electron 38.1.2 (Node 22.12.0). |
| node-plantuml@0.9.0 | PlantUML (Java required) | Requires Java runtime. Works on macOS/Linux/Windows. Already installed in Reef. |
| C4-PlantUML | PlantUML 1.2025.x | C4-PlantUML updated for PlantUML v1.2025.1+. Include from GitHub CDN for latest compatibility. |

## Confidence Assessment

| Technology | Confidence | Source | Notes |
|------------|------------|--------|-------|
| C4-PlantUML | **HIGH** | Context7 (/plantuml-stdlib/c4-plantuml), High reputation, 127 snippets | Official C4 model library. Industry standard. Verified via Context7 docs. |
| ts-morph | **HIGH** | Context7 (/dsherret/ts-morph), npm (27.0.2), 790 snippets, 76.3 benchmark | Latest version verified via npm search. Context7 docs confirm features. |
| dependency-cruiser | **HIGH** | npm search (17.3.8), GitHub (sverweij/dependency-cruiser), 977K weekly downloads | Active maintenance (published 11 days ago). Widely adopted. |
| @anthropic-ai/sdk | **HIGH** | npm search (0.78.0, published 2 days ago), GitHub (anthropics/anthropic-sdk-typescript) | Official Anthropic SDK. Recent updates. Already integrated in Reef. |
| node-plantuml | **MEDIUM** | npm (0.9.0), GitHub (markushedvall/node-plantuml), 56 dependent projects | Not updated in 6 years BUT still works. No breaking changes in PlantUML. Reef already uses it successfully. |
| plantuml-encoder | **MEDIUM** | npm (1.4.0), GitHub (markushedvall/plantuml-encoder) | Not updated in 6 years BUT stable. Reef already uses it. No reported issues. |

## PlantUML Server Deployment (If Needed)

**When to deploy:**
- Local node-plantuml rendering is too slow for large diagrams (>50 elements)
- Want to offload rendering from Electron main process
- Need server-side caching of rendered SVGs

**Recommended setup:**
```bash
docker run -d -p 8080:8080 plantuml/plantuml-server:jetty
```

**Production considerations:**
- Use jetty variant (supports read-only filesystems)
- Add Nginx reverse proxy for SSL termination
- Deploy with Kubernetes for HA (multi-replica + health checks)
- Configure resource limits (PlantUML rendering is CPU-intensive)

**Integration with Reef:**
- Keep node-plantuml as fallback
- Add server URL to DiagramSettings
- Use axios for server POST requests
- Cache rendered SVGs in CacheService

## TypeScript Code Analysis Patterns

### Pattern: Extract C4 Container candidates

```typescript
import { Project } from "ts-morph";

const project = new Project({ tsConfigFilePath: "tsconfig.json" });
project.addSourceFilesAtPaths("src/**/*.ts");

// Containers = top-level modules/packages
const sourceFiles = project.getSourceFiles();
const containers = new Map<string, { files: string[]; dependencies: string[] }>();

for (const file of sourceFiles) {
  const moduleDir = path.dirname(file.getFilePath()).split("/src/")[1]?.split("/")[0];
  if (!containers.has(moduleDir)) {
    containers.set(moduleDir, { files: [], dependencies: [] });
  }

  // Get dependencies
  const referencedFiles = file.getReferencedSourceFiles();
  // ... analyze cross-module dependencies for C4 Container relationships
}
```

### Pattern: Extract C4 Component candidates

```typescript
// Components = classes, services, major functions within a Container
const myClass = sourceFile.getClassOrThrow("UserService");
const methods = myClass.getMethods();
const properties = myClass.getProperties();
const implementations = myClass.getImplements();

// Map to C4 Component:
// - Name: myClass.getName()
// - Technology: Check decorators/annotations
// - Description: Extract JSDoc comments
```

## C4-PlantUML Syntax Examples

### Context Diagram
```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

Person(user, "Developer", "Uses Reef to understand codebases")
System(reef, "Reef Desktop App", "Multi-repo Git client with C4 diagrams")
System_Ext(github, "GitHub", "Source code hosting")
System_Ext(claude, "Claude API", "AI-powered analysis")

Rel(user, reef, "Views diagrams", "Electron UI")
Rel(reef, github, "Fetches repos", "REST API")
Rel(reef, claude, "Generates insights", "API calls")
@enduml
```

### Container Diagram
```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

System_Boundary(reef, "Reef Desktop App") {
  Container(main, "Main Process", "Electron + TypeScript", "Git operations, file analysis")
  Container(renderer, "Renderer Process", "React + TypeScript", "UI and diagram display")
  ContainerDb(cache, "SQLite Cache", "better-sqlite3", "Diagram cache")
}

System_Ext(claude, "Claude API", "AI analysis")

Rel(renderer, main, "IPC calls", "ipcRenderer.invoke")
Rel(main, claude, "Generate diagrams", "HTTPS/REST")
Rel(main, cache, "Read/Write", "SQL")
@enduml
```

### Component Diagram
```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

Container_Boundary(main, "Main Process") {
  Component(diagramGen, "DiagramGeneratorService", "TypeScript", "Orchestrates C4 generation")
  Component(contextExt, "ContextExtractorService", "TypeScript", "Analyzes codebase")
  Component(staticAnalysis, "StaticAnalysisService", "ts-morph", "AST parsing")
  Component(plantUml, "PlantUMLService", "node-plantuml", "Renders diagrams")
}

Rel(diagramGen, contextExt, "Extract files")
Rel(diagramGen, staticAnalysis, "Parse structure")
Rel(diagramGen, plantUml, "Render diagram")
@enduml
```

## Sources

**Context7 (HIGH confidence):**
- /plantuml-stdlib/c4-plantuml — C4 syntax, macros, examples (127 snippets)
- /dsherret/ts-morph — TypeScript AST parsing, project setup, dependency resolution (790 snippets)

**Official Documentation (HIGH confidence):**
- [C4-PlantUML GitHub](https://github.com/plantuml-stdlib/C4-PlantUML) — Releases, examples
- [C4 Model Official Site](https://c4model.com/) — C4 methodology, levels, tooling comparison
- [PlantUML Server Deployment](https://deepwiki.com/plantuml/plantuml-server/5-deployment) — Docker, Kubernetes, production patterns
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc) — Best practices (ipcRenderer.invoke)

**npm Registry (HIGH confidence - versions verified 2026-02-21):**
- [ts-morph@27.0.2](https://www.npmjs.com/package/ts-morph) — Published 4 months ago
- [dependency-cruiser@17.3.8](https://www.npmjs.com/package/dependency-cruiser) — Published 11 days ago, 977K weekly downloads
- [@anthropic-ai/sdk@0.78.0](https://www.npmjs.com/package/@anthropic-ai/sdk) — Published 2 days ago
- [node-plantuml@0.9.0](https://www.npmjs.com/package/node-plantuml) — Published 6 years ago (stable, no issues)
- [plantuml-encoder@1.4.0](https://www.npmjs.com/package/plantuml-encoder) — Published 6 years ago (stable, no issues)

**GitHub (MEDIUM confidence - community tools):**
- [sverweij/dependency-cruiser](https://github.com/sverweij/dependency-cruiser) — TypeScript dependency visualization
- [plantuml/plantuml-server](https://github.com/plantuml/plantuml-server) — Official Docker images

**WebSearch - Best Practices (MEDIUM confidence):**
- [C4 model tools comparison](https://icepanel.io/blog/2025-08-28-top-9-tools-for-c4-model-diagrams) — 2025 tooling landscape
- [Structurizr](https://structurizr.com/) — Alternative C4 DSL (considered but not recommended for Reef)
- [TypeScript Static Analysis 2025](https://www.in-com.com/blog/20-powerful-static-analysis-tools-every-typescript-team-needs/) — ts-morph, FTA, Semgrep comparison
- [Electron IPC TypeScript Best Practices](https://blog.logrocket.com/electron-ipc-response-request-architecture-with-typescript/) — Type safety, async patterns
- [Claude Diagram Generation Best Practices](https://thenewstack.io/how-to-create-software-diagrams-with-chatgpt-and-claude/) — AI-powered diagramming patterns

---
*Stack research for: C4 Architecture Diagrams in Reef Desktop Application*
*Researched: 2026-02-21*
*Confidence: HIGH (Core framework verified via Context7 + npm; supporting tools verified via official docs + recent web sources)*
