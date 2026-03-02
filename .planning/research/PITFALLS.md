# Pitfalls Research

**Domain:** Improving C4 diagram quality, rendering performance, and drill-down navigation in an Electron desktop tool
**Researched:** 2026-03-02
**Confidence:** HIGH

> **Context:** This document supersedes the v1.1 PITFALLS.md and focuses on v1.2 goals: fixing shallow/empty diagrams, repairing Component drill-down navigation (elementId passing broken), and improving cached rendering speed from 5+ seconds.

---

## Critical Pitfalls

### Pitfall 1: forgetDescendants Destroys Analysis Data Mid-Loop

**What goes wrong:**
The current `staticAnalyzerService.ts` calls `sourceFile.forgetDescendants()` at the top of each extraction loop (`extractClasses`, `extractInterfaces`, `extractImports`, `extractExports`). This causes each subsequent loop to receive "forgotten" node references — nodes whose traversal throws errors rather than returning data. The result: one extraction method gets data, then invalidates it for the next. The actual production symptom is that class information is extracted but then import relationships are empty or vice versa, producing incomplete dependency graphs that make Container and Component diagrams appear sparse.

**Why it happens:**
`forgetDescendants()` is documented as a performance optimization that stops tracking a node's descendants in the wrapped cache. The ts-morph docs label it an "Advanced" technique. Developers add it because large codebases can accumulate thousands of tracked nodes causing memory pressure — but the side effect is that any previously accessed node reference becomes invalid and throws on access. Calling it per-file inside a loop that runs multiple analysis passes over the same files means each extraction phase partially undermines the next.

**How to avoid:**
Call `forgetDescendants()` only AFTER all extractions for a given source file are complete — not before. Structure each pass as: (1) extract everything you need from a file, (2) call `forgetDescendants()`, (3) move to the next file. Alternatively, restructure into a single-pass extractor that collects classes, interfaces, imports, and exports in one traversal per file, then releases memory. Benchmark before adding this optimization at all — medium-sized codebases (under 500 files) rarely need it.

**Warning signs:**
- Import data is empty or contains only a fraction of actual imports
- Classes are extracted but component relationship edges are missing
- Dependency graph shows nodes but no edges between them
- Container diagram shows only the system boundary with no containers inside

**Phase to address:**
Phase 1 (Static Analysis Depth) — fix before any other quality work; all higher levels depend on accurate static data.

---

### Pitfall 2: AI Enrichment Output Discarded Instead of Parsed

**What goes wrong:**
The `aiEnricherService.ts` returns a freeform text string labeled `enrichedData`. The `c4PlantUMLGenerator.ts` receives this string as parameter `_enrichedData` (note the underscore — TypeScript "unused variable" convention) and proceeds to generate diagrams entirely from `staticData` alone. The AI's architectural insights — logical container groupings, component responsibilities, relationship labels, system descriptions — are computed, API costs are incurred, but the output is never parsed or applied. Container diagrams show only what heuristic detection from entry points and package.json can find, which for any project with non-standard structure (monorepos, workspaces, unusual entry point naming) produces only "Main Process + Renderer Process" or nothing.

**Why it happens:**
The enricher was designed to produce structured diagram content, but the generator evolved independently to use static data directly. The `_enrichedData` parameter documents the intent but the integration was never completed. The free-text response format also makes parsing unreliable — LLMs do not consistently output parseable structures without explicit schema enforcement.

**How to avoid:**
Redesign AI enrichment to return a typed object (not raw text) that the generator uses directly. Use structured output via `tool_use` or JSON mode to guarantee parseable results. Define a `C4EnrichedInsights` schema that maps to what each diagram level needs — for Container: list of `{ name, tech, description, type }` items; for Component: list of `{ name, description, groupPath }` items. Generator merges structured enrichment with static data, with static data providing factual structure and AI providing descriptions and relationships that static analysis cannot infer.

**Warning signs:**
- The `_enrichedData` parameter is prefixed with `_` in generator methods
- Container diagram always produces the same set of containers regardless of codebase content
- AI enrichment increases generation time and cost but diagram content is identical to what static analysis alone would produce
- AI call succeeds (logged) but diagram quality does not improve

**Phase to address:**
Phase 2 (AI Enrichment Pipeline) — redesign the AI-to-generator interface before prompting improvements matter.

