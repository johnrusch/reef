# Phase 1: C4 Foundation - Research

**Researched:** 2026-02-21
**Domain:** C4 Model Architecture Diagrams, Static Code Analysis, AI-Enriched Documentation
**Confidence:** HIGH

## Summary

Phase 1 focuses on implementing the C4 model's four levels of architecture diagrams (Context, Container, Component, Code) using a hybrid approach combining static TypeScript analysis with AI enrichment. The research reveals C4-PlantUML as the standard library for generating C4 diagrams, ts-morph as the mature solution for TypeScript AST analysis, and prompt caching in Anthropic SDK v0.78.0+ as essential for cost-effective large codebase processing.

The existing Reef codebase already has PlantUML rendering infrastructure (`plantUmlService.ts`), basic diagram generation with Claude (`diagramGeneratorService.ts`), and context extraction (`contextExtractorService.ts`). This phase will extend these foundations to support full C4 hierarchy, level-aware caching, and consistent element IDs for drill-down navigation.

**Primary recommendation:** Use ts-morph for deterministic structure extraction (classes, imports, dependencies), C4-PlantUML standard library macros for diagram syntax, and Claude's prompt caching to minimize token costs when processing large codebases across multiple diagram levels.

<phase_requirements>
## Phase Requirements

This phase MUST address the following requirements:

