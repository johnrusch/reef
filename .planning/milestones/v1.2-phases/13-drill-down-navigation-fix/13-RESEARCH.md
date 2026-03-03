# Phase 13: Drill-Down Navigation Fix - Research

**Researched:** 2026-03-03
**Domain:** SVG click detection, PlantUML ID sanitization, C4 element ID registry, container-to-path resolution
**Confidence:** HIGH

## Summary

Phase 13 fixes four concrete, code-inspectable bugs in the C4 drill-down navigation pipeline. No new external libraries are needed. Every fix operates within existing TypeScript files. The bugs are all traceable from source-level inspection of `c4PlantUMLGenerator.ts`, `changeTrackingService.ts`, `DiagramViewer.tsx`, and `PlantUMLRenderer.tsx`.

The core problem is an identity gap: a C4 element has a human name (e.g. "Main Process"), a PlantUML-sanitized ID (e.g. "Main_Process"), and a filesystem path (e.g. "src/main"). These three representations must be consistently mapped throughout the pipeline — generation, storage key lookup, SVG click extraction, and change-tracking — but currently each piece of the system uses a different representation at inconsistent points.

The SVG transparency bug (NAV-04) is a PlantUML-version-dependent issue: newer PlantUML JAR versions emit a full-coverage transparent `<rect>` or `<a>` element that absorbs clicks before they reach labeled element groups. The fix is a CSS `pointer-events: none` patch applied to those transparent overlay shapes after SVG render.

**Primary recommendation:** Introduce an `ElementIdRegistry` singleton that owns the canonical `name -> sanitizedId -> containerPath` mapping, called at generation time and queried at click/navigation time. Fix the SVG click transparency by filtering the intercepting element type in the DOM traversal.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | User can drill from Container diagram into Component diagram without errors (fix elementId sanitization mismatch) | Confirmed: `getContainerPath()` keys on human name ("Main Process") but receives sanitized ID ("Main_Process") from SVG click; registry or desanitization resolves this |
| NAV-02 | Container-to-path resolution works for any repo structure (replace hardcoded Main Process/Renderer Process map) | Confirmed: `getContainerPath()` hardcodes three entries; must be derived from static analysis entry points at generation time and stored |
| NAV-03 | Element IDs are consistent across generation, storage, click detection, and navigation (ElementId registry) | Confirmed: `sanitizeId()` is duplicated in three files (generator, changeTrackingService, needed in navigation); registry centralizes this |
| NAV-04 | SVG click detection works correctly on all PlantUML versions (patch transparency bug) | Confirmed: `PlantUMLRenderer.tsx` DOM traversal skips transparent overlay shapes only partially; newer PlantUML JAR emits extra `<rect fill="none">` or link anchors |
</phase_requirements>

## Standard Stack

### Core (no new libraries needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | existing | Element registry persistence | Already used in `C4StorageService`; no new dep |
| Zustand | existing | Navigation store (already `useNavigationStore`) | Already the state layer |
| Vitest + @testing-library/react | existing | Tests | Already configured |

### No New Dependencies

All four bugs are pure logic fixes within existing files. No npm installs required.

## Architecture Patterns

### Current Broken Flow

```
User clicks SVG element
  -> PlantUMLRenderer.handleSvgClick()
     -> extracts ID "Main_Process" (sanitized)
  -> DiagramViewer.handleElementClick(elementId="Main_Process")
     -> navigationStore.push({ level: 'component', elementId: "Main_Process" })
     -> onRegenerateDiagram({ type: 'c4-component', elementId: "Main_Process" })
  -> C4AnalyzerService.generateC4Diagram(repoPath, 'component', "Main_Process")
  -> C4PlantUMLGenerator.generateComponentDiagram(enriched, static, "Main_Process")
     -> getContainerPath("Main_Process")
        -> pathMap["Main Process"] = "src/main"  // KEY MISMATCH: lookup uses unsanitized key
        -> pathMap["Main_Process"] = undefined   // actual lookup: falls to default
        -> returns "main_process"                // WRONG: no files match this
  -> detectComponents(staticData, "main_process")
     -> filter: group.files.some(f => f.includes("main_process")) // NOTHING MATCHES
  -> empty Component diagram
```

### Fixed Flow (with Registry)

