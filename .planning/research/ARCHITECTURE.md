# Architecture Research

**Domain:** C4 Diagram Generation Systems
**Researched:** 2026-02-21
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Settings   │  │  Diagram     │  │ Navigation  │  │  Export    │ │
│  │ UI         │  │  Viewer      │  │ Controls    │  │  Actions   │ │
│  └─────┬──────┘  └──────┬───────┘  └──────┬──────┘  └─────┬──────┘ │
│        │                │                 │                │        │
├────────┴────────────────┴─────────────────┴────────────────┴────────┤
│                      ORCHESTRATION LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               Diagram Generation Orchestrator                │   │
│  │  - Manages C4 level hierarchy (Context→Container→Component)  │   │
│  │  - Handles state transitions between levels                  │   │
│  │  - Coordinates code analysis → AI generation → rendering     │   │
│  └───────────────────────┬──────────────────────────────────────┘   │
│                          │                                           │
├──────────────────────────┴───────────────────────────────────────────┤
│                        SERVICE LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Code       │  │   AI/LLM     │  │   Cache      │              │
│  │   Analysis   │  │   Service    │  │   Service    │              │
│  │   Service    │  │              │  │              │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         ↓                 ↓                 ↓                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  AST Parser  │  │  Anthropic   │  │   SQLite     │              │
│  │  (optional)  │  │  Claude API  │  │   Database   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
├─────────────────────────────────────────────────────────────────────┤
│                        RENDERING LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    PlantUML Renderer                         │   │
│  │  - Converts C4-PlantUML syntax to SVG diagrams              │   │
│  │  - Supports local (Java) or server-based rendering          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Settings UI** | Collects user preferences (diagram type, C4 level, detail, focus area, AI model) | React component with form controls |
| **Diagram Viewer** | Displays rendered diagrams with zoom/pan/fullscreen controls | React component wrapping SVG renderer |
| **Navigation Controls** | Enables drill-down/drill-up between C4 hierarchy levels | React component with breadcrumb + clickable elements |
| **Export Actions** | Saves diagrams as SVG/PNG files | Browser download API integration |
| **Diagram Generation Orchestrator** | Coordinates workflow: code analysis → AI generation → caching → rendering | Service class managing state machine |
| **Code Analysis Service** | Scans repository, prioritizes files, extracts relevant code context | File system traversal + heuristic filtering |
| **AST Parser (Optional)** | Parses code into Abstract Syntax Trees for deterministic structure extraction | Language-specific parsers (ANTLR, Espree, etc.) |
| **AI/LLM Service** | Converts code context into C4-PlantUML diagram syntax using LLM | Anthropic Claude API client |
| **Cache Service** | Stores/retrieves previously generated diagrams to reduce costs and latency | SQLite database with hash-based invalidation |
| **PlantUML Renderer** | Converts PlantUML text to visual SVG diagrams | Local Java process or HTTP server API |

## Recommended Project Structure

```
src/
├── main/                           # Electron main process (Node.js)
│   ├── services/
│   │   ├── contextExtractorService.ts    # Code analysis & file prioritization
│   │   ├── diagramGeneratorService.ts    # AI-powered diagram generation
│   │   ├── cacheService.ts               # Diagram caching with SQLite
│   │   ├── plantUmlService.ts            # PlantUML rendering (local/server)
│   │   ├── c4HierarchyService.ts         # [NEW] C4 level management & navigation
│   │   └── astParserService.ts           # [NEW] Optional static code analysis
│   └── handlers/
│       └── diagramHandlers.ts            # IPC communication handlers
├── renderer/                       # React UI (browser)
│   ├── components/
│   │   ├── tabs/
│   │   │   └── VisualMapTab.tsx          # Main diagram UI container
│   │   ├── DiagramViewer/
│   │   │   ├── DiagramViewer.tsx         # Diagram display + controls
│   │   │   ├── C4Navigator.tsx           # [NEW] Hierarchy drill-down UI
│   │   │   └── DiagramSettings.tsx       # Generation options form
│   │   └── PlantUMLRenderer.tsx          # SVG rendering component
│   ├── stores/
│   │   └── diagramStore.ts               # [NEW] C4 hierarchy state management
│   └── hooks/
│       └── useC4Navigation.ts            # [NEW] Navigation state logic
└── shared/
    ├── types/
    │   ├── diagram.ts                    # Diagram-related types
    │   └── c4.ts                         # [NEW] C4-specific types
    └── constants/
        └── c4Levels.ts                   # [NEW] C4 hierarchy configuration
```

### Structure Rationale

