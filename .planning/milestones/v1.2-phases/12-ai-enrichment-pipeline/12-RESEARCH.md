# Phase 12: AI Enrichment Pipeline - Research

**Researched:** 2026-03-02
**Domain:** Anthropic SDK structured output, PlantUML C4 generation wiring, framework-aware prompting
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENRCH-01 | AI enrichment output is consumed by the PlantUML generator (fix `_enrichedData` discard bug) | C4PlantUMLGenerator accepts `enrichedData: string` but all four generator methods prefix the parameter with `_`, meaning the value is never read. Fix is to parse the string into a typed structure and use its fields. |
| ENRCH-02 | AI returns structured JSON with typed containers, components, and relationships (not free-text prose) | Anthropic SDK ^0.78.0 ships `client.messages.parse` + `zodOutputFormat` / `jsonSchemaOutputFormat` helpers that force structured JSON responses; the current service returns raw prose text via `content[0].text`. |
| ENRCH-03 | AI provides meaningful component and container names based on domain understanding | Structured JSON return type lets the generator use `enrichedData.containers[].name`, `enrichedData.components[].name` directly instead of heuristic `detectContainers()` / `detectComponents()` methods. |
| ENRCH-04 | AI prompts adapt per detected framework/repo type for domain-specific enrichment | `staticData.technologies` array and `staticData.metadata.analysisQuality` are already available in `enrichArchitecture()`; prompts must branch on these values per C4 level. |
</phase_requirements>

---

## Summary

Phase 12 has a single dominant structural problem: **`_enrichedData` is passed to all four generator methods but never read**. The underscore prefix was added to silence TypeScript's "unused parameter" lint rule, which means the AI call is made (and paid for) but the result is silently discarded — the diagrams are built entirely from heuristic detection (`detectContainers`, `detectExternalSystems`, etc.). This is the ENRCH-01 bug.

The fix requires two coordinated changes: (1) change `AIEnricherService.enrichArchitecture()` to return typed structured JSON instead of a free-text string, and (2) rewrite `C4PlantUMLGenerator`'s four generator methods to consume the structured data, using static analysis only as a fallback when the AI data does not cover a particular element.

The Anthropic TypeScript SDK (^0.78.0, already installed) ships `client.messages.parse` with `zodOutputFormat` and `jsonSchemaOutputFormat` helpers that guarantee structured JSON is returned and validated at the SDK level. This is the right tool for ENRCH-02. It is also compatible with the existing `cache_control: ephemeral` prompt caching strategy — caching is set on the `system` array, not on the `output_config`, so both features compose cleanly.

For ENRCH-04, the prompt text must branch on `staticData.technologies` and `staticData.metadata.analysisQuality`. The `technologies` array already covers Electron, React, Express, Next.js, Vue, etc. The `analysisQuality` flag (`full-ast` / `js-ast` / `file-structure`) tells the prompt how much structural detail is available.

**Primary recommendation:** Replace `enrichArchitecture() → string` with `enrichArchitecture() → EnrichedArchitecture` (typed structured output via `messages.parse` + `zodOutputFormat`), then consume the result directly in the four generator methods.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.78.0 (already installed) | Structured JSON output via `messages.parse` | Already in package.json; `zodOutputFormat` helper added in recent versions |
| `zod` | check package.json | Schema definition and runtime validation of AI response | Recommended by Anthropic SDK helpers; `zodOutputFormat` requires it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@anthropic-ai/sdk/helpers/zod` | (same package) | `zodOutputFormat` export | Use when defining the enrichment response schema |
| `@anthropic-ai/sdk/helpers/json-schema` | (same package) | `jsonSchemaOutputFormat` export | Alternative if Zod is not installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `zodOutputFormat` | Tool use / function calling | Both work. Tool use is older pattern; `messages.parse` with `output_config` is cleaner one-shot approach for this use case. |
| `messages.parse` | `messages.create` + manual JSON.parse | `messages.parse` validates the schema server-side and returns `parsed_output`; `messages.create` requires manual parse with error handling. |

**Installation (check if zod is already present first):**
```bash
# Check if zod is installed
cat package.json | grep zod