---

### Pitfall 3: elementId Mismatch Between Container Diagram and Component Drill-Down

**What goes wrong:**
The Container diagram generates PlantUML elements with IDs produced by `sanitizeId()` — e.g., `Main_Process`, `Renderer_Process`. When a user clicks on "Main Process" in the SVG, the `handleElementClick` in `DiagramViewer.tsx` extracts the SVG `elem_` ID (e.g., `Main_Process`) and passes it as `elementId` to the Component diagram generator. The generator's `getContainerPath()` method expects human-readable names like `"Main Process"` to look up in a hardcoded `pathMap` object. The sanitized ID `Main_Process` never matches any `pathMap` key, so `containerPath` defaults to `containerId.toLowerCase()` (i.e., `"main_process"`), which matches no source file paths. The result: Component diagram shows an empty container boundary — the bug the milestone describes as "Component diagram requires elementId (container name)."

**Why it happens:**
There are two naming conventions operating without coordination: PlantUML IDs (sanitized, underscores) and container path keys (human-readable, spaces). The generator that creates the Container diagram does not document what ID format it uses, and the generator that creates the Component diagram does not document what format it expects. This mismatch is invisible during development because both run in the same function chain but the error only manifests at the Component level where the ID is actually used for filtering.

**How to avoid:**
Establish a single canonical identifier for each container that flows through the entire pipeline. When a Container diagram element is emitted, embed a `data-*` attribute or use a PlantUML alias (`$alias`) that maps back to the canonical container path (e.g., `src/main`). When the SVG click extracts an element ID, it should retrieve the canonical path, not the sanitized display name. Alternatively, maintain an explicit ID registry: the Container generator builds a `Map<sanitizedId, containerPath>` at generation time and persists it with the stored diagram so the Component generator can look up the correct path from the clicked ID.

**Warning signs:**
- `getContainerPath()` has a hardcoded map with a limited set of names that may not match generated IDs
- Component diagram is requested but shows an empty container boundary
- Error message "Component diagram requires elementId (container name)" thrown from `c4AnalyzerService.ts` — but this is thrown only when `elementId` is `undefined`; when elementId IS passed but wrong format, the diagram silently renders empty
- Clicking any Container diagram element produces the same (empty) Component diagram regardless of what was clicked

**Phase to address:**
Phase 3 (Drill-Down Navigation Fix) — highest priority bug; requires coordinated fix across generator, storage, and click handler.

---

### Pitfall 4: Container Detection Fails on Non-Standard Project Structures

**What goes wrong:**
`detectContainers()` in `c4PlantUMLGenerator.ts` identifies containers exclusively by inspecting `staticData.entryPoints` for filenames matching `main.ts`, `App.tsx`, and `main.tsx`. For projects without these exact entry point names — Next.js apps (no `main.ts`), monorepos, backend-only Node services, or repos with non-standard structure — no containers are detected. The Container diagram renders with an empty system boundary. This is the direct cause of the "Container diagram nearly empty — just 'system' + 'User'" bug.

**Why it happens:**
Entry point detection is a heuristic that was designed for Electron apps and partially generalized. The fallback case (no entry points found, infer from class file paths) exists but only fires if the entry point array is empty, and even then it groups by the first path segment under `src/`, which produces directory names rather than meaningful container names. For any codebase without a file literally named `main.ts` or `App.tsx`, the heuristic silently fails.

**How to avoid:**
Layer multiple container detection strategies with decreasing specificity: (1) framework-specific detection from package.json scripts and dependencies — Next.js → "Next.js App" container, Express → "API Server" container; (2) directory-structure inference using common patterns (`src/api`, `src/client`, `src/server`, `apps/*` for monorepos); (3) entry point filename patterns as a fallback; (4) AI enrichment as the final layer to describe containers the heuristics missed. Treat an empty container list as an error condition, not a valid result — if no containers are detected, emit a warning and delegate fully to AI enrichment.

**Warning signs:**
- `detectContainers()` returns an empty array for any project type other than Electron
- Container diagram shows the `System_Boundary` wrapper but no `Container()` elements inside
- The `entryPoints` array in `AnalysisResult` is empty for non-Electron codebases
- Container-level generation succeeds (no thrown error) but produces a diagram with only "User" and the system box

