# Architecture Research

**Domain:** C4 Diagram Quality and Rendering — Electron Desktop App (v1.2)
**Researched:** 2026-03-02
**Confidence:** HIGH (based on direct codebase analysis)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MAIN PROCESS (Node.js)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  C4 GENERATION PIPELINE                        │  │
│  │  ┌──────────────┐   ┌───────────────┐   ┌──────────────────┐ │  │
│  │  │ Static       │──▶│ AI Enrichment │──▶│ PlantUML         │ │  │
│  │  │ Analyzer     │   │ Service       │   │ Generator        │ │  │
│  │  │ (ts-morph)   │   │ (Claude API)  │   │ (syntax gen)     │ │  │
│  │  └──────────────┘   └───────────────┘   └──────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────┐   ┌───────────────────┐   ┌─────────────────┐  │
│  │ PlantUML       │   │ C4StorageService  │   │ ChangeTracking  │  │
│  │ Service        │   │ (SQLite WAL)      │   │ Service         │  │
│  │ (node-plantuml)│   │ diagram_storage   │   │ (chokidar)      │  │
│  └────────────────┘   └───────────────────┘   └─────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  IPC HANDLERS (preload bridge via contextBridge)               │ │
│  │  plantuml:generate-svg  c4-storage:*  c4-generation:*          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────┬─────────────────────────┘
                                            │ IPC (contextBridge)
┌───────────────────────────────────────────▼─────────────────────────┐
│                        RENDERER PROCESS (React)                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐   ┌────────────────────────────────────┐  │
│  │ DiagramViewer        │   │ ZUSTAND STORES                     │  │
│  │ - handleElementClick │   │ navigationStore (stack, persist)   │  │
│  │ - handleDrillDown    │   │ diagramStateStore (states, changes) │  │
│  │ - breadcrumbs        │   │ diagramNavigationStore (intent)    │  │
│  └──────────┬───────────┘   └────────────────────────────────────┘  │
│             │                                                        │
│  ┌──────────▼───────────┐                                           │
│  │ PlantUMLRenderer     │                                           │
│  │ - IPC SVG fetch      │                                           │
│  │ - SVG injection      │                                           │
│  │ - click detection    │                                           │
│  │ - change highlighting│                                           │
│  └──────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `StaticAnalyzerService` | ts-morph AST extraction: classes, interfaces, imports, exports, package.json tech detection | `src/main/services/c4/staticAnalyzerService.ts` |
| `AIEnricherService` | Claude API calls with prompt caching; returns free-text architectural insight string | `src/main/services/c4/aiEnricherService.ts` |
| `C4PlantUMLGenerator` | Template-based PlantUML syntax generation; largely ignores enriched AI text | `src/main/services/c4/c4PlantUMLGenerator.ts` |
| `C4AnalyzerService` | Orchestrator: runs 3 phases, checks storage cache first, persists result | `src/main/services/c4/c4AnalyzerService.ts` |
| `PlantUMLService` | Wraps node-plantuml; handles Java/JVM subprocess, SVG stream output | `src/main/services/plantUmlService.ts` |
| `C4StorageService` | SQLite WAL; stores PlantUML text, states, change tracking | `src/main/services/c4/c4StorageService.ts` |
| `ChangeTrackingService` | Debounced file-to-element mapping; IPC broadcasts on file change | `src/main/services/changeTrackingService.ts` |
| `GenerationQueueService` | Sequential level-by-level generation with cancellation support | `src/main/services/c4/generationQueueService.ts` |
| `PlantUMLRenderer` | React component; IPC call for SVG, DOM injection, click detection, change highlighting | `src/renderer/components/PlantUMLRenderer.tsx` |
| `DiagramViewer` | Navigation state machine; orchestrates drill-down, breadcrumbs, IPC state sync | `src/renderer/components/DiagramViewer/DiagramViewer.tsx` |
| `navigationStore` | Zustand persisted store: navigation stack (level + elementId per entry) | `src/renderer/stores/navigationStore.ts` |
| `diagramStateStore` | Zustand in-memory store: diagram states and affected elements per (repo, level) | `src/renderer/stores/diagramStateStore.ts` |