# If missing:
npm install zod
```

---

## Architecture Patterns

### Recommended Project Structure
No new files needed. All changes are within:
```
src/main/services/c4/
├── aiEnricherService.ts     # Change return type: string → EnrichedArchitecture
├── c4PlantUMLGenerator.ts   # Consume enrichedData fields, remove underscore prefixes
├── c4AnalyzerService.ts     # Update call site: enrichedData type changes
└── types/
    └── enrichmentTypes.ts   # NEW: EnrichedArchitecture, EnrichedContainer, etc.
```

### Pattern 1: Structured Output with `messages.parse` + `zodOutputFormat`
**What:** Use the SDK's built-in structured output to get a validated typed response
**When to use:** Any time you need Claude to return data you will programmatically consume
**Example:**
```typescript
// Source: Context7 /anthropics/anthropic-sdk-typescript
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const client = new Anthropic();

const EnrichedContainer = z.object({
  name: z.string(),
  technology: z.string(),
  description: z.string(),
  type: z.enum(['process', 'database', 'queue', 'storage']),
});

const EnrichedArchitecture = z.object({
  containers: z.array(EnrichedContainer),
  components: z.array(z.object({
    name: z.string(),
    role: z.string(),
    description: z.string(),
    containerId: z.string(),
  })),
  relationships: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
    technology: z.string().optional(),
  })),
  actors: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
  externalSystems: z.array(z.object({
    name: z.string(),
    description: z.string(),
    relationship: z.string(),
    technology: z.string().optional(),
  })),
});

const message = await client.messages.parse({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: JSON.stringify(staticData, null, 2),
      cache_control: { type: 'ephemeral' },
    },
  ],
  messages: [{ role: 'user', content: userPrompt }],
  output_config: {
    format: zodOutputFormat(EnrichedArchitecture),
  },
});