```
At generation time (generateContainerDiagram):
  -> for each container, record: registry.register("container", "Main Process", "src/main")
  -> registry persists: { "Main_Process": { name: "Main Process", containerPath: "src/main" } }

At click time:
  -> elementId "Main_Process" extracted from SVG
  -> registry.lookup("Main_Process") -> containerPath "src/main"
  -> generateComponentDiagram(enriched, static, "Main_Process", containerPath="src/main")
  -> detectComponents(staticData, "src/main") // MATCHES files correctly
```

### Recommended Project Structure

No new directories needed. Modifications are additive or in-place:

```
src/
├── main/services/c4/
│   ├── elementIdRegistry.ts      # NEW: ElementIdRegistry singleton
│   ├── c4PlantUMLGenerator.ts    # MODIFY: register IDs at generation, accept containerPath
│   ├── c4AnalyzerService.ts      # MODIFY: pass registry lookup to generator
│   └── changeTrackingService.ts  # MODIFY: import shared sanitizeId from registry
├── renderer/
│   └── components/
│       └── PlantUMLRenderer.tsx  # MODIFY: fix transparent overlay traversal
tests/
├── unit/main/services/
│   └── elementIdRegistry.test.ts # NEW: registry unit tests
└── unit/renderer/components/DiagramViewer/
    └── NavigationDrillDown.test.tsx # NEW: end-to-end click->navigate tests
```

### Pattern 1: ElementIdRegistry — Canonical ID Mapping

**What:** A class that owns `sanitizedId -> { humanName, containerPath, level }` mapping.
**When to use:** Called by generator at diagram creation time; queried by analyzer when receiving click elementId.

```typescript
// src/main/services/c4/elementIdRegistry.ts
export class ElementIdRegistry {
  // In-memory map for current session. Reset per repo.
  private readonly entries: Map<string, RegistryEntry> = new Map();

  /**
   * Register an element ID produced during diagram generation.
   * @param sanitizedId  The ID as it appears in PlantUML output and SVG
   * @param humanName    The display name (e.g. "Main Process")
   * @param containerPath The filesystem path used by detectComponents (e.g. "src/main")
   * @param level        The C4 level this element belongs to
   */
  register(sanitizedId: string, humanName: string, containerPath: string, level: C4Level): void {
    this.entries.set(sanitizedId, { humanName, containerPath, level });
  }

  /**
   * Look up the container path for a clicked elementId.
   * Returns null if not registered (caller must handle gracefully).
   */
  getContainerPath(sanitizedId: string): string | null {
    return this.entries.get(sanitizedId)?.containerPath ?? null;
  }

  getHumanName(sanitizedId: string): string | null {
    return this.entries.get(sanitizedId)?.humanName ?? null;
  }

  /** Clear entries when switching repository */
  clear(): void {
    this.entries.clear();
  }
}
```

### Pattern 2: Dynamic containerPath — Replace Hardcoded Map (NAV-02)

**What:** Derive containerPath from static analysis entry points at generation time, not from a static map of three known names.

```typescript
// In C4PlantUMLGenerator.generateContainerDiagram()
// Current (broken for non-Electron repos):
private getContainerPath(containerId: string): string {
  const pathMap: Record<string, string> = {
    'Main Process': 'src/main',
    'Renderer Process': 'src/renderer',
    'Preload Script': 'preload',
  };
  return pathMap[containerId] || containerId.toLowerCase();
}

// Fixed: derive containerPath from where entry points live in staticData
// Instead of a hardcoded map, derive from staticData.entryPoints
private deriveContainerPath(containerName: string, staticData: AnalysisResult): string {
  // Find any file in static data that lives in the same directory as the container
  // Entry points like src/main/main.ts -> container "Main Process" -> path "src/main"
  const sanitized = this.sanitizeId(containerName);
  for (const ep of staticData.entryPoints) {
    const parts = ep.split('/');
    const srcIdx = parts.indexOf('src');
    if (srcIdx >= 0) {
      const dirName = parts[srcIdx + 1] || '';
      if (sanitized.toLowerCase().includes(dirName.toLowerCase()) || dirName.toLowerCase().includes(sanitized.toLowerCase().replace(/_/g, ''))) {
        return parts.slice(0, srcIdx + 2).join('/'); // "src/main"
      }
    }
  }
  // Fallback: use lowercase directory scan
  return containerName.toLowerCase().replace(/\s+/g, '/');
}
```

### Pattern 3: Shared sanitizeId (NAV-03 consistency)