---

## Recommended Project Structure for v1.2 Changes

```
src/main/services/c4/
├── staticAnalyzerService.ts      MODIFY — richer extraction
├── aiEnricherService.ts          MODIFY — structured output, level-aware prompts
├── c4PlantUMLGenerator.ts        MODIFY — consume structured AI output
├── c4AnalyzerService.ts          MODIFY — pass level context for component/code
├── elementIdRegistry.ts          NEW — canonical ID registry
├── svgCacheService.ts            NEW — pre-rendered SVG storage
└── types/
    ├── analysisTypes.ts          MODIFY — add FunctionInfo, DirectoryStructure
    ├── c4Types.ts                no change
    └── enrichedTypes.ts          NEW — structured AI enrichment output types

src/renderer/components/
└── PlantUMLRenderer.tsx          MODIFY — serve SVG from cache, skip IPC round-trip
```

### Structure Rationale

- **`elementIdRegistry.ts` (new):** Centralizes element ID generation and reverse-lookup so PlantUML generator and change tracking use identical IDs. Eliminates the current mismatch where `sanitizeId()` is duplicated across `c4PlantUMLGenerator.ts` and `changeTrackingService.ts`.
- **`svgCacheService.ts` (new):** Stores pre-rendered SVG strings alongside PlantUML text in SQLite; eliminates the 5+ second Java subprocess call for diagrams that were rendered before and have not changed.
- **`enrichedTypes.ts` (new):** Structured types for AI enrichment output. Currently, `AIEnricherService.enrichArchitecture()` returns a free-form `string` that `C4PlantUMLGenerator` largely ignores. Structured output enables the generator to actually incorporate AI insights.
- **`analysisTypes.ts` (modified):** Adds `FunctionInfo` (exported functions, React components), `DirectoryStructure` (folder groupings for container/component inference), and `FileRole` (entry-point classification) to close the gaps that cause shallow diagrams.

---

## Architectural Patterns

### Pattern 1: Structured AI Enrichment Output

**What:** Instead of the AI returning free-form text, the enricher returns a typed object that the PlantUML generator consumes directly.

**When to use:** Immediately — the current pipeline ignores AI output almost entirely. `C4PlantUMLGenerator` accepts `_enrichedData: string` and marks it unused with `_`.

**Trade-offs:** Slightly more complex prompt engineering. Requires structured JSON output from Claude. Validated with `zod` schema before use. Claude claude-sonnet-4-6 and Haiku both support reliable JSON mode via system prompt instructions.

**Example:**
```typescript
// enrichedTypes.ts (NEW)
export interface EnrichedContextData {
  actors: Array<{ name: string; description: string }>;
  externalSystems: Array<{ name: string; description: string; relationship: string; tech: string }>;
  systemPurpose: string;
}

export interface EnrichedContainerData {
  containers: Array<{
    id: string;           // Must match StaticAnalyzerService container detection
    name: string;
    tech: string;
    description: string;
    type: 'app' | 'database' | 'queue' | 'store';
  }>;
  relationships: Array<{ from: string; to: string; label: string; tech?: string }>;
}

export interface EnrichedComponentData {
  containerId: string;
  components: Array<{
    id: string;           // Matches file path grouping key
    name: string;
    tech: string;
    description: string;
  }>;
  relationships: Array<{ from: string; to: string; label: string }>;
}

export interface EnrichedCodeData {
  componentId: string;
  classes: Array<{ name: string; role: string }>;      // role = "service" | "store" | "controller" etc.
  keyPatterns: string[];  // design patterns observed
}

export type EnrichedData =
  | EnrichedContextData
  | EnrichedContainerData
  | EnrichedComponentData
  | EnrichedCodeData;
```