**Phase to address:**
Phase 1 (Static Analysis Depth) — expand detection logic as part of improving static analysis quality.

---

### Pitfall 5: PlantUML JVM Cold Start on Every Cached Diagram Render

**What goes wrong:**
Every time a cached diagram is displayed — even one retrieved from SQLite in milliseconds — the `PlantUMLRenderer.tsx` calls `window.reef.plantuml.generateSVG()` via IPC, spawning a new Java process via `node-plantuml`. The JVM startup cost alone is 2-5 seconds. This makes cached diagram rendering feel as slow as fresh generation, defeating the purpose of persistent storage. The 5+ second rendering time reported in the milestone is primarily JVM cold start, not diagram complexity.

**Why it happens:**
The renderer treats all PlantUML content identically — it always sends content to the local Java generator and waits for SVG output. There is no path that checks "is this cached SVG already available?" before initiating generation. The `C4AnalyzerService` stores both PlantUML source and (implicitly) the generated SVG is expected to come from rendering. The diagram storage schema stores `diagram_content` as the PlantUML source, not the rendered SVG — so every render must re-invoke Java.

**How to avoid:**
Store rendered SVG directly in the diagram storage alongside PlantUML source. Add a `rendered_svg` column to `diagram_storage`. When a diagram is retrieved from storage, check if `rendered_svg` is populated — if yes, inject directly into the DOM without invoking Java. If no `rendered_svg`, render via Java and store the result. Add a Nailgun-style persistent JVM approach as a performance option: the `node-plantuml` library supports Nailgun which eliminates cold start for subsequent renders. Cache the rendered SVG as the primary artifact; PlantUML source is preserved only for regeneration.

**Warning signs:**
- `diagram_storage` schema has no `rendered_svg` column
- Every diagram display triggers a Java process spawn visible in activity monitor
- Cached diagrams take the same time to display as freshly generated ones
- "Generating diagram..." loading state appears even when diagram is retrieved from storage

**Phase to address:**
Phase 4 (Rendering Performance) — implement SVG caching layer that bypasses Java for already-rendered content.

---

### Pitfall 6: Component Detection Grouped by Directory Name, Not Logical Architecture

**What goes wrong:**
`detectComponents()` in `c4PlantUMLGenerator.ts` groups classes by the directory segment immediately after the container path. For `src/main/services/`, this produces a component named "Services" containing all service classes. For `src/renderer/components/`, it produces "Components." These are structural categories, not architectural components. A C4 Component diagram should show logical groupings like "Repository Management," "GitHub Integration," "Diagram Generation" — not "services" and "components." The resulting diagrams are technically valid C4 syntax but convey no more information than reading a directory listing.

**Why it happens:**
Directory-based grouping is the simplest implementation that produces non-empty diagrams. It requires no AI understanding and no domain knowledge. The failure mode is subtle: the diagram is not empty (so no error fires) and the Component names are plausible-sounding, but the architectural meaning is missing. This pitfall is identified in C4 model research as "superficial abstractions" — groupings that "don't convey meaningful information about the architecture."

**How to avoid:**
AI enrichment is the correct tool for logical component identification. Static analysis provides the raw materials (class names, file paths, import relationships) and AI identifies which classes belong together as logical components and what those components are responsible for. The Component prompt should explicitly ask the AI to identify 5-10 named architectural components within a container, describe each, and group classes accordingly. Avoid relying solely on directory structure — the code may not be organized logically.

**Warning signs:**
- Component names match directory names exactly ("Services", "Components", "Stores", "Utils")
- All classes in a directory appear in the same component regardless of their actual architectural role
- Component diagram looks like a directory tree rather than an architecture diagram
- Descriptions are auto-generated strings like "3 services handling service logic"

**Phase to address:**
Phase 2 (AI Enrichment Pipeline) — AI must drive component identification, not directory traversal.

---

### Pitfall 7: PlantUML SVG Click Transparency Bug Blocks Navigation

**What goes wrong:**
PlantUML v1.2025.0 introduced a breaking change where invisible `path` elements overlay clickable diagram elements. The `fill` attribute was changed from `"none"` to `"transparent"`, causing mouse events to be absorbed by the overlay rather than propagating to the underlying element. This means users clicking on Container or Component elements in the SVG receive no `handleElementClick` callback — drill-down navigation silently fails. The bug was resolved in v1.2025.2 (March 5, 2025) but affects any environment running an older local PlantUML JAR.