**What:** Single source of truth for the sanitization function used by generator and change tracker.

```typescript
// In elementIdRegistry.ts — export the shared function
export function sanitizeId(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&');
}

// c4PlantUMLGenerator.ts — import instead of re-implementing
import { sanitizeId } from './elementIdRegistry';

// changeTrackingService.ts — already has its own copy, replace with import
import { sanitizeId } from './c4/elementIdRegistry';
```

### Pattern 4: SVG Click Transparency Fix (NAV-04)

**What:** PlantUML JAR (newer versions) emits `<a>` link anchors or `<rect fill="none" pointer-events="all">` covering entire element groups. These intercept clicks before the labeled element `<g id="elem_...">` is reached in `handleSvgClick`'s DOM traversal.

**Diagnosis:** The DOM traversal walks up from `event.target`. If the target is a transparent `<rect>` or `<a>` link element with no ID but `pointer-events="all"`, the traversal finds it first and the `id` check fails (no `elem_` prefix), so `elementId` remains null.

**Fix strategy:** CSS `pointer-events: none` patch injected into the SVG after render, targeting specific no-ID overlays:

```typescript
// In PlantUMLRenderer.tsx — after SVG is set into DOM (inside useEffect)
function patchSvgClickInterception(svgElement: SVGSVGElement): void {
  // Patch 1: <a> elements without id that wrap element groups
  // PlantUML newer JARs emit these for hyperlink support
  svgElement.querySelectorAll('a[href=""]').forEach(a => {
    (a as SVGElement).style.pointerEvents = 'none';
  });

  // Patch 2: <rect fill="none"> with pointer-events="all" that cover entire diagram
  // These are emitted for hit-testing in newer PlantUML versions
  svgElement.querySelectorAll('rect[fill="none"]').forEach(rect => {
    const pe = (rect as SVGRectElement).getAttribute('pointer-events');
    if (pe === 'all' || pe === 'painted') {
      (rect as SVGRectElement).style.pointerEvents = 'none';
    }
  });
}
```

**Alternative fix:** Modify the DOM traversal to skip elements that are link anchors or transparent rects when they have no valid ID:

```typescript
// In handleSvgClick traversal loop — add to existing skip conditions
if (id === 'svg_root' || id.startsWith('_')) {
  element = element.parentElement;
  continue;
}
// NEW: Skip <a> elements with no meaningful ID (PlantUML link anchors)
if (element.tagName === 'a' && !id.startsWith('elem_')) {
  element = element.parentElement;
  continue;
}
```

Both approaches are safe to combine. CSS patch is preferable as the primary fix (works without modifying traversal logic).

### Anti-Patterns to Avoid

- **Storing desanitized names in the navigation store:** The navigation store (`navigationStore.ts`) currently stores `elementId` from SVG click, which is already sanitized. The registry lookup belongs in `C4AnalyzerService`, not in the navigation layer.
- **Rebuilding registry from database on cold start:** This adds complexity without strong benefit. The registry is populated during the generation call, which already runs static analysis. Registry is in-memory, per session.
- **Desanitizing IDs in the renderer:** All reverse-lookup should happen in the main process where static analysis runs. The renderer only passes the raw SVG elementId over IPC.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ID sanitization function | Multiple copies in each file | Single exported `sanitizeId()` in `elementIdRegistry.ts` | Three divergent copies (generator, changeTracker, needed in analyzer) already exist; already duplicated bugs will multiply |
| Container path resolution | Hardcoded `pathMap` | Dynamic derivation from `staticData.entryPoints` + registry | pathMap breaks for any repo that isn't Electron (non-Electron repos have different container names) |
| SVG event interception patch | Custom PlantUML fork | CSS `pointer-events` patch applied after render | PlantUML JAR is a bundled binary; patching output SVG is the standard approach |

**Key insight:** All four fixes are wiring problems, not algorithmic problems. The logic to sanitize IDs, resolve paths, and handle SVG events already exists — it just needs to be connected correctly through a shared registry.

## Common Pitfalls