```typescript
// aiEnricherService.ts (MODIFIED)
async enrichArchitecture(
  staticData: AnalysisResult,
  level: C4Level,
  elementId?: string
): Promise<EnrichedData> {  // Return typed, not string
  const response = await this.client.messages.create({
    system: [...],
    messages: [{
      role: 'user',
      content: `Output valid JSON matching this schema: ${JSON.stringify(schemaForLevel(level))}`
    }]
  });

  const parsed = JSON.parse(content.text);
  return validateWithZod(schemaForLevel(level), parsed);
}
```

### Pattern 2: Canonical Element ID Registry

**What:** A singleton registry that maps human-readable element names to stable PlantUML-safe IDs, and stores the reverse mapping. All three places that currently need sanitized IDs (generator, change tracking, SVG click detection) consult the same registry.

**When to use:** Central to fixing drill-down. The current bug is that element IDs in PlantUML SVG output (e.g., `elem_Main_Process`) do not always match what the change tracking service predicts or what the navigation store stores.

**Trade-offs:** Adds a singleton dependency. The registry must be populated at generation time and survive for the life of the diagram. Store it in `diagram_metadata` JSON column or in-memory, rebuilt on app start from stored diagrams.

**Example:**
```typescript
// elementIdRegistry.ts (NEW)
export class ElementIdRegistry {
  private static instance: ElementIdRegistry;
  // Maps (repoPath, level, elementId) -> human name
  private registry: Map<string, string> = new Map();

  static getInstance(): ElementIdRegistry {
    if (!ElementIdRegistry.instance) {
      ElementIdRegistry.instance = new ElementIdRegistry();
    }
    return ElementIdRegistry.instance;
  }

  // Called by C4PlantUMLGenerator when emitting each element
  register(repoPath: string, level: C4Level, elementId: string, humanName: string): void {
    const key = `${repoPath}:${level}:${elementId}`;
    this.registry.set(key, humanName);
  }

  // Called by DiagramViewer.handleElementClick to resolve click to name
  resolve(repoPath: string, level: C4Level, elementId: string): string | undefined {
    return this.registry.get(`${repoPath}:${level}:${elementId}`);
  }

  // Called by ChangeTrackingService to produce matching IDs
  sanitize(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
  }
}
```

### Pattern 3: Pre-Rendered SVG Cache

**What:** After PlantUML generates a diagram, immediately render it to SVG via the Java subprocess and store the SVG string in the existing `diagram_storage` table (a new `svg_content` column). On subsequent loads, serve the cached SVG directly — no Java subprocess, no 5-second wait.

**When to use:** For any diagram with state `fresh`. Cache is invalidated (SVG column cleared) when diagram is marked `stale` and re-rendered after regeneration.

**Trade-offs:** SVG strings can be large (~50–500KB per diagram). SQLite handles this well. Total storage for a 4-level diagram suite is typically under 2MB, well within SQLite's comfort zone. Invalidation is simple: set `svg_content = NULL` when state transitions to `generating`.

**Example:**
```typescript
// svgCacheService.ts (NEW) — or extend C4StorageService

// Schema addition (migration to user_version = 3)
ALTER TABLE diagram_storage ADD COLUMN svg_content TEXT;

// In PlantUMLService — call after generation completes
async renderAndCacheSVG(repoPath: string, level: C4Level, plantUML: string, elementId?: string): Promise<string> {
  const svg = await this.generateSVG(plantUML);
  storageService.storeSVG(repoPath, level, elementId, svg);
  return svg;
}

// In PlantUMLRenderer — check IPC for cached SVG first
const loadDiagram = async () => {
  const cached = await window.reef.plantuml.getCachedSVG(content_hash);
  if (cached) {
    setSvgContent(cached);
    setLoading(false);
    return;
  }
  // Fall through to Java subprocess
};
```

