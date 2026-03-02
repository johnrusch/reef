# Project Research Summary

**Project:** Reef v1.2 — Diagrams That Deliver
**Domain:** C4 diagram quality and rendering performance for AI-assisted architecture visualization
**Researched:** 2026-03-02
**Confidence:** HIGH

## Executive Summary

Reef v1.2 is a targeted quality milestone for an existing Electron-based C4 diagram generator. The v1.1 foundation (persistent storage, change tracking, amber highlighting, diff navigation) is already shipped. The v1.2 problem is precise: diagrams are shallow or empty, Component drill-down is broken, and cached diagrams still take 5+ seconds to render. Research across all four areas converges on three root causes that must be fixed in sequence. First, ts-morph's `forgetDescendants()` is called in the wrong order, corrupting multi-pass static analysis and producing incomplete dependency graphs. Second, the AI enrichment output is computed and paid for but entirely discarded — the `_enrichedData` parameter is intentionally unused (underscore prefix) in `c4PlantUMLGenerator.ts`. Third, the Component drill-down passes a sanitized PlantUML ID (`Main_Process`) to a method expecting a human-readable container name (`Main Process`), silently producing empty diagrams for every container regardless of what was clicked.

The recommended approach is a four-phase fix ordered by dependency chain. Static analysis must be corrected first because every downstream phase depends on accurate structural data. The AI pipeline restructuring comes second and must produce typed JSON rather than free-form text before the generator can use it. The drill-down navigation fix comes third and requires a canonical element ID registry that all three subsystems (generator, change tracker, SVG click handler) share. Rendering performance comes last because it is independent of content quality and its fix — storing pre-rendered SVG in SQLite — is a straightforward schema migration once the generation pipeline is producing accurate content.

The only new dependency required is `lru-cache ^11.2.6` for an in-process SVG cache layer. All other improvements are code changes to existing services using APIs that are already available: ts-morph functions not yet called, Anthropic structured output (`output_config`) already in `@anthropic-ai/sdk ^0.78.0`, and SQLite column additions via the existing migration service. There are no architectural rewrites required and no tooling changes — the fix surface is narrow and well-defined.

---

## Key Findings

### Recommended Stack

The v1.2 stack requires exactly one new dependency (`lru-cache`) and targeted code changes in seven existing files. The current stack (`ts-morph ^23.0.0`, `@anthropic-ai/sdk ^0.78.0`, `better-sqlite3 ^11.10.0`, `node-plantuml ^0.9.0`) already contains all capabilities needed. The primary work is activating unused API surface, not installing new tools.

Alternatives considered and rejected: replacing ts-morph with tree-sitter (15MB native binaries, no benefit for TypeScript-only repos), replacing PlantUML with Mermaid (full rewrite, weaker C4 support), using Kroki.io (requires Docker, adds operational dependency). These remain valid v2+ considerations if PlantUML JVM distribution becomes a packaging problem.

**Core technologies:**
- `ts-morph ^23.0.0`: Static analysis — extend to use `getFunctions()`, `getDecorators()`, `getJsDocs()`, method signatures, and directory structure enumeration (all unused today); fix `forgetDescendants()` call order
- `@anthropic-ai/sdk ^0.78.0`: AI enrichment — switch from free-text to `output_config.format: json_schema` structured output (no upgrade needed; feature already in 0.78.0)
- `better-sqlite3 ^11.10.0`: Storage — add `rendered_svg TEXT` column to `diagram_storage` via schema migration to v3
- `node-plantuml ^0.9.0`: SVG rendering — optionally enable Nailgun mode (already built in); gate behind feature flag due to known compatibility issues on some systems
- `lru-cache ^11.2.6`: NEW — in-process SVG cache; zero dependencies, TypeScript-native, 350M+ weekly downloads

### Expected Features

All seven P1 features are bug fixes or activation of existing but unused functionality. None require new user-facing UI design.