const enriched = message.parsed_output; // type: z.infer<typeof EnrichedArchitecture>
```

### Pattern 2: Framework-Aware System Prompt Branching
**What:** Generate different system prompts based on detected technologies
**When to use:** ENRCH-04 requirement — prompt must adapt to repo type
**Example:**
```typescript
private getSystemPrompt(level: C4Level, technologies: readonly string[]): string {
  const isElectron = technologies.includes('Electron');
  const isReact = technologies.includes('React');
  const isExpress = technologies.includes('Express');
  const isNextJs = technologies.includes('Next.js');

  const frameworkContext = isElectron
    ? 'This is an Electron desktop application. Containers are: Main Process (Node.js), Renderer Process (Chromium), and Preload Script (IPC bridge). Databases use electron-store or SQLite.'
    : isNextJs
    ? 'This is a Next.js application. Containers are: Next.js Server (SSR/API routes), React Client (browser), and any databases.'
    : isExpress
    ? 'This is an Express.js API server. Containers include the Express app, any databases, and client apps.'
    : 'Infer the architectural pattern from the static analysis data.';

  return `${this.getC4BasePrompt(level)}\n\n${frameworkContext}`;
}
```

### Pattern 3: Graceful Fallback When AI Returns Partial Data
**What:** Use AI enrichment fields first, fall back to static analysis heuristics
**When to use:** AI may return empty arrays for containers it cannot infer
**Example:**
```typescript
generateContainerDiagram(enrichedData: EnrichedArchitecture, staticData: AnalysisResult): string {
  // Prefer AI-enriched containers; fall back to heuristic detection
  const containers = enrichedData.containers.length > 0
    ? enrichedData.containers
    : this.detectContainersFallback(staticData);
  // ...
}
```

### Anti-Patterns to Avoid
- **Underscore-prefixing enrichedData parameters:** `_enrichedData` tells TypeScript the parameter is unused. Remove the underscore and actually use the value.
- **Free-text prose from AI:** `enrichArchitecture()` currently returns a plain string. Any downstream code that tries to parse this will break unpredictably. Use structured output.
- **Discarding `parsed_output` on schema validation failure:** `messages.parse` may return `null` for `parsed_output` if the model produces invalid JSON. Always check `message.parsed_output != null`.
- **Using `messages.create` for structured data:** This requires manual `JSON.parse` + error handling. `messages.parse` does this automatically.
- **Hardcoding containers in generator:** `detectContainers()` hardcodes Electron-specific path patterns (`main.ts`, `App.tsx`). This breaks for Express/Next.js repos. Let AI infer them.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Force JSON response from Claude | Custom prompt injection (`"respond only with JSON"`) | `messages.parse` + `zodOutputFormat` | SDK enforces schema at API level; custom prompting is fragile |
| Validate AI response shape | Manual property checks | Zod schema + `parsed_output` type | Zod provides compile-time types + runtime validation in one step |
| Framework detection | Regex on file paths | `staticData.technologies` array (already built by `detectTechnologies()`) | Already done in StaticAnalyzerService; don't duplicate |

**Key insight:** The project already has a correct `detectTechnologies()` method. Phase 12 only needs to *pass* that array to the AI prompt — it does not need to re-implement framework detection.

---

## Common Pitfalls

### Pitfall 1: `parsed_output` is null when model produces invalid schema
**What goes wrong:** `messages.parse` returns `message.parsed_output === null` if Claude did not follow the schema, causing a null-pointer crash when consuming fields.
**Why it happens:** Large complex schemas with many nested arrays sometimes cause partial output or schema violations.
**How to avoid:** Always null-check `message.parsed_output` and fall back to static analysis heuristics if null.
**Warning signs:** Tests pass with mock but fail against real API.

### Pitfall 2: `cache_control` is incompatible with `output_config`
**What goes wrong:** Assuming structured output breaks caching.
**Why it happens:** Developers conflate `output_config` with request body structure.
**How to avoid:** `output_config.format` is a separate field from `system[].cache_control`. Both can coexist in a single `messages.parse` call. Verified against SDK source.
**Warning signs:** None — this works correctly.

### Pitfall 3: Returning `enrichedData: string` at the call site breaks the type contract
**What goes wrong:** `c4AnalyzerService.ts` stores `enrichedData` as `let enrichedData: string` and passes it to `generatePlantUML`. Changing the return type of `enrichArchitecture` to `EnrichedArchitecture` requires updating `c4AnalyzerService.ts` too.
**Why it happens:** The type change ripples through the call chain.
**How to avoid:** Update the type declaration in `c4AnalyzerService.ts` at line 73 when changing `aiEnricherService.ts`.
**Warning signs:** TypeScript compile error: "Type 'EnrichedArchitecture' is not assignable to type 'string'".

### Pitfall 4: Silent discard when schema too complex for current model
**What goes wrong:** Sending all four C4 levels' worth of fields in one schema call causes the model to exceed `max_tokens` or produce truncated JSON.
**Why it happens:** The enrichment call is per-level (`level: C4Level` parameter). Container and Component diagrams have different data needs.
**How to avoid:** Define per-level schemas (context needs actors/externalSystems; container needs containers/relationships; component needs components/relationships; code uses static analysis only). Only request fields relevant to the current level.
**Warning signs:** `parsed_output` is null for component level but not for context level.

### Pitfall 5: Model ID mismatch
**What goes wrong:** `aiEnricherService.ts` currently specifies `model: 'claude-sonnet-4-5-20250929'`. This model supports `output_config` / structured output.
**Why it happens:** Older Claude models (pre-claude-3-5) do not support `output_config`.
**How to avoid:** Keep `claude-sonnet-4-5-20250929` — this model is correct and supports structured output.
**Warning signs:** API error `400: output_config not supported for model`.

### Pitfall 6: Existing tests mock `messages.create`, not `messages.parse`
**What goes wrong:** `tests/integration/c4Generation.test.ts` mocks `messages.create` with a free-text response. After switching to `messages.parse` with structured output, the mock must also be updated.
**Why it happens:** `messages.parse` is a different method path on the Anthropic client.
**How to avoid:** Update mock to stub `messages.parse` and return a properly shaped `parsed_output` object.
**Warning signs:** Test crashes with "TypeError: client.messages.parse is not a function".

---

## Code Examples

Verified patterns from official sources:

### Structured Output with zodOutputFormat (preserving existing cache_control)
```typescript
// Source: Context7 /anthropics/anthropic-sdk-typescript
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// Per-level schema (only request fields relevant to this level)
const ContainerLevelSchema = z.object({
  containers: z.array(z.object({
    name: z.string(),        // e.g. "Electron Main Process"
    technology: z.string(),  // e.g. "Node.js/Electron"
    description: z.string(), // e.g. "Application lifecycle and IPC"
    type: z.enum(['process', 'database', 'queue', 'storage']),
  })),
  relationships: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
    technology: z.string().optional(), // e.g. "Electron IPC"
  })),
  externalSystems: z.array(z.object({
    name: z.string(),
    description: z.string(),
    relationship: z.string(),
    technology: z.string().optional(),
  })),
});