### Pattern 4: Directory-Aware Static Analysis

**What:** Extend `StaticAnalyzerService` to extract directory structure alongside class/interface extraction. Container and component detection currently relies on entry-point file names and class suffix matching (`Service`, `Controller`, etc.). Directory structure is a more reliable signal.

**When to use:** Required for non-TypeScript or JavaScript repos that use flat class naming. Also improves component grouping for Electron apps where `src/main/services/`, `src/renderer/components/`, `src/renderer/stores/` are meaningful groupings.

**Trade-offs:** Minimal: reads directory tree once, O(n) in file count. No AST overhead.

**Example:**
```typescript
// In StaticAnalyzerService — new extraction method
private extractDirectoryStructure(sourceFiles: SourceFile[], repoPath: string): DirectoryNode[] {
  const dirs = new Map<string, { files: string[]; depth: number }>();

  for (const file of sourceFiles) {
    const rel = path.relative(repoPath, file.getFilePath());
    const parts = rel.split('/');
    // Record directories at depth 1-3 under src/
    for (let d = 1; d <= Math.min(3, parts.length - 1); d++) {
      const dirPath = parts.slice(0, d).join('/');
      if (!dirs.has(dirPath)) dirs.set(dirPath, { files: [], depth: d });
      dirs.get(dirPath)!.files.push(rel);
    }
  }

  return Array.from(dirs.entries()).map(([path, info]) => ({
    path,
    depth: info.depth,
    fileCount: info.files.length,
    name: path.split('/').pop()!,
  }));
}
```

---

## Data Flow

### Request Flow: Drill-Down Navigation (Fixed)

```
User clicks element in SVG
    ↓
PlantUMLRenderer.handleSvgClick
  → traverse DOM: elem_ prefix strip → raw elementId (e.g. "Main_Process")
    ↓
DiagramViewer.handleElementClick(elementId)
  → ElementIdRegistry.resolve(repoPath, level, elementId)
    → humanName = "Main Process"
  → navigationStore.push({ level: 'component', elementId, elementName: humanName })
  → onRegenerateDiagram({ type: 'c4-component', elementId })
    ↓
C4AnalyzerService.generateC4Diagram(repoPath, 'component', elementId)
  → StaticAnalyzerService.analyzeProject()  [Phase 1]
  → AIEnricherService.enrichArchitecture(staticData, 'component', elementId)
      → structured EnrichedComponentData JSON  [Phase 2]
  → C4PlantUMLGenerator.generateComponentDiagram(enriched, staticData, elementId)
      → ElementIdRegistry.register() for each emitted element  [Phase 3]
    ↓
C4StorageService.storeDiagram()  →  PlantUMLService.renderAndCacheSVG()
    ↓
IPC response → PlantUMLRenderer displays SVG
```

### SVG Rendering Flow: Cached Fast Path (New)

```
DiagramViewer mounts or level changes
    ↓
PlantUMLRenderer receives content (PlantUML text string)
    ↓
Hash content → window.reef.plantuml.getSVG(repoPath, level, elementId)
    ↓
  [HIT] C4StorageService returns svg_content column → setSvgContent → done (< 50ms)
  [MISS] plantuml:generate-svg IPC → Java subprocess → SVG (5-8 seconds)
       → C4StorageService.storeSVG() → setSvgContent
```

### State Management

```
navigationStore (persisted)
  stack: [
    { level: 'context', elementName: 'System Context' },
    { level: 'container', elementId: 'Main_Process', elementName: 'Main Process' },
    { level: 'component', elementId: 'Services', elementName: 'Services' },
  ]
    ↓ (consumed by DiagramViewer)

diagramStateStore (in-memory)
  states: Map<"repoPath:level:elementId", DiagramState>
  affectedElements: Map<"repoPath:level", AffectedElement[]>
    ↓ (consumed by PlantUMLRenderer for amber highlighting)
```

### Key Data Flows