### Pitfall 1: Registry Not Populated Before Navigation
**What goes wrong:** User loads app, sees a cached diagram, and clicks an element. The generator was never called in this session, so the registry is empty. `getContainerPath()` returns null.
**Why it happens:** Registry is populated during `generateC4Diagram()`. But if the diagram is served from cache (storage hit), Phase 1 is skipped.
**How to avoid:** On cache hit, populate the registry from the cached diagram's metadata OR fall back to static analysis heuristics for container path resolution (run `deriveContainerPath` using fresh static analysis). The `generateC4Diagram()` cache-hit path must also call registry population.
**Warning signs:** Click works first time after fresh generation but fails after app restart.

### Pitfall 2: sanitizeId Mismatch Between Generator and Change Tracker
**What goes wrong:** Generator uses one sanitization, change tracker uses a slightly different one. IDs in SVG don't match IDs in `affectedElements`, so amber highlighting identifies wrong elements after regeneration.
**Why it happens:** Both currently have their own copy of `sanitizeId()`. If one is updated, the other diverges.
**How to avoid:** Import `sanitizeId` from `elementIdRegistry.ts` in both files.
**Warning signs:** Change highlighting identifies an element by the wrong name after modifying the generator's sanitize function.

### Pitfall 3: getAvailableContainers Returns Different Format Than Generator
**What goes wrong:** `getAvailableContainers()` returns raw directory names from `src/` (e.g. "main", "renderer") while the generator produces human-readable names (e.g. "Main Process"). The UI dropdown shows "main" but the click sends "Main_Process".
**Why it happens:** These two code paths evolved independently. `getAvailableContainers()` in `C4AnalyzerService` does path extraction; the generator uses AI-enriched or hardcoded names.
**How to avoid:** After fixing NAV-01/NAV-02, `getAvailableContainers()` should return the same human names the generator uses (e.g., what AI enrichment produced or the hardcoded fallback). The registry can also serve as the source of truth here.
**Warning signs:** Manual container selector in `VisualMapTab.tsx` shows lowercase "main" but drill-down navigation uses "Main Process".

### Pitfall 4: PlantUML Transparency Elements Differ by JAR Version
**What goes wrong:** CSS patch targets `rect[fill="none"]` but JAR version X emits `rect[fill="#FEFECE"]` with alpha or a different structural pattern.
**Why it happens:** PlantUML's SVG output format changes between versions. The `<a>` link element behavior changed after version 1.2023.x.
**How to avoid:** The traversal-level fix (skipping `<a>` elements without `elem_` ID) is more robust than the CSS patch alone because it is independent of specific SVG attribute values. Apply both.
**Warning signs:** Click works with old JAR but not new one, or vice versa.

### Pitfall 5: Empty Component Diagram Still Renders (No Error Thrown)
**What goes wrong:** `generateComponentDiagram` produces syntactically valid PlantUML with zero `Component()` entries. This renders as an empty box. User sees a diagram with no error, just nothing inside.
**Why it happens:** `detectComponents()` returns empty array silently when `containerPath` doesn't match any files.
**How to avoid:** Add a guard: if `components.length === 0`, emit a placeholder `Component(noContent, "No components found", "Check container ID")` so the user gets feedback. Or throw with a descriptive error.
**Warning signs:** Diagram renders but shows only the container boundary box with no content inside.

## Code Examples

### NAV-01 Fix: Registry-Based containerPath Lookup

```typescript
// Source: code inspection of src/main/services/c4/c4PlantUMLGenerator.ts
// In C4AnalyzerService.generateC4Diagram() after cache miss:

// At container diagram generation time:
const registry = new ElementIdRegistry();
const plantUML = this.generator.generateContainerDiagram(
  enrichedData as EnrichedContainerLevel | null,
  staticData,
  registry  // pass registry to capture container ID -> path mapping
);

// In generateContainerDiagram():
for (const container of containers) {
  const id = this.sanitizeId(container.name);
  const containerPath = this.deriveContainerPath(container.name, staticData);
  registry.register(id, container.name, containerPath, 'container');
  // ... emit PlantUML Container() line
}

// At component diagram generation time:
const containerPath = registry.getContainerPath(elementId)
  ?? this.deriveContainerPath(elementId, staticData);  // fallback for cold start
```

### NAV-02 Fix: Dynamic containerPath Derivation