// messages.parse supports the same system/message structure as messages.create
const message = await this.client.messages.parse({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  system: [
    {
      type: 'text',
      text: this.getSystemPrompt(level, staticData.technologies),
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: JSON.stringify(staticData, null, 2),
      cache_control: { type: 'ephemeral' },
    },
  ],
  messages: [{
    role: 'user',
    content: this.getUserPrompt(level, staticData.technologies),
  }],
  output_config: {
    format: zodOutputFormat(ContainerLevelSchema),
  },
});

// parsed_output is typed as z.infer<typeof ContainerLevelSchema> | null
if (!message.parsed_output) {
  throw new Error('AI enrichment returned invalid structured output');
}
return message.parsed_output; // typed, validated
```

### Consuming Enriched Data in PlantUML Generator
```typescript
// Before (BROKEN — enrichedData is ignored):
generateContainerDiagram(_enrichedData: string, staticData: AnalysisResult): string {
  const containers = this.detectContainers(staticData); // heuristic only
  // ...
}

// After (FIXED — AI data consumed, static fallback preserved):
generateContainerDiagram(enrichedData: EnrichedContainerLevel | null, staticData: AnalysisResult): string {
  const containers = (enrichedData?.containers?.length ?? 0) > 0
    ? enrichedData!.containers
    : this.detectContainersFallback(staticData);
  // ...
}
```

### Mock Update for Tests
```typescript
// In c4Generation.test.ts — update the vi.mock for messages.parse:
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn(), // keep for backward compat
        parse: vi.fn().mockResolvedValue({
          parsed_output: {
            containers: [
              { name: 'Electron Main Process', technology: 'Node.js/Electron', description: 'Application lifecycle', type: 'process' },
              { name: 'Renderer Process', technology: 'React/TypeScript', description: 'User interface', type: 'process' },
            ],
            relationships: [
              { from: 'Electron Main Process', to: 'Renderer Process', label: 'IPC communication', technology: 'Electron IPC' },
            ],
            externalSystems: [],
          },
          usage: {
            input_tokens: 1000,
            output_tokens: 200,
            cache_creation_input_tokens: 500,
            cache_read_input_tokens: 0,
          },
        }),
      };
    },
    APIError: class APIError extends Error {
      status?: number;
    },
  };
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `JSON.parse(content.text)` | `messages.parse` + `zodOutputFormat` | SDK 0.40+ | Schema validated at API level, typed `parsed_output` |
| System prompt as `string` | System prompt as `ContentBlockParam[]` with `cache_control` | SDK 0.20+ | Enables prompt caching (90% cost reduction) |
| `messages.create` for all uses | `messages.parse` for structured data, `messages.create` for free text | SDK 0.40+ | Cleaner API contract |

**Deprecated/outdated:**
- Free-text prompt injection like `"respond ONLY with valid JSON"`: replaced by `output_config.format` which enforces this at the API level.
- `content[0].text` + manual `JSON.parse()`: works but fragile; `parsed_output` is the correct pattern.

---

## Open Questions