**Why it happens:**
The `node-plantuml` package bundles or invokes a specific PlantUML JAR version. If the bundled JAR version is v1.2025.0 or v1.2025.1, the transparent overlay bug is present. Electron apps that bundle Java dependencies may not receive automatic updates, meaning users on older builds are silently affected. The bug is silent — no error is thrown, clicks simply have no effect.

**How to avoid:**
Apply a post-render SVG patch that sets `fill="none"` on all `path` elements that have `fill="transparent"` immediately after the SVG is injected into the DOM. This mirrors the JavaScript workaround identified in the PlantUML issue tracker. Alternatively, version-check the JAR on startup and warn if it predates v1.2025.2. Add a diagnostic test: after rendering a known diagram, verify that a test click on a known element ID triggers the callback.

**Warning signs:**
- Clicks on diagram elements produce no console output (no `handleElementClick` invoked)
- The `elem_` IDs are present in the SVG DOM but click events do not reach them
- The issue appears on some user machines but not others (different JAR versions)
- Hovering over elements shows cursor change but clicking produces nothing

**Phase to address:**
Phase 3 (Drill-Down Navigation Fix) — apply SVG patch as part of fixing element click detection.

---

### Pitfall 8: AI Prompt Produces Narrative Text Instead of Diagram Data

**What goes wrong:**
The current `enrichArchitecture()` prompts ask the AI for "concise architectural insights" — prose descriptions of what was observed. The generator receives this narrative but has no parser for it, so the insights are discarded (the `_enrichedData` parameter). If the pipeline is fixed to use AI output, the new risk is that prompts which ask for narrative will produce flowing text like "The application follows an Electron architecture with a main process handling system calls..." rather than structured data the generator can consume. AI-generated prose requires complex natural language parsing that is fragile and expensive to maintain.

**Why it happens:**
Architecture analysis prompts are typically designed for human readers. The C4 prompts in `aiEnricherService.ts` follow this pattern — they describe focus areas in natural language and expect "concise architectural insights" in return. This is appropriate when a human reads the output, but inappropriate when a generator needs to extract specific elements (container names, technologies, descriptions) from the response.

**How to avoid:**
Use Anthropic's structured output feature (`tool_use`) to enforce response schema. Define a tool with input schema that matches the diagram generator's required data format. For Container level: `{ containers: Array<{ id: string, name: string, tech: string, description: string, type: "container" | "database" }>, relationships: Array<{ from: string, to: string, label: string }> }`. The AI fills in this schema rather than writing prose, guaranteeing parseable output. Prose descriptions become values within the schema rather than the schema itself.

**Warning signs:**
- AI prompt asks for "insights" or "analysis" rather than a list of specific elements
- Generator receives string output from AI but does not attempt to parse it
- AI response includes complete sentences describing architecture rather than element lists
- Same AI call produces different structure on different runs (no schema enforcement)

**Phase to address:**
Phase 2 (AI Enrichment Pipeline) — redesign prompts alongside the generator interface.

---

### Pitfall 9: Sanitized IDs Are Not Stable Across Regenerations

**What goes wrong:**
The `sanitizeId()` function in `c4PlantUMLGenerator.ts` converts names to valid PlantUML identifiers by replacing non-alphanumeric characters with underscores. If a project is renamed, a container description changes, or a technology label is updated between regenerations, the sanitized IDs change. This breaks the change tracking system — `diagram_change_tracking` stores `elementId` values from previous diagrams that may no longer match the new SVG's element IDs. Amber highlighting no longer appears on the correct elements, and the "navigate to diff" click handler receives an ID that maps to no changed file.

**Why it happens:**
The ID generation strategy is purely cosmetic — it produces IDs that look readable in PlantUML source but provides no stability guarantee. There is no registry of canonical IDs that persists across generations. Each generation independently computes IDs from whatever element names the AI or static analysis produces, which can vary.

**How to avoid:**
Separate display names from stable IDs. Assign stable IDs based on structural position (e.g., `container_0`, `container_1`, or a hash of the canonical path like `src/main`) rather than display name. Store the mapping `{ stableId → displayName }` in the stored diagram metadata. Change tracking, click detection, and highlighting use the stable ID; display names can change freely. Alternatively, use canonical paths as IDs directly — `src_main` for the Main Process container — which are stable as long as the codebase structure is stable.