- **Main/Renderer Separation:** Follows Electron's multi-process architecture (security + performance)
- **Service Layer Isolation:** Each service has single responsibility, testable in isolation
- **C4-Specific Services:** New `c4HierarchyService` manages level transitions and maintains parent-child relationships between diagrams
- **Shared Types:** C4 types defined once, used in both main and renderer processes
- **Optional AST Parser:** Static analysis can supplement or replace LLM for deterministic structure extraction (cost savings)

## Architectural Patterns

### Pattern 1: Hybrid Code Analysis (Static + AI)

**What:** Combines deterministic static analysis with AI-powered semantic understanding

**When to use:** When you need cost-effective diagram generation with high accuracy

**Trade-offs:**
- **Pros:** Lower AI costs (smaller context), faster generation, deterministic structure
- **Cons:** More complex implementation, requires language-specific parsers

**Example:**
```typescript
// Static analysis extracts deterministic structure
const staticStructure = await astParserService.extractStructure(repoPath, {
  targetLanguages: ['typescript', 'javascript'],
  extractTypes: ['classes', 'interfaces', 'functions', 'imports']
});

// AI enriches with architectural insights and relationships
const enrichedContext = `
STATIC STRUCTURE:
${JSON.stringify(staticStructure, null, 2)}

ADDITIONAL CONTEXT:
${codeSnippets}
`;

const diagram = await aiService.generateC4Diagram(enrichedContext, {
  level: 'container',
  focus: 'enrich-relationships' // AI focuses on what static analysis can't determine
});
```