1. **Is `zod` already installed in the project?**
   - What we know: Not visible in the package.json excerpt extracted. `@anthropic-ai/sdk/helpers/zod` is a named export in the SDK package itself but requires `zod` as a peer dependency.
   - What's unclear: Whether `zod` is in `package.json`.
   - Recommendation: Run `cat package.json | grep zod` before planning. If absent, add `zod` install as Wave 0 task. Alternative: use `jsonSchemaOutputFormat` from `@anthropic-ai/sdk/helpers/json-schema` (no Zod required).

2. **Should each C4 level have its own schema, or one shared schema?**
   - What we know: Context level needs actors/externalSystems; Container needs containers/relationships; Component needs components; Code level uses static analysis directly (no AI enrichment needed).
   - What's unclear: Whether one large schema with optional fields is simpler to maintain than four small schemas.
   - Recommendation: Four per-level schemas. Reduces token count (smaller schema = fewer output tokens), reduces null-field confusion, and aligns with the existing `getC4SystemPrompt(level)` pattern.

3. **Does `messages.parse` support array-type `system` (for cache_control)?**
   - What we know: SDK docs show `messages.parse` accepts same parameters as `messages.create` including system as `ContentBlockParam[]`. Context7 examples confirm `cache_control` in system blocks.
   - What's unclear: Whether there is a TypeScript type narrowing issue with `messages.parse` accepting `system: ContentBlockParam[]`.
   - Recommendation: HIGH confidence this works — the SDK defines `messages.parse` as accepting the same `MessageCreateParams` as `messages.create`. Validate in Wave 0 integration test.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm run test:unit -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENRCH-01 | AI output appears in rendered PlantUML (containers/components from enriched data, not heuristics) | integration | `npx vitest run tests/integration/c4Generation.test.ts` | ✅ (update existing) |
| ENRCH-02 | `enrichArchitecture()` returns typed structured object, not string | unit | `npx vitest run tests/unit/main/aiEnricher.test.ts` | ❌ Wave 0 |
| ENRCH-03 | Container diagram contains AI-provided names like "Electron Main Process" | integration | `npx vitest run tests/integration/c4Generation.test.ts` | ✅ (update existing) |
| ENRCH-04 | React-app enrichment prompt differs from Express-app prompt; framework-specific names appear | unit | `npx vitest run tests/unit/main/aiEnricher.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/main/aiEnricher.test.ts tests/integration/c4Generation.test.ts`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** `npm test` full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/main/aiEnricher.test.ts` — unit tests for `AIEnricherService` covering ENRCH-02 and ENRCH-04 (structured output return type, framework-aware prompt branching)
- [ ] Update `tests/integration/c4Generation.test.ts` — change `messages.create` mock to `messages.parse` mock with `parsed_output` shape

*(Existing test infrastructure covers all other phase requirements)*

---

## Sources

### Primary (HIGH confidence)
- `/anthropics/anthropic-sdk-typescript` (Context7) — `messages.parse`, `zodOutputFormat`, `jsonSchemaOutputFormat`, `cache_control` in system array; all verified against SDK helpers.md
- `/Users/johnrusch/Code/reef/src/main/services/c4/aiEnricherService.ts` — confirmed `_enrichedData` discard and current `string` return type
- `/Users/johnrusch/Code/reef/src/main/services/c4/c4PlantUMLGenerator.ts` — confirmed all four methods use `_enrichedData` (unused parameter)
- `/Users/johnrusch/Code/reef/src/main/services/c4/c4AnalyzerService.ts` — confirmed call site type chain
- `/Users/johnrusch/Code/reef/src/main/services/c4/types/analysisTypes.ts` — confirmed `AnalysisResult` shape with `technologies`, `componentGroups`, `metadata.analysisQuality`

### Secondary (MEDIUM confidence)
- Context7 examples confirm `messages.parse` accepts `system: ContentBlockParam[]` with `cache_control` — verified via SDK helper docs, not a separate official changelog reference

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@anthropic-ai/sdk` ^0.78.0 is already installed; `zodOutputFormat` / `messages.parse` verified in Context7 docs
- Architecture: HIGH — all four service files read and discard bug confirmed from source
- Pitfalls: HIGH — type chain impact confirmed by reading `c4AnalyzerService.ts` call site; test mock pattern confirmed by reading existing test

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (Anthropic SDK stable; 30 days)