**Warning signs:**
- `elementId` values in `diagram_change_tracking` do not match any element in the current diagram SVG
- Amber highlighting fails to appear after diagram regeneration even when the same files changed
- Renaming a class or updating a description causes the Component diagram to lose all drill-down history
- No persistent mapping between human-readable container names and their diagram IDs

**Phase to address:**
Phase 3 (Drill-Down Navigation Fix) — establish stable ID scheme before implementing change tracking integration.

---

### Pitfall 10: Static Analysis Skips Non-TypeScript Projects Silently

**What goes wrong:**
`staticAnalyzerService.ts` initializes `ts-morph` with `tsConfigFilePath: join(repoPath, 'tsconfig.json')`. When analyzing a JavaScript, Python, Go, or mixed-language repository without a `tsconfig.json`, the constructor throws an error. The `analyzeProject()` method catches this and returns an `AnalysisResult` with zero classes, zero interfaces, zero imports, and an `error` field. Upstream code (`c4AnalyzerService.ts`) checks for `staticData.error` and returns early with `"Static analysis failed."` The user sees a diagram generation error for any non-TypeScript repo.

**Why it happens:**
The analyzer was built for the Reef codebase itself (a TypeScript project) and the tsconfig requirement was never made optional. The fallback code (addSourceFilesAtPaths) after tsconfig failure only fires if `tsConfigFilePath` option is not set — but it is always set to `repoPath + '/tsconfig.json'`. The error is caught but the empty result propagates as a fatal failure.

**How to avoid:**
Make tsconfig discovery optional: if `tsconfig.json` does not exist at the repo root, scan common locations (`tsconfig.base.json`, `packages/*/tsconfig.json` for monorepos). If no tsconfig is found, initialize ts-morph without one and use `addSourceFilesAtPaths` with `**/*.{ts,tsx,js,jsx}` patterns. For non-TypeScript repos (Python, Go, Ruby), use a separate lightweight analysis path that reads `package.json`, scans directory structure, and infers containers from language-specific conventions — then delegates entirely to AI enrichment with the directory listing as context.

**Warning signs:**
- Analyzing any repo other than the Reef codebase fails immediately
- `staticData.error` is set to "Analysis failed: Cannot find tsconfig.json"
- `filesAnalyzed: 0` in analysis metadata even for repos with many TypeScript files
- JavaScript repos (no tsconfig) produce diagram generation errors rather than simplified diagrams

**Phase to address:**
Phase 1 (Static Analysis Depth) — generalize analysis to handle diverse project types.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store PlantUML source, not rendered SVG | Simpler storage schema, smaller payload | 5+ second JVM cold start on every diagram display including cached | Never for cached diagrams — renders must be stored |
| Discard AI enrichment output (current `_enrichedData`) | Generator works without parsing complexity | AI cost incurred but no quality improvement; diagrams are static-analysis-only | Never — defeats the purpose of hybrid generation |
| Hard-code container names in `getContainerPath()` pathMap | Works for Electron apps exactly like Reef | Any other project type produces empty Component diagrams | Never beyond the Reef codebase itself |
| Use directory name as component name | Non-empty Component diagrams with no code | Diagrams show structural categories, not architectural components — useless for understanding | MVP demo only, not production |
| Free-text AI prompt for diagram content | Flexible, readable prompts | Cannot parse output reliably; must use structured output for diagram generation | Never when output feeds a code generator |
| forgetDescendants() at top of each extraction loop | Reduces memory pressure | Invalidates nodes needed by subsequent extraction passes; causes incomplete analysis | After all extraction from a file is complete, not before |

---

## Integration Gotchas

