# Stack Research: v1.2 Diagram Quality and Rendering Performance

**Milestone:** v1.2 Diagrams That Deliver
**Researched:** 2026-03-02
**Focus:** Stack additions for improving C4 diagram quality (richer static analysis, structured AI output) and rendering speed (SVG caching, JVM warmup)
**Confidence:** HIGH for analysis improvements; MEDIUM for rendering performance (node-plantuml Nailgun has known compatibility issues)

## Executive Summary

**v1.2 requires no new dependencies for rendering speed — only configuration changes.** The primary improvements come from using ts-morph APIs that already exist but are not yet called, and from switching the Claude AI call from free-text to structured JSON output (no new SDK needed, `output_config` is in `@anthropic-ai/sdk ^0.78.0`).

The rendering bottleneck (5+ seconds for cached diagrams) has two causes that both resolve without new libraries:
1. **PlantUML JAR cold starts** — fixed by enabling Nailgun mode in the existing `node-plantuml` package
2. **Re-rendering cached SVGs** — fixed by adding an in-process LRU SVG cache keyed by diagram content hash (one lightweight dependency: `lru-cache ^11.x`)

The diagram quality problem (shallow, empty diagrams) has one root cause: the static analyzer extracts only classes/interfaces/imports and ignores functions, enums, JSDoc, decorators, and directory structure heuristics. All of these are addressable with ts-morph APIs that already exist but are not called in `staticAnalyzerService.ts`.

---

## Category 1: Deeper Static Analysis (No New Dependencies)

### What ts-morph Can Do That We Are Not Using

The existing `ts-morph ^23.0.0` (latest: 27.0.2) installation has these capabilities unused in `staticAnalyzerService.ts`:

| ts-morph API | What It Extracts | C4 Level Benefit |
|---|---|---|
| `sourceFile.getFunctions()` | Top-level function declarations | Component, Code |
| `sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction)` | Arrow function expressions | Component, Code |
| `classDecl.getDecorators()` | `@Injectable`, `@Controller`, `@Route` etc. | Container, Component |
| `classDecl.getJsDocs()` then `.getDescription()` | JSDoc summary text | All levels |
| `methodDecl.getJsDocs()` | Method-level JSDoc | Code |
| `sourceFile.getEnums()` | Enum declarations | Code |
| `sourceFile.getTypeAliases()` | Type alias declarations | Code |
| `classDecl.getMethods()` with `m.getReturnType().getText()` | Return type signatures | Code |
| `classDecl.getMethods()` with `m.getParameters()` | Method parameters with types | Code |

**Current gap:** `staticAnalyzerService.ts` extracts `methods` as only `m.getName()` — no return types, no parameters, no JSDoc. The AI enricher receives thin data and cannot generate meaningful C4 content.

**Fix:** Extend the existing `ClassInfo` and `AnalysisResult` types. No new packages. See integration section.

### Directory Structure Heuristics (No New Dependencies)

The current `detectContainers()` in `c4PlantUMLGenerator.ts` hardcodes Electron-specific path checks (`main.ts`, `App.tsx`). For arbitrary repos, this produces empty diagrams.

**Better approach:** Use `ts-morph` + `path.join` (Node built-in) to enumerate top-level `src/` subdirectories and infer layer names from conventions:

| Directory Name Pattern | Inferred C4 Component Type |
|---|---|
| `services/`, `service/` | Service layer |
| `controllers/`, `routes/` | API/routing layer |
| `models/`, `entities/` | Data layer |
| `components/`, `pages/`, `views/` | UI layer |
| `stores/`, `state/` | State management |
| `utils/`, `helpers/`, `lib/` | Utilities (skip in diagrams) |
| `middleware/` | Cross-cutting concerns |

This is implemented entirely with `fs.readdir` (Node built-in) — no new package.

---

## Category 2: Structured AI Output (Existing SDK, New `output_config` Parameter)

### The Problem

`aiEnricherService.ts` asks Claude to return free-text architectural insights. The `c4PlantUMLGenerator.ts` then ignores this text entirely (note: parameters are prefixed `_enrichedData`, indicating they are unused). Claude's free-text response is discarded. The generator uses only `staticData`.