**Must have (table stakes):**
- Use AI enrichment output in PlantUML generation — eliminates the biggest quality gap; currently a no-op due to `_enrichedData` unused parameter
- Fix elementId passing for Component diagram — dynamic path mapping replaces hardcoded `getContainerPath()` map; unblocks Component level end-to-end
- Fix Code diagram class filtering — use elementId hierarchy rather than filename substring; unblocks Code level end-to-end
- Prompt AI for structured JSON output — enables all downstream quality improvements across all four C4 levels simultaneously
- Container diagram with actual named tech components and relationship protocols — C4 specification requires this; "Renderer Process (TypeScript)" is not a valid container description
- Component diagram with individual classes in architectural roles, not directory buckets — C4 spec requires named logical components, not "Services" and "Components"
- Pre-render SVG on generation and cache in SQLite — eliminates 5+ second render delay for cached diagrams

**Should have (competitive, v1.2.x after validation):**
- Domain-specific few-shot examples in prompts — further improves AI output quality for specific frameworks
- Non-TypeScript repo fallback using file structure heuristics — broadens usability beyond TypeScript-only repos
- Component architectural role classification (API/Business/Data/Infra layers) — richer component diagrams
- Relationship protocol auto-detection from import patterns — richer container diagrams

**Defer (v2+):**
- Multi-language AST parsing (Python, Go, Java) — requires separate parsers per language
- Diagram version comparison for architecture drift over time
- Interactive component filtering (hide/show architectural layers)
- Architecture validation rules for detected patterns

### Architecture Approach

The existing C4 generation pipeline is a linear three-phase chain in the Electron main process: `StaticAnalyzerService` (ts-morph) → `AIEnricherService` (Claude API) → `C4PlantUMLGenerator` (PlantUML syntax). Two new modules must be introduced: `elementIdRegistry.ts` (singleton ID registry shared by generator, change tracker, and SVG click handler) and `enrichedTypes.ts` (typed interfaces for AI enrichment output per C4 level). The storage layer gains an `svgCacheService.ts` concern or equivalent extension to `C4StorageService`. No components are replaced; all are extended. Phases 3 and 4 can be developed in parallel by separate engineers — they touch different files except for additive-only changes to `C4StorageService`.

**Major components:**
1. `StaticAnalyzerService` — MODIFY: add `extractDirectoryStructure()`, `extractFunctions()`, decorator/JSDoc extraction; fix `forgetDescendants()` call order to after all extractions per file
2. `AIEnricherService` — MODIFY: return typed `EnrichedData` union (not `string`); use `output_config.format: json_schema` for schema-constrained output; validate with Zod
3. `C4PlantUMLGenerator` — MODIFY: consume `EnrichedData` instead of ignoring `_enrichedData`; call `ElementIdRegistry.register()` per emitted element; replace hardcoded container detection heuristics
4. `elementIdRegistry.ts` — NEW: singleton mapping sanitized IDs to canonical paths; shared across generator, change tracking, and drill-down click handler
5. `C4StorageService` / `svgCacheService.ts` — MODIFY: add `rendered_svg TEXT` column; schema migration to v3; serve stored SVG on cache hit
6. `PlantUMLRenderer` — MODIFY: check SVG cache before invoking Java IPC; cache hit returns in <100ms vs 5-8s Java subprocess; post-render SVG patch for click transparency bug

### Critical Pitfalls

1. **`forgetDescendants()` destroys analysis data mid-loop** — Called at the top of each extraction loop, it invalidates node references needed by subsequent passes, producing empty import graphs. Fix: call only after all extractions (classes, interfaces, imports, exports) for each source file complete.

2. **AI enrichment output discarded** — The `_enrichedData` underscore prefix is TypeScript's "intentionally unused" convention. AI result is computed, tokens charged, but diagrams are static-analysis-only. Fix: define `C4EnrichedInsights` JSON schema per level; use `output_config` structured output; generator merges AI elements with static structure.