1. **Generation → Registry:** `C4PlantUMLGenerator` calls `ElementIdRegistry.register()` for every element emitted. Registry is keyed by `(repoPath, level, elementId)`. Stored in `diagram_storage.diagram_metadata` JSON column so it survives app restarts.

2. **Click → Navigation:** `PlantUMLRenderer` strips `elem_` prefix, passes raw ID to `DiagramViewer`. `DiagramViewer` resolves to human name via registry before pushing to `navigationStore`. Navigation store passes `elementId` to regeneration call.

3. **File Change → Highlighted Element:** `ChangeTrackingService` uses `ElementIdRegistry.sanitize()` (same function as generator) to predict element IDs. The IDs reach `diagramStateStore.affectedElements`, consumed by `applyChangeHighlighting()` in `PlantUMLRenderer`.

---

## Integration Points

### New vs Modified Components

| Component | Status | Change Description |
|-----------|--------|--------------------|
| `elementIdRegistry.ts` | NEW | Canonical ID registry, singleton, consulted by generator + change tracking + viewer |
| `svgCacheService.ts` / `C4StorageService` | MODIFIED | Add `svg_content` column, `storeSVG()`, `getSVG()` methods; schema migration to v3 |
| `enrichedTypes.ts` | NEW | Typed interfaces for AI enrichment output per C4 level |
| `StaticAnalyzerService` | MODIFIED | Add `extractDirectoryStructure()`, `extractFunctions()`, richer `AnalysisResult` |
| `AIEnricherService` | MODIFIED | Return `EnrichedData` (typed) instead of `string`; structured JSON prompts |
| `C4PlantUMLGenerator` | MODIFIED | Consume `EnrichedData` instead of ignoring `_enrichedData`; call `ElementIdRegistry.register()` per element |
| `C4AnalyzerService` | MODIFIED | Pass `elementId` through to component/code generator; store SVG after generation |
| `PlantUMLRenderer` | MODIFIED | Fast path: check SVG cache before Java IPC; serve from cache on hit |
| `preload.ts` + `main.ts` | MODIFIED | Add `plantuml.getSVG()` / `plantuml.storeSVG()` IPC handlers |
| `analysisTypes.ts` | MODIFIED | Add `FunctionInfo`, `DirectoryNode`, `FileRole` to `AnalysisResult` |
| `DiagramViewer` | MODIFIED | Resolve click element IDs via registry for human name; no behavioral change |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| StaticAnalyzer → AIEnricher | `AnalysisResult` object (in-process) | No IPC; stays in main process |
| AIEnricher → PlantUML Generator | `EnrichedData` typed struct (in-process) | Replaces ignored `string` |
| PlantUML Generator → ElementIdRegistry | Synchronous calls during generation (in-process) | Registry must be singleton |
| PlantUML Generator → StorageService | `storeDiagram()` + new `storeSVG()` | Keep transactional — store PlantUML then SVG |
| StorageService → PlantUMLRenderer | New IPC: `plantuml:get-svg` | Renderer checks cache first, falls back to generate |
| ElementIdRegistry → ChangeTrackingService | Shared `sanitize()` utility function | Both must produce identical IDs |
| NavigationStore → DiagramViewer | Zustand subscription | `elementId` in stack must match PlantUML-generated ID exactly |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude API | `AIEnricherService` via `@anthropic-ai/sdk` | Prompt caching reduces cost 90%; structured JSON output mode added in v1.2 |
| PlantUML / Java | `node-plantuml` subprocess in `PlantUMLService` | Only called on cache miss; Java process start is the main latency source |
| SQLite | `better-sqlite3` synchronous in main process | WAL mode; add `svg_content` column via migration; size stays well under 50MB |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 repos | Current approach — all in SQLite, no changes needed |
| 10-50 repos | SVG cache becomes important; storage budget ~50MB at 4 diagrams × 500KB each per repo |
| 50+ repos | Consider LRU eviction for SVG cache; prune SVGs for repos not accessed in 30 days |