Common mistakes when connecting to the generation pipeline.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| ts-morph `forgetDescendants` | Called before all file extractions complete | Call after all extractions for a file: extract classes + interfaces + imports + exports, then call `forgetDescendants()` |
| Anthropic tool_use structured output | Sending same prompts as text requests | Define explicit JSON schema in the `tools` array; LLM fills the schema rather than writing prose |
| PlantUML `node-plantuml` | Spawning new Java process for every render | Store rendered SVG in `diagram_storage`; only invoke Java when rendering new or regenerated diagrams |
| PlantUML v1.2025.0 click detection | No version checking or SVG patching | After SVG injection, reset `fill="none"` on all `transparent` path overlays |
| elementId from SVG click to generator | Passing sanitized PlantUML ID directly | Maintain `{ sanitizedId → canonicalPath }` registry per diagram; use canonical path as generator input |
| C4 Container detection | Relying on entry point filenames alone | Layer: framework detection from package.json → directory conventions → entry points → AI enrichment |
| ts-morph tsconfig requirement | Hard-coding `tsConfigFilePath` always | Check file existence first; fall back to no-tsconfig initialization with glob patterns |

---

## Performance Traps

Patterns that work in development but produce unacceptable latency.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| JVM spawn per diagram render | 5+ second display time for any diagram including cached | Store rendered SVG; only invoke Java on first render | Every single diagram display |
| Re-analyzing project on every generation call | Full ts-morph analysis (1-3 seconds) runs even for cached diagrams | Cache analysis result tied to git HEAD; skip re-analysis when HEAD unchanged | Every cached diagram retrieval |
| Sending full analysis JSON to AI without token limits | Token count exceeds model limits; API error or truncation | Enforce token budget: prioritize imports, classes relevant to requested level; use context window calculator |  Repos >200 files analyzed at Code level |
| Re-rendering SVG for every React re-render | Unnecessary Java invocations on prop changes | Memoize SVG content; only re-render when `content` prop actually changes (hash comparison) | Any component with state changes above DiagramPanel |
| PlantUML include resolution on every render | `!include <C4/C4_Container>` fetched from PlantUML stdlib over network | Confirm that bundled PlantUML JAR includes C4 stdlib; test in offline mode | Network-restricted environments |
| SQLite `synchronous = FULL` for diagram writes | 10-100x slower writes than `synchronous = NORMAL` | Use `synchronous = NORMAL` with WAL mode; FULL is only needed for crash-critical data | Write-heavy generation phases |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces specific to v1.2 goals.

- [ ] **AI enrichment:** Call succeeds, response logged — verify `_enrichedData` is actually parsed and consumed by the generator (not silently discarded)
- [ ] **Container diagram:** Generates without error — verify it shows real containers, not just the system boundary with no interior elements
- [ ] **Component drill-down:** Component generation is invoked — verify the `elementId` passed matches what `getContainerPath()` can resolve (not a sanitized vs human-readable mismatch)
- [ ] **Cached diagram display:** Storage hit logged — verify SVG appears in under 1 second (not re-invoked through Java)
- [ ] **Click detection:** `handleElementClick` callback is registered — verify a click on a diagram element produces console output (not silently absorbed by transparent overlay)
- [ ] **Static analysis:** `filesAnalyzed > 0` in metadata — verify for a sample non-Reef repo; analysis must not fail on missing tsconfig
- [ ] **Component diagram content:** Component boundary is rendered — verify it contains Component() elements with meaningful names, not an empty boundary
- [ ] **ID stability:** Regenerating a diagram — verify that elementId values from change tracking still match the new diagram's SVG element IDs
- [ ] **AI structured output:** Tool-use response is received — verify the schema-bound fields are populated, not wrapped in prose text
- [ ] **forgetDescendants order:** Static analysis runs — verify class, interface, AND import counts are all non-zero (if only some are populated, the call order is wrong)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| forgetDescendants breaks analysis | LOW | Move call to after all extractions in each source file loop; re-run analysis; verify all counts non-zero |
| AI enrichment discarded | MEDIUM | Add structured output schema; update generator to merge AI output with static data; regenerate all stored diagrams to get quality benefit |
| elementId mismatch breaks drill-down | MEDIUM | Build ID registry at generation time; store with diagram; update click handler to look up canonical path from registry |
| Empty Container diagram | LOW | Add fallback container detection from package.json scripts; log what heuristics found; delegate to AI if empty |
| 5+ second cached rendering | MEDIUM | Add `rendered_svg` column to storage; backfill by rendering existing stored diagrams; update retrieval path to check for rendered SVG first |
| PlantUML click transparency bug | LOW | Add SVG post-processing step that patches `fill="transparent"` → `fill="none"` on path elements; apply after every SVG injection |
| Component names are directory names | MEDIUM | Update AI prompt to list 5-10 named logical components; remove directory-based `detectComponents()` as primary strategy; use as fallback only |
| Non-TS repo fails static analysis | LOW | Add tsconfig existence check; fall back to no-tsconfig ts-morph init; for non-TS repos, use directory listing as AI context |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| forgetDescendants destroys analysis mid-loop | Phase 1: Static Analysis Depth | Check that class count, interface count, AND import count are all non-zero for a multi-file TypeScript repo |
| Container detection fails on non-standard structure | Phase 1: Static Analysis Depth | Analyze a Next.js or Express repo — Container diagram must show framework-relevant containers |
| Static analysis skips non-TypeScript repos | Phase 1: Static Analysis Depth | Analyze a JavaScript-only repo without tsconfig — must produce partial results, not error |
| AI enrichment output discarded | Phase 2: AI Enrichment Pipeline | Log what `enrichedData` contains; confirm generator uses it to populate container/component lists |
| Component detection grouped by directory | Phase 2: AI Enrichment Pipeline | Component diagram must show named logical groupings, not directory names |
| AI prompt produces narrative instead of data | Phase 2: AI Enrichment Pipeline | AI response must be parseable JSON matching the defined schema |
| elementId mismatch between Container and Component | Phase 3: Drill-Down Navigation Fix | Clicking a Container element must produce a non-empty Component diagram |
| Sanitized IDs not stable across regenerations | Phase 3: Drill-Down Navigation Fix | Regenerate a diagram twice — amber highlights must appear on the same elements |
| PlantUML SVG click transparency bug | Phase 3: Drill-Down Navigation Fix | Click every element in a freshly rendered SVG — all must fire `handleElementClick` |
| JVM cold start on every cached render | Phase 4: Rendering Performance | Display a stored diagram — must appear in under 1 second without JVM spawn |
| Re-analysis on every generation call | Phase 4: Rendering Performance | Switch between C4 levels on a cached repo — no analysis latency, only storage retrieval |