3. **elementId mismatch breaks Component drill-down** — PlantUML generates IDs as sanitized names (`Main_Process`); `getContainerPath()` expects human-readable names (`Main Process`). IDs never match; every Component diagram silently renders empty. Fix: `ElementIdRegistry` maps sanitized IDs to canonical paths at generation time; click handler resolves via registry.

4. **PlantUML SVG click transparency bug (v1.2025.0)** — Invisible `path` elements with `fill="transparent"` absorb mouse events, silently blocking drill-down navigation. Resolved in v1.2025.2 but affects users with older JARs. Fix: post-render SVG patch that resets `fill="transparent"` to `fill="none"` on all path overlays after every SVG injection.

5. **JVM cold start on every diagram render** — Even for cached PlantUML source, the renderer always invokes `plantuml:generate-svg` IPC, spawning a Java process (5-8 seconds). Fix: store pre-rendered SVG in `diagram_storage.rendered_svg`; renderer serves from SQLite on cache hit; Java invoked only on first render or regeneration.

---

## Implications for Roadmap

Based on research, the phase structure is dictated by hard dependencies: static analysis accuracy is a prerequisite for AI enrichment quality; AI enrichment structure is a prerequisite for the generator to produce correct element IDs; correct element IDs are a prerequisite for drill-down navigation; and rendering performance is independent and can be parallelized with Phase 3.

### Phase 1: Static Analysis Depth

**Rationale:** Every downstream phase consumes `AnalysisResult`. The `forgetDescendants()` bug corrupts multi-pass extraction, producing empty dependency graphs that make AI enrichment data thin and cause container detection to fail for non-Electron repos. This must be the first fix or all subsequent improvements build on a broken foundation.

**Delivers:** Accurate, rich `AnalysisResult` with classes, interfaces, imports, exports, functions, decorators, JSDoc, and directory structure for any TypeScript repo. Graceful fallback (no error on missing tsconfig.json) for non-TypeScript repos. Framework detection from `package.json` for improved container inference.

**Addresses:** Container diagram shows real tech stack; non-TypeScript repos produce partial results rather than errors; Component detection uses directory structure as primary signal rather than class-name suffixes alone.

**Avoids:**
- `forgetDescendants()` destroys analysis data mid-loop (Pitfall 1)
- Container detection fails on non-standard project structures (Pitfall 4)
- Static analysis skips non-TypeScript repos silently (Pitfall 10)

### Phase 2: AI Enrichment Pipeline

**Rationale:** With accurate static data from Phase 1, the AI enrichment call can receive meaningful inputs. This phase restructures the AI-to-generator interface: free-text out, structured JSON in. This is the single highest-leverage change in the milestone — it activates AI enrichment that was always intended but never wired, fixing all four C4 levels simultaneously.

**Delivers:** `AIEnricherService.enrichArchitecture()` returns typed `EnrichedData` (not `string`). `C4PlantUMLGenerator` consumes structured elements and relationships. Container diagrams show named technology components with protocols. Component diagrams show logical architectural roles, not directory names.

**Uses:** `output_config.format: json_schema` from existing `@anthropic-ai/sdk ^0.78.0`; new `enrichedTypes.ts` module with per-level schemas; Zod validation before AI output reaches the generator; level-aware prompt templates with C4 model quality standards.

**Avoids:**
- AI enrichment output discarded (`_enrichedData` unused) (Pitfall 2)
- Component detection grouped by directory name, not logical architecture (Pitfall 6)
- AI prompt produces narrative text instead of diagram data (Pitfall 8)

### Phase 3: Drill-Down Navigation Fix

**Rationale:** After Phases 1 and 2 produce accurate diagrams with correct element IDs, the navigation layer needs to consistently translate SVG click targets to generator inputs. The elementId mismatch is the last remaining cause of empty Component and Code diagrams. The PlantUML SVG click transparency bug is co-located with this fix (both involve SVG click handling) and should be addressed in the same phase.