### The Fix: Structured JSON Output from Claude

Anthropic's structured outputs feature is **generally available** (no beta header required as of late 2025) for `claude-sonnet-4-5` and all current Claude models. The `@anthropic-ai/sdk ^0.78.0` already supports the `output_config` parameter.

**Confidence:** HIGH — verified against official Anthropic docs (platform.claude.com/docs/en/build-with-claude/structured-outputs). The `output_format` field has migrated to `output_config.format` with no beta header needed.

**What to change:** Replace the free-text `enrichArchitecture()` return with a structured JSON response:

```typescript
// Before: returns free-text string (ignored by generator)
async enrichArchitecture(staticData, level, elementId): Promise<string>

// After: returns typed C4 structure
async enrichArchitecture(staticData, level, elementId): Promise<C4EnrichedData>
```

**Example structured output schema for Container level:**

```typescript
interface C4EnrichedData {
  elements: Array<{
    id: string;
    name: string;
    description: string;
    technology: string;
    type: 'person' | 'system' | 'container' | 'component' | 'database' | 'external';
  }>;
  relationships: Array<{
    from: string;
    to: string;
    label: string;
    technology?: string;
  }>;
  notes?: string;
}
```

**API usage with existing SDK:**

```typescript
const response = await this.client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  system: [...],  // existing system blocks with cache_control
  messages: [...],  // existing user message
  output_config: {
    format: {
      type: 'json_schema',
      schema: C4_ENRICHED_SCHEMA, // JSON Schema object
    }
  }
});
// response.content[0].text is guaranteed valid JSON matching the schema
const enriched: C4EnrichedData = JSON.parse(response.content[0].text);
```

**Why this fixes diagram quality:**
- Claude returns structured elements the generator can directly use as PlantUML macros
- No more `_enrichedData` (ignored prefix): enriched data drives diagram generation
- Container names, descriptions, technologies, and relationships come from Claude's understanding
- Removes the guessing in `detectContainers()` / `detectComponents()` / `detectExternalSystems()`

**Installation:** None. `output_config` is in `@anthropic-ai/sdk ^0.78.0` already.

---

## Category 3: SVG Render Cache (One New Dependency)

### The Problem

Cached diagrams still take 5+ seconds because calling `plantuml:generate-svg` invokes the PlantUML JAR process even when the PlantUML source has not changed. The SQLite cache stores PlantUML source text, not rendered SVG. Every load re-renders.

### Fix 1: Store Rendered SVG in SQLite (No New Dependencies)

The simplest fix: add a `rendered_svg TEXT` column to `diagram_storage`. When regenerating a diagram, store both the PlantUML source and the rendered SVG. On cache hit, return the stored SVG without calling `node-plantuml` at all.

```sql
ALTER TABLE diagram_storage ADD COLUMN rendered_svg TEXT;
```

**Impact:** Cached diagram loads go from 5+ seconds to <100ms (SQLite read). This requires a schema migration (same pattern already used in `migrationService.ts`).

**No new dependency needed.** This is a schema + code change only.

### Fix 2: In-Process LRU SVG Cache (One New Dependency)

For the case where the same diagram is requested multiple times within a session (e.g., switching tabs), an in-memory LRU cache prevents even the SQLite round-trip.

**Recommended:** `lru-cache ^11.2.6`

| Aspect | Details |
|---|---|
| **Version** | 11.2.6 (latest, TypeScript-native, no @types needed) |
| **Size** | ~20KB, zero runtime dependencies |
| **TypeScript** | Fully typed, rewritten in TypeScript at v8+ |
| **Weekly downloads** | ~350M+ (used by npm itself, Vite, etc.) |
| **API** | `new LRUCache({ max: 50 })`, `.get(key)`, `.set(key, value)` |
| **Use case** | Cache last N rendered SVGs by content hash, evict oldest on overflow |

**Usage in `plantUmlService.ts`:**