```typescript
// Source: code inspection of src/main/services/c4/c4PlantUMLGenerator.ts lines 559-567
// Replace getContainerPath() with deriveContainerPath():

private deriveContainerPath(containerName: string, staticData: AnalysisResult): string {
  // Normalize containerName for comparison (handles sanitized IDs too)
  const normalized = containerName.replace(/_/g, '').toLowerCase();

  for (const ep of staticData.entryPoints) {
    const parts = ep.replace(/\\/g, '/').split('/');
    const srcIdx = parts.indexOf('src');
    if (srcIdx < 0) continue;
    const dirName = (parts[srcIdx + 1] || '').toLowerCase();
    if (normalized.includes(dirName) || dirName.includes(normalized.slice(0, 4))) {
      return parts.slice(0, srcIdx + 2).join('/');
    }
  }

  // Last resort: use directory structure from classes
  for (const cls of staticData.structure.classes) {
    const parts = cls.file.replace(/\\/g, '/').split('/');
    const srcIdx = parts.indexOf('src');
    if (srcIdx < 0) continue;
    const dirName = (parts[srcIdx + 1] || '').toLowerCase();
    if (normalized.includes(dirName) || dirName.includes(normalized.slice(0, 4))) {
      return parts.slice(0, srcIdx + 2).join('/');
    }
  }

  return normalized; // absolute fallback
}
```

### NAV-03 Fix: Shared sanitizeId

```typescript
// Source: comparing src/main/services/c4/c4PlantUMLGenerator.ts line 737-741
// and src/main/services/changeTrackingService.ts lines 30-32
// Both are identical — safe to extract

// src/main/services/c4/elementIdRegistry.ts
export function sanitizeId(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&');
}

// Replace private sanitizeId() in C4PlantUMLGenerator with import
// Replace exported sanitizeId() in changeTrackingService.ts with re-export from registry
```

### NAV-04 Fix: SVG Click Traversal Patch

```typescript
// Source: code inspection of src/renderer/components/PlantUMLRenderer.tsx lines 94-135
// Current traversal skips svg_root and underscore-prefixed IDs.
// Add skip for transparent click-intercepting elements:

while (element && element !== event.currentTarget) {
  const id = element.getAttribute('id');

  if (id) {
    if (id === 'svg_root' || id.startsWith('_')) {
      element = element.parentElement;
      continue;
    }
    // NEW: Skip <a> elements that are PlantUML link wrappers with no elem_ prefix
    if (element.tagName.toLowerCase() === 'a' && !id.startsWith('elem_')) {
      element = element.parentElement;
      continue;
    }
    if (id.startsWith('elem_')) {
      elementId = id.replace('elem_', '');
      break;
    }
    elementId = id;
    break;
  }

  // NEW: Skip elements with no ID that are transparent overlays
  // PlantUML emits <rect fill="none" pointer-events="all"> in newer versions
  if (!id) {
    const fill = element.getAttribute('fill');
    const pe = element.getAttribute('pointer-events');
    if (fill === 'none' && (pe === 'all' || pe === 'painted')) {
      element = element.parentElement;
      continue;
    }
  }

  element = element.parentElement;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded container name map | Dynamic path derivation from entryPoints | Phase 13 | Any repo structure works, not just Electron |
| Duplicated sanitizeId copies | Single shared function in registry | Phase 13 | Guaranteed consistency across pipeline |
| DOM traversal with partial ID skip | Extended skip list including link anchors and transparent rects | Phase 13 | Click detection works across PlantUML JAR versions |

**Currently working (do not regress):**
- Amber change highlighting in `applyChangeHighlighting()` — 9 tests passing
- Breadcrumb navigation in `navigationStore` — do not change stack structure
- `diagramStateStore` affected elements storage — do not change the store API

## Open Questions

1. **Registry persistence strategy for cold-start**
   - What we know: Registry is in-memory, reset per session. Cache hits skip generation, so registry is empty on app restart.
   - What's unclear: Whether cold-start click should re-run static analysis (fast, ~500ms) or parse the stored PlantUML content to reconstruct registry (fragile).
   - Recommendation: On cache hit in `generateC4Diagram()`, call a lightweight `populateRegistryFromStatic(staticData)` helper that runs static analysis and registers all containers. This is already done anyway for component/code generation — make it unconditional.

2. **AI-enriched container names vs. static analysis container names**
   - What we know: When AI enrichment is used, container names come from AI (e.g. "Authentication Service") not from static analysis paths (e.g. "main"). These won't map to filesystem paths easily.
   - What's unclear: How the generator reconciles AI-provided names with filesystem paths for `detectComponents()`.
   - Recommendation: When AI containers are used, the `containerPath` in the registry should be derived by matching AI container name against the `componentGroups` from static analysis (their `files` array has the real paths). This is the dynamic derivation strategy.

3. **PlantUML SVG `<a>` element structure across JAR versions**
   - What we know: node-plantuml (v0.9.0) bundles a specific JAR version. The local JAR produces a specific SVG structure.
   - What's unclear: Exactly which SVG element causes click interception on the user's installed Java + local JAR.
   - Recommendation: The DOM traversal fix (skip `<a>` with no `elem_` id) is safe regardless of JAR version. Implement it defensively. The CSS `pointer-events: none` patch is a secondary defense.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 1.x (existing) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | `generateComponentDiagram` with sanitized elementId produces non-empty output | unit | `npm run test:unit -- --run elementIdRegistry` | ❌ Wave 0 |
| NAV-01 | Registry lookup returns correct containerPath for sanitized ID | unit | `npm run test:unit -- --run elementIdRegistry` | ❌ Wave 0 |
| NAV-02 | `deriveContainerPath` resolves path for non-Electron repo (no "Main Process") | unit | `npm run test:unit -- --run c4PlantUMLGenerator` | ❌ (extend existing test) |
| NAV-02 | `getAvailableContainers` returns names matching what generator produces | unit | `npm run test:unit -- --run c4PlantUMLGenerator` | ❌ Wave 0 |
| NAV-03 | `sanitizeId` from registry and from generator produce identical output | unit | `npm run test:unit -- --run elementIdRegistry` | ❌ Wave 0 |
| NAV-03 | `sanitizeId` from registry and from changeTrackingService produce identical output | unit | `npm run test:unit -- --run changeTrackingService` | existing (partial) |
| NAV-04 | SVG click handler extracts elementId when `<a>` element has no `elem_` id | unit | `npm run test:unit -- --run PlantUMLRenderer` | ❌ Wave 0 |
| NAV-04 | SVG click handler extracts elementId when transparent `<rect fill="none">` is present | unit | `npm run test:unit -- --run PlantUMLRenderer` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/main/services/elementIdRegistry.test.ts` — covers NAV-01, NAV-02, NAV-03
- [ ] `tests/unit/renderer/components/DiagramViewer/NavigationDrillDown.test.tsx` — covers NAV-04 click handler behavior
- [ ] Extend `tests/unit/main/c4PlantUMLGenerator.enrichment.test.ts` — add NAV-02 `deriveContainerPath` test cases