### Scaling Priorities

1. **First bottleneck:** Java subprocess latency (5-8 sec per diagram). Solved by SVG cache — most loads become <100ms reads.
2. **Second bottleneck:** AI enrichment token cost at scale. Already solved via prompt caching (90% cost reduction). Haiku model keeps marginal cost under $0.01 per generation.
3. **Third bottleneck:** ts-morph analysis on large repos (>10k files). Already handles this via `skipFileDependencyResolution` and `maxFiles` option. No changes needed.

---

## Anti-Patterns

### Anti-Pattern 1: AI Output as Free Text

**What people do:** Call Claude API, receive natural-language response, pass it as an opaque string to the generator.
**Why it's wrong:** The generator cannot extract structured data from prose. It falls back to template-only output, producing shallow diagrams. This is the root cause of the current "shallow/empty diagram" problem — the AI prompt result is actually good, but it is never consumed.
**Do this instead:** Define a JSON schema per C4 level. Prompt Claude to output valid JSON matching the schema. Parse and validate the response with Zod before passing to the generator.

### Anti-Pattern 2: Duplicated sanitizeId Logic

**What people do:** Copy `sanitizeId()` into every service that needs to construct or match PlantUML element IDs (`c4PlantUMLGenerator.ts`, `changeTrackingService.ts`, `PlantUMLRenderer.tsx`).
**Why it's wrong:** Any divergence (even a single character difference) causes click detection, change highlighting, and drill-down navigation to silently fail on certain element names. This is already causing the broken Component-level drill-down.
**Do this instead:** `ElementIdRegistry.sanitize()` is the single implementation. All callers import from the registry. Generator calls `register()` on every emit, creating the authoritative mapping.

### Anti-Pattern 3: Java Subprocess on Every Diagram Load

**What people do:** Fetch cached PlantUML text from SQLite, then call `plantuml:generate-svg` IPC on every mount.
**Why it's wrong:** The Java JVM startup plus PlantUML processing takes 5-8 seconds. Users experience this every time they switch C4 levels, drill down, or navigate breadcrumbs — even for diagrams that have not changed.
**Do this instead:** Pre-render SVG at generation time. Store in `svg_content` column. Serve directly on cache hit. Only call Java when diagram content actually changes (regeneration). This turns a 5-8 second wait into a <100ms SQLite read.

### Anti-Pattern 4: Container/Component Detection via Class Name Suffixes Only

**What people do:** Filter `structure.classes` for names ending in `Service`, `Controller`, `Manager`, `Handler`, `Store`, `Repository` to detect components.
**Why it's wrong:** Many valid components (React UI sections, utility modules, config objects) do not follow this naming pattern. Non-TypeScript projects are entirely missed. The current detector produces empty component diagrams for repos that do not use these suffixes.
**Do this instead:** Use directory structure as the primary grouping signal. `src/main/services/` is a component group regardless of class naming conventions. Class suffix matching becomes a secondary enrichment signal, not the primary detection strategy.

---

## Sources

- Direct codebase analysis: `src/main/services/c4/` and `src/renderer/components/` (HIGH confidence — first-party code)
- Claude API structured output capability: Anthropic SDK documentation (HIGH confidence — known capability as of training cutoff Aug 2025)
- SQLite BLOB/TEXT storage for SVG: well-established pattern, SQLite handles up to 1GB per column without issue (HIGH confidence)
- ts-morph directory-level analysis patterns: ts-morph API documentation (MEDIUM confidence — `getSourceFiles()` is verified, directory grouping is deduced from ts-morph's file model)
- PlantUML `elem_` SVG ID prefix behavior: observed directly in `PlantUMLRenderer.tsx` source (HIGH confidence — from existing code comment)

---

*Architecture research for: Reef v1.2 — C4 Diagram Quality and Rendering*
*Researched: 2026-03-02*