```typescript
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

// In PlantUMLService constructor:
private svgCache = new LRUCache<string, string>({ max: 50 });

private async generateSVG(plantUmlText: string): Promise<string> {
  const key = createHash('sha256').update(plantUmlText).digest('hex');
  const cached = this.svgCache.get(key);
  if (cached) return cached; // <100 microseconds

  // ... existing generation logic ...
  this.svgCache.set(key, svg);
  return svg;
}
```

**Why 50 items:** Each C4 SVG is typically 50-200KB. At 50 items that's 2.5-10MB memory, safe for an Electron app.

**Installation:**

```bash
npm install lru-cache
```

### Fix 3: Nailgun Mode for node-plantuml (No New Dependencies, Optional)

`node-plantuml` ships with Nailgun support built in. Nailgun keeps the JVM process warm between renders, eliminating the ~2-3 second JVM cold start on each render call.

```typescript
// In main.ts initialization, before PlantUMLService is created:
import plantuml from 'node-plantuml';
plantuml.useNailgun(); // JVM stays running, subsequent renders are fast
```

**Caveats:** Nailgun has reported compatibility issues on some systems (zero-length output). Gate behind a feature flag or environment check:

```typescript
if (process.env.REEF_PLANTUML_NAILGUN !== 'false') {
  try {
    plantuml.useNailgun();
  } catch (e) {
    console.warn('[PlantUML] Nailgun unavailable, using standard mode:', e);
  }
}
```

**Impact when working:** 2-3 second savings on first non-cached render, negligible on subsequent renders if SVG cache (Fix 1 or 2) is in place.

**Installation:** None. Already in `node-plantuml ^0.9.0`.

---

## Recommended Stack Summary

### Install One New Package

```bash
npm install lru-cache
```

### No Other New Dependencies

Everything else is configuration and code changes to existing services.

### Summary of Changes by File

| File | Change | Type |
|---|---|---|
| `staticAnalyzerService.ts` | Add `getFunctions()`, `getDecorators()`, `getJsDocs()`, parameter types, return types | Code only |
| `types/analysisTypes.ts` | Extend `ClassInfo` with `jsDoc`, `decorators`, `methodSignatures` | Code only |
| `aiEnricherService.ts` | Add `output_config` with JSON schema; return `C4EnrichedData` not `string` | Code only |
| `c4PlantUMLGenerator.ts` | Use `enrichedData` instead of ignoring it; remove hardcoded Electron heuristics | Code only |
| `plantUmlService.ts` | Add LRU SVG cache; optionally add Nailgun init | `npm install lru-cache` |
| `migrationService.ts` | Add `rendered_svg TEXT` column to `diagram_storage` | Code only |
| `c4StorageService.ts` | Store and retrieve rendered SVG alongside PlantUML source | Code only |

---

## Alternatives Considered

### Alternative: Replace ts-morph with a Language-Agnostic Analyzer

**Considered:** `tree-sitter` (universal AST parser supporting 100+ languages), `code-maat`, `dependency-cruiser`

**Rejected because:** ts-morph is TypeScript-native and already installed. The target codebase (`reef`) is 100% TypeScript. tree-sitter adds ~15MB of native binaries and requires building language grammars for Node.js. The benefit (non-TS language support) is out of scope for v1.2.

**When to reconsider:** If v1.3+ adds support for Python, Go, or Rust repositories.

### Alternative: Replace PlantUML with Mermaid

**Considered:** `mermaid` npm package for client-side SVG rendering, no JVM dependency

**Rejected because:**
- Existing C4-PlantUML syntax throughout the codebase would require rewriting all generators
- Mermaid's C4 support is limited (fewer element types, no `SHOW_LEGEND()`)
- SVG output quality differs; existing tests and UI assume PlantUML SVG structure
- The rendering bottleneck is solvable with caching (no JVM on cache hits)

**When to reconsider:** If PlantUML becomes unavailable or JVM dependency causes distribution problems in packaged Electron apps.

### Alternative: Use Kroki.io for Rendering

**Considered:** Self-hosted Kroki Docker container as a local HTTP rendering server

**Rejected because:**
- Requires Docker running alongside the Electron app (poor UX for desktop tool)
- Network I/O overhead vs. local JAR rendering
- Adds operational dependency users must configure
- The SQLite SVG cache + LRU cache solves the perf problem without external services