**Delivers:** Component drill-down works end-to-end for any container. Code drill-down works for any component. Amber highlighting correctly identifies changed elements after regeneration (stable IDs across regenerations). All SVG element clicks fire `handleElementClick` regardless of PlantUML JAR version.

**Implements:** `elementIdRegistry.ts` singleton; updated `C4AnalyzerService` to pass `elementId` through the pipeline; post-render SVG patch for `fill="transparent"` overlays; ID stability via canonical path-based keys rather than display-name-derived sanitized IDs.

**Avoids:**
- elementId mismatch between Container and Component drill-down (Pitfall 3)
- PlantUML SVG click transparency bug blocks navigation (Pitfall 7)
- Sanitized IDs not stable across regenerations (Pitfall 9)

### Phase 4: Rendering Performance

**Rationale:** This phase is independent of content quality and can be developed in parallel with Phase 3. It should be validated after content quality is confirmed (Phases 1-3) so that SVG storage captures high-quality diagrams. The JVM cold start fix is a schema migration plus cache-check logic; the LRU in-process cache is a secondary optional layer.

**Delivers:** Cached diagram display in <100ms (vs current 5-8 seconds). Pre-rendered SVG stored in `diagram_storage.rendered_svg`. Optional in-process LRU SVG cache for repeated tab switches within a session. Optional Nailgun mode for JVM warmup on first-time renders.

**Uses:** `lru-cache ^11.2.6` (one new dependency); schema migration via existing `migrationService.ts` pattern (migration to user_version 3); optional `plantuml.useNailgun()` gated behind `REEF_PLANTUML_NAILGUN` environment flag with try/catch fallback.

**Avoids:**
- JVM cold start on every cached diagram render (Pitfall 5)
- Re-rendering SVG for every React re-render (performance trap — memoize on content hash)
- Re-analyzing project on every generation call (performance trap)

### Phase Ordering Rationale

- **Static analysis first** because `AnalysisResult` is consumed by all three subsequent phases; the `forgetDescendants()` bug makes all downstream data unreliable regardless of AI prompt quality.
- **AI enrichment second** because the generator interface change (string → typed struct) affects the function signatures consumed by Phase 3's element ID work; doing this after Phase 1 ensures the AI has accurate input data to work with.
- **Navigation fix third** because it depends on the generator emitting consistent element IDs, which only happens reliably after Phase 2 restructures how elements are named (AI drives naming, not hardcoded heuristics).
- **Rendering performance last** because it is independent but benefits from storing high-quality SVG once Phases 1-3 content is correct; schema migration is simpler to reason about when diagram content is stable.
- **Phases 3 and 4 can be parallelized** by separate engineers — they share only `C4StorageService` (additive-only column addition) and `preload.ts`/`main.ts` (additive-only IPC handler additions).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Structured AI output prompt engineering — the exact prompt structure and JSON schema for each C4 level needs validation against Claude's actual response quality for diverse repo types. Consider a short spike (1-2 hours) to test JSON schema constraints against a real non-Reef repo before committing to full implementation.
- **Phase 3:** `ElementIdRegistry` persistence strategy — whether to store the registry in `diagram_storage.diagram_metadata` JSON column or rebuild from stored diagrams on app start. Both approaches are viable; the choice affects implementation complexity and cold-start performance.