**Sources:**
- [AI-Assisted Software Architecture](https://www.workingsoftware.dev/ai-assisted-software-architecture-generating-the-c4-model-and-views-directly-from-code/) - 88% accuracy with AST + LLM approach
- [ArchAgent](https://arxiv.org/html/2601.13007) - Combines static analysis with LLM-powered synthesis

### Pattern 2: C4 Hierarchy State Machine

**What:** Manages transitions between C4 levels (Context → Container → Component → Code) with parent-child relationships

**When to use:** For implementing drill-down navigation in C4 diagrams

**Trade-offs:**
- **Pros:** Maintains coherent hierarchy, enables efficient regeneration of specific levels, clear navigation UX
- **Cons:** More complex state management, requires careful cache invalidation

**Example:**
```typescript
interface C4HierarchyNode {
  level: 'context' | 'container' | 'component' | 'code';
  elementId: string; // e.g., "UserService" container
  parentId?: string; // Link to parent level element
  diagram: string; // PlantUML code
  metadata: DiagramMetadata;
  children?: C4HierarchyNode[]; // Child elements that can be drilled into
}

class C4HierarchyService {
  private hierarchyMap: Map<string, C4HierarchyNode> = new Map();

  async drillDown(currentNode: C4HierarchyNode, targetElement: string) {
    // Find or generate next level diagram focused on target element
    const childLevel = this.getNextLevel(currentNode.level);
    const childNode = await this.getOrGenerateNode(
      childLevel,
      targetElement,
      currentNode.elementId // parent reference
    );

    return childNode;
  }

  private getNextLevel(current: C4Level): C4Level | null {
    const hierarchy = ['context', 'container', 'component', 'code'];
    const currentIndex = hierarchy.indexOf(current);
    return hierarchy[currentIndex + 1] as C4Level || null;
  }
}
```

**Sources:**
- [C4 Model Official](https://c4model.com/) - Hierarchical approach to software architecture
- [Hierarchy Drill-Down Implementation](https://dev3lop.com/implementing-drill-down-navigation-in-hierarchical-visualizations/)

### Pattern 3: Cache-First Generation with Invalidation

**What:** Check cache before expensive AI generation, invalidate based on file change hashing

**When to use:** Always — caching is critical for performance and cost control

**Trade-offs:**
- **Pros:** Massive cost savings (avoid repeat API calls), faster user experience
- **Cons:** Stale diagrams if invalidation logic is wrong, storage overhead

**Example:**
```typescript
async generateDiagram(repoPath: string, options: C4DiagramOptions) {
  // 1. Generate hash from critical files + settings
  const criticalFiles = await contextExtractor.getCriticalFiles(repoPath);
  const repoHash = await cacheService.generateRepoHash(repoPath, criticalFiles);
  const cacheKey = `${repoHash}-${options.level}-${options.focusArea}`;

  // 2. Check cache
  const cached = await cacheService.get(cacheKey);
  if (cached && !this.shouldRegenerateDespiteCache(cached)) {
    return { ...cached, fromCache: true };
  }

  // 3. Generate fresh diagram
  const context = await contextExtractor.extract(repoPath, options);
  const diagram = await aiService.generate(context, options);

  // 4. Store in cache with metadata
  await cacheService.store(cacheKey, {
    diagram,
    repoHash,
    options,
    timestamp: Date.now(),
    tokensUsed: diagram.tokensUsed
  });

  return { ...diagram, fromCache: false };
}
```

**Sources:**
- Existing Reef implementation (cacheService.ts)
- [Caching Strategies for Performance Optimization](https://namastedev.com/blog/caching-strategies-for-performance-optimization/)

### Pattern 4: Progressive Context Loading

**What:** Load code context in priority order (critical → important → optional) up to token budget

**When to use:** For large codebases that exceed LLM context windows

**Trade-offs:**
- **Pros:** Works with any codebase size, predictable costs
- **Cons:** May miss relevant code in "optional" tier, requires good heuristics

**Example:**
```typescript
class ContextExtractorService {
  private readonly PRIORITY_PATTERNS = {
    critical: [/main\.(ts|js)$/, /index\.(ts|js)$/, /\/api\//],
    important: [/package\.json$/, /\/services\//, /\/models\//],
    optional: [/\/utils\//, /\/helpers\//]
  };

  async extract(repoPath: string, maxTokens: number) {
    const allFiles = await this.scanRepository(repoPath);
    const prioritized = this.assignPriorities(allFiles);

    let context = '';
    let tokens = 0;

    // Add critical files first (always included if under budget)
    for (const file of prioritized.critical) {
      const fileTokens = this.estimateTokens(file);
      if (tokens + fileTokens <= maxTokens) {
        context += this.formatFile(file);
        tokens += fileTokens;
      }
    }

    // Add important files if budget allows
    for (const file of prioritized.important) {
      const fileTokens = this.estimateTokens(file);
      if (tokens + fileTokens <= maxTokens) {
        context += this.formatFile(file);
        tokens += fileTokens;
      }
    }

    // Add optional files if budget still allows
    for (const file of prioritized.optional) {
      const fileTokens = this.estimateTokens(file);
      if (tokens + fileTokens <= maxTokens) {
        context += this.formatFile(file);
        tokens += fileTokens;
      } else {
        break; // Stop when budget exhausted
      }
    }

    return { context, tokensUsed: tokens };
  }
}
```

**Sources:**
- Existing Reef implementation (contextExtractorService.ts)
- [Codebase Digest](https://github.com/kamilstanuch/codebase-digest) - AI-friendly codebase packing

## Data Flow

### Request Flow: Diagram Generation

```
[User Selects Settings]
    ↓ (diagramType, level, focusArea, model)
[UI Layer] → [IPC Channel] → [Main Process]
    ↓
[Diagram Generation Orchestrator]
    ↓
    ├→ [Check Cache] ────────────────┐
    │   ↓ (cache miss)                │
    │   [Code Analysis Service]       │ (cache hit)
    │   ↓                              │
    │   [File Scanner] → [Prioritizer] → [Context Builder]
    │   ↓ (formatted context)          │
    │   [AI/LLM Service]               │
    │   ↓ (generate C4-PlantUML)      │
    │   [Anthropic Claude API]         │
    │   ↓ (PlantUML code)              │
    │   [Store in Cache] ──────────────┘
    ↓
[PlantUML Renderer]
    ↓
    ├→ [Local Java Process] (if Java installed)
    └→ [HTTP Server API] (fallback)
    ↓ (SVG)
[IPC Channel] → [UI Layer]
    ↓
[Diagram Viewer Component] → [Display SVG]
```

### State Management: C4 Hierarchy Navigation

```
[DiagramStore] (Zustand or similar)
    ├─ currentLevel: 'context' | 'container' | 'component' | 'code'
    ├─ hierarchyStack: C4HierarchyNode[]
    ├─ activeDiagram: string (PlantUML code)
    └─ navigationHistory: BreadcrumbItem[]
    ↓ (user clicks element in diagram)
[useC4Navigation Hook]
    ↓ (identifies clicked element)
[C4 Hierarchy Service]
    ↓ (determines target level)
    ├→ [Check if child diagram cached]
    └→ [Generate child diagram with focus on clicked element]
    ↓ (new diagram)
[Update DiagramStore]
    ↓
[Re-render Diagram Viewer]
```

### Key Data Flows

1. **Settings → Generation:** User preferences flow through validation → IPC → service layer, controlling all generation parameters
2. **Code → Context:** Repository files are scanned, filtered, prioritized, and formatted into structured LLM-friendly context
3. **Context → Diagram:** LLM receives context + C4-specific prompt → generates PlantUML code → validated → cached
4. **PlantUML → SVG:** PlantUML code converted to visual SVG either locally (Java) or remotely (server)
5. **Cache Invalidation:** File changes trigger hash recalculation → cache key mismatch → regeneration
6. **Drill-Down:** User clicks diagram element → identify element ID → check cache for child diagram → generate if needed → display with navigation breadcrumb

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **1-10 repositories** | Current architecture sufficient. Local caching handles well. |
| **10-100 repositories** | Consider cache size limits (LRU eviction). May need database indexing optimization. |
| **100-1000 repositories** | Implement background cache warming for frequently accessed repos. Consider moving cache to external database for multi-machine access. |
| **Enterprise (1000+ repos)** | Dedicated caching server, queue-based diagram generation, batch processing for bulk regeneration, possibly self-hosted LLM to reduce API costs. |

### Scaling Priorities

1. **First bottleneck:** LLM API rate limits and costs
   - **Fix:** Aggressive caching, incremental updates (only regenerate changed containers), batch processing with queue

2. **Second bottleneck:** Large monorepos exceed token limits
   - **Fix:** Implement AST-based static analysis to reduce context size, generate diagrams per module/package, combine with stitching logic

3. **Third bottleneck:** PlantUML rendering performance
   - **Fix:** Parallelize rendering, use local Java process pool, pre-render common diagrams in background

## Anti-Patterns

### Anti-Pattern 1: Full Codebase in Every Request

**What people do:** Send entire repository code to LLM for every diagram generation

**Why it's wrong:**
- Exceeds token limits on large repos
- Massive API costs
- Slow generation times
- Includes irrelevant code (tests, configs, dependencies)

**Do this instead:**
- Implement priority-based file selection (critical → important → optional)
- Use focus area to filter relevant files
- Respect token budgets strictly
- Cache aggressively to avoid repeat requests

### Anti-Pattern 2: Stateless C4 Hierarchy

**What people do:** Treat each C4 level as independent diagram generation with no relationship tracking

**Why it's wrong:**
- Inconsistent element names across levels (Context "API" vs Container "ApiService")
- Cannot drill down coherently (parent-child relationships unknown)
- Regenerating parent level breaks child diagrams
- Poor UX (no breadcrumb navigation, no way to go back)

**Do this instead:**
- Maintain C4HierarchyNode tree structure with parent references
- Pass parent context when generating child diagrams
- Store hierarchy metadata in cache alongside diagrams
- Implement breadcrumb navigation with stack-based state

### Anti-Pattern 3: Cache Without Invalidation

**What people do:** Cache diagrams indefinitely without detecting code changes

**Why it's wrong:**
- Shows stale diagrams that don't match current code
- Users don't trust the tool
- No way to force refresh when needed

**Do this instead:**
- Generate hash from critical file paths + modification times + file sizes
- Include hash in cache key
- Provide manual "Regenerate" button
- Show cache metadata (age, hash) in UI so users can see freshness

### Anti-Pattern 4: Single LLM Call for All C4 Levels

**What people do:** Ask LLM to generate Context + Container + Component + Code diagrams in one request

**Why it's wrong:**
- Overwhelming complexity for LLM (hallucinations increase)
- All-or-nothing generation (one error ruins everything)
- Cannot customize detail level per hierarchy level
- Breaks drill-down interaction (all levels generated upfront)

**Do this instead:**
- Generate one C4 level at a time
- Use previous level's output as context for next level
- Allow users to drill down on-demand (lazy generation)
- Tailor prompts specifically to each level's purpose

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Anthropic Claude API** | REST API with SDK client | Use haiku-3 for cost efficiency, sonnet-3.5 for quality. Implement rate limiting and retry logic. |
| **PlantUML Server** | HTTP API (self-hosted or public) | Prefer local Java process for security. Fall back to server for users without Java. |
| **GitHub API (optional)** | REST API via Octokit | For fetching remote repository metadata, not required for local repos. |
| **Local Java Runtime** | Child process execution | Check availability at startup. Graceful fallback to server mode. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Main ↔ Renderer** | Electron IPC (contextBridge) | All diagram operations cross this boundary. Use typed channels. |
| **Service Layer ↔ Cache** | Direct function calls | Synchronous cache reads, asynchronous writes. |
| **Code Analysis ↔ File System** | Node.js fs/promises | Async file operations with error handling. Validate paths to prevent traversal attacks. |
| **AI Service ↔ Cache** | Direct function calls | Check cache before AI call, store after. |
| **PlantUML Renderer ↔ UI** | Component props | SVG string passed as prop. Viewer handles zoom/pan locally. |

## Build Order Recommendations

Based on dependencies and risk reduction:

### Phase 1: Foundation (Week 1-2)
1. **C4 Type Definitions** - Define C4Level, C4HierarchyNode, C4DiagramOptions types
2. **Extend Existing Services** - Modify diagramGeneratorService to support C4-specific prompts
3. **Basic C4 Context Generation** - Implement simplest level first (System Context)

**Why first:** Establishes contracts, can be tested independently, minimal changes to existing code

### Phase 2: Hierarchy Management (Week 2-3)
1. **C4HierarchyService** - State machine for level transitions
2. **Update Cache Schema** - Add parent_id, element_id, level columns to cache
3. **DiagramStore** - Zustand store for hierarchy navigation state

**Why second:** Depends on types from Phase 1, core logic needed before UI

### Phase 3: Navigation UI (Week 3-4)
1. **C4Navigator Component** - Breadcrumb + drill-down controls
2. **Clickable Diagram Elements** - Enhance PlantUML parsing to identify clickable regions
3. **Navigation Hooks** - useC4Navigation for state management

**Why third:** Depends on hierarchy service, pure UI layer

### Phase 4: Generation Quality (Week 4-5)
1. **C4-Specific Prompts** - Refine prompts for each level with C4-PlantUML syntax
2. **Context Enrichment** - Add focus area filtering specific to C4 levels
3. **Validation** - Ensure C4-PlantUML syntax compliance

**Why fourth:** Can iterate on quality without breaking core functionality

### Phase 5: Optional Enhancements (Week 5+)
1. **AST Parser Integration** - Static analysis to supplement/replace LLM
2. **Automatic Regeneration** - File watcher triggers re-generation
3. **Export Enhancements** - Multi-level export, documentation generation

**Why last:** Nice-to-have features, not blocking for MVP

## Sources

### C4 Model & Standards
- [C4 Model Official](https://c4model.com/) - Authoritative C4 model documentation
- [C4-PlantUML GitHub](https://github.com/plantuml-stdlib/C4-PlantUML) - Standard library for C4 diagrams with PlantUML
- [C4 Model Wikipedia](https://en.wikipedia.org/wiki/C4_model) - Overview and history

### Automated C4 Generation
- [AI-Assisted Software Architecture](https://www.workingsoftware.dev/ai-assisted-software-architecture-generating-the-c4-model-and-views-directly-from-code/) - LLM-based C4 generation
- [ArchAgent Research](https://arxiv.org/html/2601.13007) - Scalable architecture recovery with LLMs (88% accuracy)
- [C4InterFlow](https://www.c4interflow.com/) - Framework for automated C4 generation
- [Medium: Generative AI for C4 Diagrams](https://medium.com/@sauravskit749/architectural-intelligence-using-generative-ai-to-automatically-derive-c4-diagrams-from-source-6d908901af7a)

### Code Analysis & AST
- [Static Analysis using ASTs](https://medium.com/hootsuite-engineering/static-analysis-using-asts-ebcd170c955e) - Hootsuite Engineering
- [The Art of Static Code Analysis](https://javapro.io/2025/02/04/the-art-of-static-code-analysis/) - JAVAPRO International

### LLM Code Understanding
- [How to Extract and Analyze a Codebase with LLMs](https://advanced-stack.com/archives/resources/how-to-extract-and-analyze-a-code-base-with-llms.html)
- [Large Language Models for Source Code Analysis](https://arxiv.org/html/2503.17502v1)
- [Codebase Digest GitHub](https://github.com/kamilstanuch/codebase-digest) - AI-friendly codebase packer

### Hierarchical Navigation
- [Implementing Drill-Down Navigation](https://dev3lop.com/implementing-drill-down-navigation-in-hierarchical-visualizations/)
- [amCharts Hierarchy Drill-Down](https://www.amcharts.com/docs/v5/charts/hierarchy/hierarchy-drill-down/)

### Caching Strategies
- [Caching Strategies for Performance Optimization](https://namastedev.com/blog/caching-strategies-for-performance-optimization/)
- [AWS Caching Patterns with Redis](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html)

### PlantUML Integration
- [C4-PlantUML Documentation](https://plantuml-stdlib.github.io/C4-PlantUML/)
- [The Hitchhiker's Guide to PlantUML - C4 Section](https://crashedmind.github.io/PlantUMLHitchhikersGuide/C4/c4.html)

---
*Architecture research for: C4 Diagram Generation Systems*
*Researched: 2026-02-21*