**When to reconsider:** If distributing the PlantUML JAR in the Electron app bundle becomes a compliance problem.

### Alternative: jsondiffpatch for Structured AI Output Parsing

**Not applicable:** The structured output feature (`output_config`) returns schema-valid JSON directly. No diff library needed for parsing.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|---|---|---|
| `tree-sitter` | 15MB native binaries, same result as ts-morph for TypeScript repos | ts-morph (already installed) |
| `@anthropic-ai/sdk` upgrade beyond ^0.78.0 | `output_config` is already in 0.78.0; upgrade risk not worth it | Stay at ^0.78.0 |
| `mermaid` | Full rewrite of all generators for marginal C4 benefit | Continue with PlantUML + caching |
| `graphology` or `sigma.js` | Graph visualization libraries — PlantUML already renders the graph | PlantUML (already works) |
| `ast-grep` | Different tool optimized for find-replace, not extraction | ts-morph `getDescendantsOfKind()` |
| `dependency-cruiser` | Config-heavy, outputs its own format (not C4) | ts-morph import analysis (already implemented) |
| `esprima` / `acorn` | Lower-level JS parsers — ts-morph wraps TypeScript compiler for accuracy | ts-morph |

---

## Version Compatibility

| Package | Current Version | v1.2 Change | Notes |
|---|---|---|---|
| `ts-morph` | ^23.0.0 | No change (latest is 27.0.2; update optional) | All needed APIs exist in 23.x |
| `@anthropic-ai/sdk` | ^0.78.0 | No change | `output_config` available in 0.78.0 |
| `better-sqlite3` | ^11.10.0 | No change | Add `rendered_svg` column via migration |
| `node-plantuml` | ^0.9.0 | No change | Enable Nailgun mode optionally |
| `lru-cache` | — | **NEW** ^11.2.6 | TypeScript-native, zero deps |

---

## Stack Patterns by Scenario

**If the analyzed repo is a TypeScript project:**
- Use ts-morph full API (classes, functions, decorators, JSDoc)
- Use structured AI output to enrich with architectural labels
- All 4 C4 levels will have real content

**If the analyzed repo is NOT TypeScript (no tsconfig.json):**
- ts-morph gracefully fails and returns empty arrays (existing behavior)
- Fall back to directory structure heuristics + package.json detection
- Context and Container levels will still work; Component and Code will be sparse
- This is acceptable for v1.2 scope (primary target is TypeScript repos)

**If PlantUML JAR fails (Java not installed):**
- Existing `checkJavaInstalled()` IPC already handles this
- Nailgun should be disabled if Java check fails
- SVG cache still serves previously rendered diagrams

---

## Sources

- [ts-morph npm](https://www.npmjs.com/package/ts-morph) — version 27.0.2 confirmed (current: 23.0.0 in project)
- [ts-morph Functions documentation](https://ts-morph.com/details/functions) — `getFunctions()`, overloads API verified
- [ts-morph Decorators documentation](https://ts-morph.com/details/decorators) — `getDecorators()`, `getName()`, `getArguments()` verified
- [ts-morph JS Docs documentation](https://ts-morph.com/details/documentation) — `getJsDocs()`, `getDescription()`, `getTags()` verified
- [Anthropic Structured Outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — `output_config.format` GA (no beta header), available in claude-sonnet-4-5; HIGH confidence
- [lru-cache GitHub](https://github.com/isaacs/node-lru-cache) — v11.2.6, TypeScript-native, 350M+ weekly downloads
- [node-plantuml GitHub](https://github.com/markushedvall/node-plantuml) — Nailgun mode confirmed, compatibility caveats noted
- [Nailgun compatibility issue #15](https://github.com/markushedvall/node-plantuml/issues/15) — known failures on some installs; MEDIUM confidence

---

**Research complete.** v1.2 stack changes: one new dependency (`lru-cache`), no dependency upgrades, and targeted code changes to existing services to unlock ts-morph and Claude structured output capabilities that are already available but unused.

---
*Stack research for: C4 diagram quality and rendering performance (v1.2)*
*Researched: 2026-03-02*