Phases with standard patterns (skip research-phase):
- **Phase 1:** ts-morph API usage is well-documented; `forgetDescendants()` fix is a call-order change; directory enumeration uses Node built-ins. All needed APIs verified in ts-morph docs.
- **Phase 4:** SVG caching is a standard schema migration plus column-check pattern. LRU cache implementation is trivial with `lru-cache`. Nailgun mode is already built into `node-plantuml`.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct code audit confirmed unused API surface; `output_config` GA in SDK 0.78.0 per official Anthropic docs; `lru-cache` v11 is TypeScript-native, widely used; all other changes are to already-installed packages |
| Features | HIGH | Root causes identified via first-party code audit (underscore prefix convention, hardcoded pathMap, forgetDescendants placement); C4 model official spec used for quality standards |
| Architecture | HIGH | Architecture research is based entirely on direct codebase analysis; all component boundaries and data flows verified from source files; no inference required |
| Pitfalls | HIGH | All critical pitfalls identified from actual code, not inference; PlantUML click bug has issue tracker reference (Issue #2071); forgetDescendants issue has ts-morph issue tracker reference (Issue #738) |

**Overall confidence:** HIGH

The unusual strength of confidence for this milestone research is because it is an existing codebase with known bugs, not a greenfield project. All root causes are observable in source code rather than inferred from architectural patterns.

### Gaps to Address

- **Nailgun compatibility:** `node-plantuml` Nailgun mode has reported zero-length output failures on some systems (GitHub Issue #15). Must be gated behind a feature flag with try/catch fallback. Validate on macOS, Windows, and Linux before enabling by default. Treat as optional optimization, not required fix.
- **Non-TypeScript repo fallback:** The fallback strategy (ts-morph without tsconfig + directory heuristics + AI-only generation) is designed but not validated against actual JavaScript/Python/Go repos. Flag any non-TypeScript analysis results as lower confidence until validated.
- **Anthropic `output_config` schema complexity limits:** Complex nested schemas may hit token limits or produce malformed responses for large codebases. Enforce token budget on `AnalysisResult` sent to AI (prioritize imports and classes relevant to the requested level) before finalizing prompt design.
- **SQLite SVG storage size at scale:** Each C4 SVG is estimated at 50-500KB. For users with 50+ repos × 4 levels, total storage could reach 100MB. Monitor and consider LRU eviction at the storage layer for repos not accessed in 30 days.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `src/main/services/c4/` and `src/renderer/components/` — all root causes verified from first-party source code
- [Anthropic Structured Outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — `output_config.format` GA, no beta header, available in SDK 0.78.0
- [C4 model official diagrams reference](https://c4model.com/diagrams) — Container, Component, Code level specifications used for quality standards
- [ts-morph Functions documentation](https://ts-morph.com/details/functions) — `getFunctions()`, decorator/JSDoc APIs verified
- [ts-morph Decorators documentation](https://ts-morph.com/details/decorators) — `getDecorators()`, `getName()`, `getArguments()` verified
- [ts-morph JS Docs documentation](https://ts-morph.com/details/documentation) — `getJsDocs()`, `getDescription()`, `getTags()` verified
- [PlantUML v1.2025.0 SVG click transparency bug - GitHub Issue #2071](https://github.com/plantuml/plantuml/issues/2071) — confirmed bug, resolved in v1.2025.2

### Secondary (MEDIUM confidence)
- [LLM-Based Architecture Diagram Generation from Source Code](https://arxiv.org/html/2511.05165v1) — peer-reviewed 2025, AI-driven C4 generation patterns
- [C4-PlantUML Component Diagrams - DeepWiki](https://deepwiki.com/plantuml-stdlib/C4-PlantUML/3.3-component-diagrams) — comprehensive C4-PlantUML reference
- [lru-cache GitHub](https://github.com/isaacs/node-lru-cache) — v11.2.6, TypeScript-native, 350M+ weekly downloads
- [Auto-Generate Architecture Diagrams from Code - BSWEN](https://docs.bswen.com/blog/2026-02-25-auto-generate-architecture-diagrams/) — current practice patterns 2026
- [Generating C4 Diagrams with LLMs - IcePanel comparison](https://icepanel.io/blog/2025-08-18-comparison-llms-for-creating-software-architecture-diagrams) — 2025 empirical LLM comparison

### Tertiary (requires validation)
- [node-plantuml Nailgun compatibility issue #15](https://github.com/markushedvall/node-plantuml/issues/15) — known failures on some installs; gate Nailgun behind feature flag
- [forgetDescendants side effects - ts-morph Issue #738](https://github.com/dsherret/ts-morph/issues/738) — documents the invalidation behavior

---

*Research completed: 2026-03-02*
*Ready for roadmap: yes*