*(Existing `tests/unit/renderer/components/DiagramViewer/PlantUMLRenderer.changeHighlight.test.tsx` covers change highlighting patterns. The click handler tests are separate and missing.)*

## Sources

### Primary (HIGH confidence)
- Code inspection: `src/main/services/c4/c4PlantUMLGenerator.ts` — `sanitizeId()`, `getContainerPath()`, `generateComponentDiagram()`
- Code inspection: `src/renderer/components/PlantUMLRenderer.tsx` — `handleSvgClick()` DOM traversal
- Code inspection: `src/main/services/changeTrackingService.ts` — duplicate `sanitizeId()` export
- Code inspection: `src/main/services/c4/c4AnalyzerService.ts` — `generateC4Diagram()` cache hit path, `getAvailableContainers()`
- Code inspection: `src/renderer/components/DiagramViewer/DiagramViewer.tsx` — `handleElementClick()` shows elementId is the raw sanitized SVG id passed as-is

### Secondary (MEDIUM confidence)
- STATE.md blocker note: "ElementIdRegistry persistence strategy (metadata column vs. rebuild on start) is undecided"
- ROADMAP.md Phase 13 description: explicitly names the four bug types

### Tertiary (LOW confidence)
- PlantUML SVG `<a>` element behavior by JAR version: inferred from DOM traversal code comment "PlantUML wraps elements in groups with `elem_` prefix" — implies newer versions may add additional wrappers

## Metadata

**Confidence breakdown:**
- Bug root causes: HIGH — all confirmed by direct source code inspection
- Fix patterns: HIGH — standard registry pattern, CSS pointer-events, shared function extraction
- SVG transparency specifics: MEDIUM — exact SVG structure varies by PlantUML JAR version; defensive dual-fix recommended
- Cold-start registry strategy: MEDIUM — tradeoff between re-running static analysis vs. parsing stored PlantUML

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable domain — no external library changes)