---

## Sources

C4 Model Quality and Mistakes:
- [Misuses and Mistakes of the C4 Model](https://www.workingsoftware.dev/misuses-and-mistakes-of-the-c4-model/)
- [C4 Model Official Diagrams Reference](https://c4model.com/diagrams)
- [Container Diagram | C4 Model](https://c4model.com/diagrams/container)

AI-Generated C4 Diagrams:
- [Creating Architecture Diagrams with C4 and AI - blog.heuel.org](https://blog.heuel.org/2025/01/creating-architecture-diagrams-with-c4-and-ai/)
- [Collaborative LLM Agents for C4 Software Architecture Design Automation - arxiv.org](https://arxiv.org/pdf/2510.22787)

PlantUML SVG Click Detection:
- [PlantUML v1.2025.0 SVG click transparency bug - GitHub Issue #2071](https://github.com/plantuml/plantuml/issues/2071)
- [Links for diagram drill-down - PlantUML Q&A](https://forum.plantuml.net/7914/links-for-diagram-drill-down)
- [SVG elements with IDs - PlantUML Q&A](https://forum.plantuml.net/10400/svg-elements-with-ids)

PlantUML Performance:
- [Nailgun: Insanely Fast Java - martiansoftware.com](https://www.martiansoftware.com/nailgun/)
- [Performance issue with JRE21 - PlantUML Issue #1819](https://github.com/plantuml/plantuml/issues/1819)
- [Performance issue - PlantUML Q&A](https://forum.plantuml.net/5882/performance-issue)
- [node-plantuml - npm](https://www.npmjs.com/package/node-plantuml)

ts-morph Static Analysis:
- [ts-morph Performance Documentation](https://ts-morph.com/manipulation/performance)
- [ts-morph - GitHub Repository](https://github.com/dsherret/ts-morph)
- [forgetDescendants side effects - ts-morph Issue #738](https://github.com/dsherret/ts-morph/issues/738)

Electron IPC Performance:
- [Inter-Process Communication | Electron Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [The Horror of Blocking Electron's Main Process - Medium](https://medium.com/actualbudget/the-horror-of-blocking-electrons-main-process-351bf11a763c)

---
*Pitfalls research for: C4 diagram quality improvement and rendering performance (v1.2)*
*Researched: 2026-03-02*