| ID | Description | Research Support |
|----|-------------|-----------------|
| C4GEN-01 | System generates C4 Context diagram showing system in its environment with external dependencies | C4-PlantUML Context macros (Person, System, System_Ext, Enterprise_Boundary) provide standard syntax |
| C4GEN-02 | System generates C4 Container diagram showing high-level tech stack (apps, databases, services) | C4-PlantUML Container macros (Container, ContainerDb, ContainerQueue, System_Boundary) provide standard syntax |
| C4GEN-03 | System generates C4 Component diagram showing components within each container | C4-PlantUML Component macros extend Container level with Component-specific elements |
| C4GEN-04 | System generates C4 Code diagram showing class-level implementation details | Standard PlantUML class diagram syntax (C4 model doesn't define Code level, delegates to UML) |
| C4GEN-05 | System uses hybrid approach combining static code analysis (ts-morph) with AI enrichment | ts-morph for deterministic extraction (790 code snippets, High reputation, Benchmark 76.3), AI for architectural insights |
| C4GEN-06 | System validates C4 abstraction levels to prevent Container/Component confusion | Container = deployable unit (runtime construct), Component = non-deployable element inside container |
| C4GEN-07 | System generates C4-PlantUML syntax compatible with PlantUML rendering | C4-PlantUML stdlib include statements work with PlantUML server and local rendering |
| C4GEN-08 | System includes element metadata (technology choices, relationships, descriptions) in diagrams | All C4 macros support optional tech, descr, sprite, tags, and link parameters |
| INFRA-01 | System integrates ts-morph library for TypeScript static analysis | Project class supports tsconfig.json initialization, getImportDeclarations(), getClasses(), getInterfaces() |
| INFRA-02 | System uses ts-morph to extract classes, functions, and dependencies | getInstanceProperties(), getInstanceMethods(), getImplements(), getReferencedSourceFiles() |
| INFRA-03 | System upgrades @anthropic-ai/sdk to v0.78.0 | Current version is v0.59.0; v0.78.0+ adds prompt caching with cache_control parameter |
| INFRA-04 | System verifies PlantUML server supports C4-PlantUML library | Include `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_*.puml` or use stdlib `<C4/C4_*>` |
| INFRA-05 | System generates proper C4-PlantUML include statements in diagram code | Each level requires specific include: C4_Context.puml, C4_Container.puml, C4_Component.puml |
| UPDATE-05 | System implements level-aware caching (Context cached longer, Code cached shorter) | Context diagrams rarely change (system boundaries), Code diagrams change frequently (implementation details) |
</phase_requirements>

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | ^23.0.0+ | TypeScript AST analysis and manipulation | Most comprehensive TypeScript Compiler API wrapper (790 code examples, High reputation, mature API) |
| @anthropic-ai/sdk | ^0.78.0+ | Claude API integration with prompt caching | Official SDK with prompt caching support (90% cost reduction, 85% latency reduction for cached content) |
| C4-PlantUML | latest | C4 model diagram syntax for PlantUML | Official C4 model PlantUML implementation from plantuml-stdlib organization |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node-plantuml | 0.9.0 | PlantUML diagram rendering via Java CLI | Already in project; handles SVG generation from PlantUML code |
| plantuml-encoder | 1.4.0 | Encode PlantUML for URL-based rendering | Already in project; useful for PlantUML server URLs |
| tiktoken | 1.0.22 | Accurate token counting for OpenAI/Anthropic models | Already in project; needed for budget management and coverage metrics |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ts-morph | @typescript/ts-morph-api (direct Compiler API) | Lower-level, more complex API; ts-morph provides friendlier abstractions |
| C4-PlantUML | Structurizr DSL | Different syntax, requires separate rendering infrastructure; C4-PlantUML works with existing PlantUML setup |
| PlantUML | Mermaid C4 diagrams | Less mature C4 support, different syntax; PlantUML has official C4 library and project already uses it |
| Anthropic SDK caching | Manual token management | Requires custom cache implementation; SDK caching is built-in and optimized |

**Installation:**

```bash
# New dependencies to add
npm install ts-morph@^23.0.0
npm install @anthropic-ai/sdk@^0.78.0

# Already installed (verify versions)
npm list node-plantuml plantuml-encoder tiktoken
```

## Architecture Patterns

### Recommended Project Structure

```
src/main/services/
├── c4/
│   ├── c4AnalyzerService.ts         # Orchestrates C4 hierarchy generation
│   ├── staticAnalyzerService.ts     # ts-morph-based code extraction
│   ├── aiEnricherService.ts         # Claude-based architectural insights
│   ├── c4CacheService.ts            # Level-aware diagram caching
│   └── types/
│       ├── c4Types.ts               # C4 level enums, element types
│       └── analysisTypes.ts         # Static analysis result types
├── diagramGeneratorService.ts       # Existing (extend for C4 levels)
├── contextExtractorService.ts       # Existing (reuse for static analysis)
└── cacheService.ts                  # Existing (extend for level-aware TTL)

src/shared/types/
└── diagram.ts                       # Existing (extend for C4 levels)
```

### Pattern 1: Hybrid Analysis Pipeline

**What:** Combine deterministic static analysis with AI enrichment at each C4 level

**When to use:** For all C4 diagram generation to balance accuracy with insight

**Example:**

```typescript
// Source: Research synthesis from ts-morph + Anthropic SDK patterns
import { Project } from 'ts-morph';
import Anthropic from '@anthropic-ai/sdk';

class C4AnalyzerService {
  private static readonly CACHE_TTL = {
    context: 7 * 24 * 60 * 60 * 1000,    // 7 days - system boundaries rarely change
    container: 3 * 24 * 60 * 60 * 1000,  // 3 days - tech stack changes moderately
    component: 24 * 60 * 60 * 1000,      // 1 day - component structure changes regularly
    code: 6 * 60 * 60 * 1000             // 6 hours - implementation details change frequently
  };

  async generateContextDiagram(repoPath: string): Promise<string> {
    // Phase 1: Static analysis extracts facts
    const staticData = await this.extractStaticStructure(repoPath);

    // Phase 2: AI enriches with architectural insights
    const enrichedData = await this.enrichWithAI(staticData, 'context');

    // Phase 3: Generate C4-PlantUML syntax
    return this.generateC4PlantUML(enrichedData, 'context');
  }

  private async extractStaticStructure(repoPath: string) {
    const project = new Project({ tsConfigFilePath: `${repoPath}/tsconfig.json` });

    // Deterministic extraction using ts-morph
    return {
      entryPoints: this.findEntryPoints(project),
      externalDeps: this.findExternalDependencies(project),
      internalModules: this.findModules(project),
      technologies: this.detectTechnologies(project)
    };
  }

  private async enrichWithAI(staticData: any, level: 'context' | 'container' | 'component' | 'code') {
    const client = new Anthropic({ apiKey: this.apiKey });

    // Use prompt caching for large codebase context
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: this.getC4LevelSystemPrompt(level),
          cache_control: { type: 'ephemeral' } // Cache system prompt
        },
        {
          type: 'text',
          text: JSON.stringify(staticData),
          cache_control: { type: 'ephemeral' } // Cache static analysis
        }
      ],
      messages: [{ role: 'user', content: `Generate C4 ${level} diagram` }]
    });

    return response.content[0].text;
  }
}
```

### Pattern 2: Level-Aware Element ID Generation

**What:** Generate consistent element IDs across C4 levels to enable drill-down navigation

**When to use:** When creating diagram elements at any C4 level

**Example:**

```typescript
// Source: C4-PlantUML element aliasing + navigation requirements
class C4ElementIdService {
  // Context level: system-wide unique IDs
  generateSystemId(systemName: string): string {
    return `sys_${this.sanitize(systemName)}`;
  }

  // Container level: scoped to parent system
  generateContainerId(systemId: string, containerName: string): string {
    return `${systemId}_cnt_${this.sanitize(containerName)}`;
  }

  // Component level: scoped to parent container
  generateComponentId(containerId: string, componentName: string): string {
    return `${containerId}_cmp_${this.sanitize(componentName)}`;
  }

  // Code level: scoped to parent component
  generateClassId(componentId: string, className: string): string {
    return `${componentId}_cls_${this.sanitize(className)}`;
  }

  private sanitize(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }
}
```

### Pattern 3: C4-PlantUML Macro Usage

**What:** Use correct C4-PlantUML macros for each abstraction level

**When to use:** When generating PlantUML code for C4 diagrams

**Example:**

```typescript
// Source: https://github.com/plantuml-stdlib/C4-PlantUML
class C4PlantUMLGenerator {
  generateContextDiagram(systems: System[]): string {
    return `
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

title System Context Diagram for ${this.systemName}

' External actors
Person(user, "User", "End user of the system")
System_Ext(github, "GitHub", "Source code hosting")

' Target system
System(reef, "Reef", "Multi-repository GitHub desktop client")

' Relationships
Rel(user, reef, "Uses", "HTTPS")
Rel(reef, github, "Fetches repositories", "GitHub API")

@enduml
`;
  }

  generateContainerDiagram(containers: Container[]): string {
    return `
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

title Container Diagram for Reef

Person(user, "User")

System_Boundary(reef, "Reef") {
  Container(main, "Main Process", "Electron/Node.js", "Application lifecycle and IPC")
  Container(renderer, "Renderer Process", "React/TypeScript", "User interface")
  ContainerDb(store, "Config Store", "electron-store", "Application settings")
}

System_Ext(github, "GitHub API")

Rel(user, renderer, "Interacts with", "UI")
Rel(renderer, main, "Sends commands", "IPC")
Rel(main, github, "API calls", "HTTPS")
Rel(main, store, "Reads/writes", "File system")

@enduml
`;
  }
}
```

### Anti-Patterns to Avoid

- **Mixing abstraction levels:** Don't put components in Context diagrams or systems in Component diagrams. Each level has distinct elements.
- **Over-detailing early levels:** Context and Container diagrams should be high-level overviews, not exhaustive inventories.
- **Undefined abstraction levels:** Don't create "subcomponents" or other custom levels; stick to the four defined C4 levels.
- **External system internals:** In Context diagrams, external systems are black boxes; don't model their internal structure.
- **Bypassing static analysis:** Don't rely solely on AI to detect structure; use ts-morph for factual code relationships, AI for interpretation.
- **Ignoring cache invalidation:** Don't reuse cached Context diagrams when Container-level changes occur; implement smart invalidation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript AST parsing | Custom TypeScript parser using raw Compiler API | ts-morph | Handles TypeScript version compatibility, provides high-level abstractions, 790+ code examples |
| C4 diagram syntax | Custom PlantUML macro system | C4-PlantUML stdlib | Official C4 model implementation, standardized syntax, community support |
| Token counting | Character-based estimation (chars/4) | tiktoken library | Accurate token counting matching Anthropic's billing, handles special tokens |
| Prompt caching | Custom LRU cache for repeated prompts | Anthropic SDK cache_control | Built-in, optimized for API, automatic cache management, workspace-isolated |
| PlantUML rendering | Direct Java CLI invocation parsing | node-plantuml | Handles Java process management, error handling, streaming, already integrated |
| Element ID generation | Random UUIDs or sequential numbers | Hierarchical naming scheme | Enables parent-child navigation, human-readable, deterministic across regenerations |

**Key insight:** C4 modeling and TypeScript analysis have well-established solutions. Custom implementations risk compatibility issues, maintenance burden, and missing edge cases that mature libraries handle.

## Common Pitfalls

### Pitfall 1: Container vs Component Confusion

**What goes wrong:** Teams conflate containers (deployable units) with components (code organization)

**Why it happens:** Both represent "chunks" of the system, but at different abstraction levels

**How to avoid:**
- Container = runtime construct that can be deployed independently (Electron main process, renderer process, database)
- Component = code-level grouping that executes inside a container (services, stores, UI components)
- Ask: "Can this be deployed separately?" If yes, it's a Container; if no, it's a Component

**Warning signs:**
- Container diagram shows React components or service classes
- Component diagram shows separate applications or databases
- Unable to map containers to actual deployment units

### Pitfall 2: Token Budget Exhaustion on Large Codebases

**What goes wrong:** Attempting to analyze entire large codebase exceeds Claude's context window

**Why it happens:** Context window limits (200K tokens for Sonnet 4.5) can't fit all code from large projects

**How to avoid:**
- Implement file prioritization (critical > important > optional)
- Use coverage metrics to show "analyzed X% of Y files"
- Split analysis by focus area for detailed diagrams
- Cache static analysis results separately from AI enrichment

**Warning signs:**
- API errors about context length
- Incomplete diagrams missing key components
- High token costs without coverage visibility

### Pitfall 3: Cache Invalidation Timing

**What goes wrong:** Stale diagrams shown when code has changed, or excessive regeneration when code hasn't changed

**Why it happens:** All diagram levels cached with same TTL, or no change detection before regeneration

**How to avoid:**
- Level-aware TTL: Context (7 days) > Container (3 days) > Component (1 day) > Code (6 hours)
- Smart invalidation: check file mtimes against cache timestamp before serving cached diagram
- Cascade invalidation: Code changes invalidate Component cache, Component changes invalidate Container cache

**Warning signs:**
- User reports outdated diagrams after recent code changes
- High API costs despite minimal codebase changes
- Diagram regeneration on every page load

### Pitfall 4: !include Statement Security Blocking

**What goes wrong:** PlantUML service rejects C4-PlantUML include statements as security risk

**Why it happens:** Existing `plantUmlService.ts` blocks `!include`, `!includeurl`, `!import` directives

**How to avoid:**
- Whitelist official C4-PlantUML URLs: `https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/*`
- Use PlantUML stdlib syntax: `!include <C4/C4_Context>` (requires PlantUML 1.2019.5+)
- Document security rationale for whitelist exceptions

**Warning signs:**
- Generated C4 diagrams fail with "Security: potentially dangerous directive" error
- C4 macros not recognized in rendered diagrams
- Manual testing with C4-PlantUML examples fails

### Pitfall 5: Missing Technology Metadata in Container Diagrams

**What goes wrong:** Container diagrams show boxes without indicating tech stack (React, Node.js, SQLite)

**Why it happens:** Static analysis doesn't detect runtime technologies, AI guesses incorrectly

**How to avoid:**
- Use package.json dependencies to infer tech stack
- Detect framework patterns: React (JSX), Electron (main/renderer), Express (app.listen)
- Provide tech parameter in all C4 Container macros: `Container(id, label, "React 18", description)`

**Warning signs:**
- Container diagrams missing tech column in subsequent documentation
- Team asks "what technology is this component using?"
- Confusion about which containers are frontend vs backend

### Pitfall 6: Inefficient ts-morph Project Initialization

**What goes wrong:** Loading entire TypeScript project with all dependencies causes memory issues or slow performance

**Why it happens:** ts-morph loads all files referenced by tsconfig.json, including node_modules type definitions

**How to avoid:**
- Use `skipFileDependencyResolution: true` in Project options to avoid loading node_modules
- Add source files selectively: `project.addSourceFilesAtPaths('src/**/*.ts')`
- Avoid calling type checker methods unless needed for analysis
- Use `forgetNodesCreatedInBlock()` for memory management in loops

**Warning signs:**
- High memory usage during static analysis
- Slow diagram generation times (>30 seconds for medium codebases)
- Out of memory errors during analysis

## Code Examples

Verified patterns from official sources:

### Extract TypeScript Project Structure with ts-morph

```typescript
// Source: https://github.com/dsherret/ts-morph (Context7 verified)
import { Project } from 'ts-morph';

class StaticAnalyzerService {
  async analyzeProject(repoPath: string) {
    const project = new Project({
      tsConfigFilePath: `${repoPath}/tsconfig.json`,
      skipFileDependencyResolution: true // Avoid loading node_modules
    });

    // Add only source files (not node_modules)
    project.addSourceFilesAtPaths(`${repoPath}/src/**/*.{ts,tsx}`);

    const structure = {
      classes: this.extractClasses(project),
      interfaces: this.extractInterfaces(project),
      imports: this.extractImports(project),
      exports: this.extractExports(project)
    };

    return structure;
  }

  private extractClasses(project: Project) {
    const classes = [];

    for (const sourceFile of project.getSourceFiles()) {
      for (const classDecl of sourceFile.getClasses()) {
        classes.push({
          name: classDecl.getName(),
          file: sourceFile.getFilePath(),
          methods: classDecl.getInstanceMethods().map(m => m.getName()),
          properties: classDecl.getInstanceProperties().map(p => p.getName()),
          implements: classDecl.getImplements().map(i => i.getText()),
          isExported: classDecl.isExported()
        });
      }
    }

    return classes;
  }

  private extractImports(project: Project) {
    const imports = [];

    for (const sourceFile of project.getSourceFiles()) {
      const importDeclarations = sourceFile.getImportDeclarations();

      for (const importDecl of importDeclarations) {
        imports.push({
          moduleSpecifier: importDecl.getModuleSpecifierValue(),
          file: sourceFile.getFilePath(),
          namedImports: importDecl.getNamedImports().map(i => i.getName()),
          defaultImport: importDecl.getDefaultImport()?.getText()
        });
      }
    }

    return imports;
  }
}
```

### Use Anthropic Prompt Caching for Large Context

```typescript
// Source: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
import Anthropic from '@anthropic-ai/sdk';

class AIEnricherService {
  private client: Anthropic;

  async enrichArchitecture(staticData: any, level: string): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: this.getC4SystemPrompt(level),
          cache_control: { type: 'ephemeral' } // Cache system prompt across requests
        },
        {
          type: 'text',
          text: JSON.stringify(staticData),
          cache_control: { type: 'ephemeral' } // Cache static analysis data
        }
      ],
      messages: [
        {
          role: 'user',
          content: `Analyze this ${level}-level architecture and identify key architectural insights.`
        }
      ]
    });

    // Cache read tokens cost 0.1x base input token price
    console.log('Token usage:', response.usage);
    // { input_tokens: 150, cache_creation_input_tokens: 5000, cache_read_input_tokens: 0 }

    return response.content[0].text;
  }

  private getC4SystemPrompt(level: string): string {
    // System prompt explaining C4 level abstractions
    // This will be cached and reused across multiple requests
    return `You are a C4 architecture expert...`;
  }
}
```

### Generate C4-PlantUML Diagrams

```typescript
// Source: https://github.com/plantuml-stdlib/C4-PlantUML (WebFetch verified)
class C4DiagramGenerator {
  generateContextDiagram(systems: SystemData): string {
    const elements = systems.external.map(sys =>
      `System_Ext(${sys.id}, "${sys.name}", "${sys.description}")`
    ).join('\n');

    const relationships = systems.relationships.map(rel =>
      `Rel(${rel.from}, ${rel.to}, "${rel.label}", "${rel.tech}")`
    ).join('\n');

    return `
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

title System Context Diagram

Person(user, "User", "Application user")
System(${systems.target.id}, "${systems.target.name}", "${systems.target.description}")

${elements}

${relationships}

SHOW_LEGEND()
@enduml
`.trim();
  }

  generateContainerDiagram(containers: ContainerData): string {
    const containerElements = containers.items.map(c =>
      c.type === 'database'
        ? `ContainerDb(${c.id}, "${c.name}", "${c.tech}", "${c.description}")`
        : `Container(${c.id}, "${c.name}", "${c.tech}", "${c.description}")`
    ).join('\n  ');

    return `
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

title Container Diagram

System_Boundary(${containers.systemId}, "${containers.systemName}") {
  ${containerElements}
}

' External dependencies
${containers.external.map(e => `System_Ext(${e.id}, "${e.name}")`).join('\n')}

' Relationships
${containers.relationships.map(r => `Rel(${r.from}, ${r.to}, "${r.label}")`).join('\n')}

@enduml
`.trim();
  }
}
```

### Implement Level-Aware Caching

```typescript
// Source: Research synthesis from caching best practices
class C4CacheService {
  private static readonly TTL = {
    context: 7 * 24 * 60 * 60 * 1000,    // 7 days
    container: 3 * 24 * 60 * 60 * 1000,  // 3 days
    component: 24 * 60 * 60 * 1000,      // 1 day
    code: 6 * 60 * 60 * 1000             // 6 hours
  };

  async getCachedDiagram(
    repoPath: string,
    level: C4Level,
    elementId?: string
  ): Promise<string | null> {
    const cacheKey = this.generateCacheKey(repoPath, level, elementId);
    const cached = await this.cache.get(cacheKey);

    if (!cached) return null;

    // Check if cache is stale based on file changes
    const isStale = await this.isCacheStale(repoPath, level, cached.timestamp);
    if (isStale) {
      await this.cache.delete(cacheKey);
      return null;
    }

    return cached.diagram;
  }

  private async isCacheStale(
    repoPath: string,
    level: C4Level,
    cacheTimestamp: number
  ): Promise<boolean> {
    // Get relevant file patterns for each level
    const patterns = this.getRelevantFilePatterns(level);

    for (const pattern of patterns) {
      const files = await glob(pattern, { cwd: repoPath });

      for (const file of files) {
        const stat = await fs.stat(path.join(repoPath, file));
        if (stat.mtimeMs > cacheTimestamp) {
          return true; // Cache is stale
        }
      }
    }

    return false; // Cache is still fresh
  }

  private getRelevantFilePatterns(level: C4Level): string[] {
    switch (level) {
      case 'context':
        // Context cares about high-level structure
        return ['package.json', 'tsconfig.json', 'src/**/main.*'];
      case 'container':
        // Container cares about major architectural files
        return ['package.json', 'src/main/**', 'src/renderer/**'];
      case 'component':
        // Component cares about module structure
        return ['src/**/*.ts', 'src/**/*.tsx'];
      case 'code':
        // Code cares about implementation details
        return ['src/**/*.ts', 'src/**/*.tsx'];
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic UML diagrams | C4 model hierarchy | C4 introduced 2018, gained traction 2020-2023 | Standardized abstraction levels, better audience-specific views |
| Manual diagram maintenance | AI-enriched auto-generation | AI code analysis matured 2023-2024 | Diagrams stay synchronized with code changes |
| Character-based token estimation | Accurate token counting (tiktoken) | Anthropic/OpenAI adopted 2023 | Precise budget management, predictable costs |
| No prompt caching | Ephemeral prompt caching | Anthropic added Feb 2024 | 90% cost reduction for repeated context |
| Raw TypeScript Compiler API | ts-morph wrapper | ts-morph stable since 2019 | Easier AST navigation, version compatibility |
| PlantUML server-side only | Local Java + server fallback | node-plantuml allows local rendering | Works offline, faster for development |

**Deprecated/outdated:**
- **Generic component/class diagrams without C4 levels:** Replaced by C4 hierarchy providing consistent abstraction
- **!includeurl without security restrictions:** Modern PlantUML services block arbitrary includes; use stdlib or whitelisted URLs
- **Organization-level prompt cache isolation:** Changed to workspace-level isolation Feb 5, 2026 for better multi-tenant support
- **Anthropic SDK <0.78.0:** Pre-caching versions lack cost optimization essential for large codebase analysis

## Open Questions

1. **How to handle monorepo subprojects in Context diagrams?**
   - What we know: C4 Context shows system in environment; monorepos contain multiple systems
   - What's unclear: Should each subproject be separate System or components of one System?
   - Recommendation: Treat each independently deployable subproject as separate System in Context; share Container/Component diagrams within system boundary

2. **Code diagram coverage strategy for large classes**
   - What we know: Full class diagrams for large codebases exceed PlantUML rendering limits
   - What's unclear: Best strategy for partial Code diagrams (by namespace? by dependency depth?)
   - Recommendation: Generate Code diagrams per-Component, showing only classes directly in that component's namespace; provide "expand" option to include dependencies

3. **Handling Electron's multi-process architecture in Container diagram**
   - What we know: Electron has main process, renderer process, preload script
   - What's unclear: Are these separate Containers (deployable units) or Components (code organization)?
   - Recommendation: Treat as separate Containers; they run in different processes with distinct lifecycles and can be analyzed/deployed independently

4. **AI hallucination detection for architectural insights**
   - What we know: AI can invent relationships or misinterpret code structure
   - What's unclear: How to validate AI-generated architectural insights against static analysis facts
   - Recommendation: Phase 1 implementation should cross-check AI-generated relationships against ts-morph dependency graph; flag mismatches for human review

## Sources

### Primary (HIGH confidence)

- [ts-morph Context7 documentation](/dsherret/ts-morph) - TypeScript AST manipulation, project setup, class/interface extraction
- [Anthropic SDK TypeScript Context7](/anthropics/anthropic-sdk-typescript) - Prompt caching API, message creation, timeout configuration
- [C4 model official website](https://c4model.com/) - C4 level definitions, abstraction principles, diagram types
- [C4-PlantUML GitHub repository](https://github.com/plantuml-stdlib/C4-PlantUML) - Macro syntax, include statements, element parameters
- [PlantUML C4 documentation](https://crashedmind.github.io/PlantUMLHitchhikersGuide/C4/C4Stdlib.html) - Stdlib usage, layout options, best practices

### Secondary (MEDIUM confidence)

- [C4 Model Architecture Explained (Miro)](https://miro.com/diagramming/c4-model-for-software-architecture/) - Use cases, benefits, practical examples
- [Misuses and Mistakes of the C4 model](https://www.workingsoftware.dev/misuses-and-mistakes-of-the-c4-model/) - Common pitfalls, container vs component confusion
- [C4 Model Practical Tips (Revision)](https://revision.app/blog/practical-c4-modeling-tips) - Best practices per level, detail balance
- [Anthropic Prompt Caching Documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) - Pricing, cache control, workspace isolation
- [ts-morph Performance Documentation](https://ts-morph.com/manipulation/performance) - Memory management, batching operations, optimization techniques
- [Claude 1M Token Context Guide (NxCode)](https://www.nxcode.io/resources/news/claude-1m-token-context-codebase-analysis-guide-2026) - Large codebase analysis, token budget strategies

### Tertiary (LOW confidence - validation recommended)

- [AI-Enhanced Static Analysis (IEEE)](https://ieeexplore.ieee.org/document/11058686/) - Hybrid analysis approaches, false alarm reduction
- [TypeScript Performance in Large-Scale Projects (Medium)](https://medium.com/@an.chmelev/typescript-performance-and-type-optimization-in-large-scale-projects-18e62bd37cfb) - ts-morph memory optimization patterns
- [AI Tokens Budget Management (Deloitte)](https://www.deloitte.com/us/en/insights/topics/emerging-technologies/ai-tokens-how-to-navigate-spend-dynamics.html) - Cost governance, token consumption patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ts-morph and C4-PlantUML are official, well-documented libraries with strong community adoption
- Architecture: HIGH - Hybrid analysis pattern is validated by existing Reef services and industry best practices
- Pitfalls: HIGH - Container/Component confusion documented in official C4 model FAQ; caching issues verified through Anthropic docs

**Research date:** 2026-02-21
**Valid until:** 2026-03-23 (30 days - stable domain, C4 model is mature standard)

**Key findings requiring planner attention:**
1. Existing `plantUmlService.ts` blocks `!include` statements needed for C4-PlantUML (requires security whitelist)
2. Current `@anthropic-ai/sdk` is v0.59.0, needs upgrade to v0.78.0+ for prompt caching
3. Level-aware TTL (7d/3d/1d/6h) crucial for cost management
4. C4 Code level uses standard PlantUML class diagrams, not C4-specific syntax
5. Electron's multi-process architecture maps cleanly to Container-level abstraction (main, renderer, preload as separate containers)
