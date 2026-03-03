# Phase 11: Static Analysis Depth - Research

**Researched:** 2026-03-02
**Domain:** ts-morph AST extraction, TypeScript/JavaScript static analysis, C4 diagram data enrichment
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Diagram element richness**
- Only "significant" exported functions become diagram elements — React hooks, service functions, route handlers
- Small utility functions (formatDate, isString) are extracted but metadata-only, not diagram elements
- Use a heuristic to classify function significance (export status, naming conventions, file location)
- Decorators set element roles — framework decorators (@Controller, @Injectable, @Component) map to architectural role labels on diagram elements
- React components get `<<Component>>` stereotype, hooks get `<<Hook>>` stereotype — makes diagrams framework-aware

**Component grouping labels**
- Semantic role mapping — map common directory conventions to architectural labels (e.g., 'services' → "Service Layer", 'controllers' → "API Controllers", 'stores' → "State Management")
- Unrecognized directories use their directory name as fallback group label (e.g., 'c4/' → "c4")
- File-structure quality indicator — when diagrams are generated from file structure (not full AST), show a badge: "Generated from file structure — add TypeScript for richer analysis"

**Non-TypeScript repo handling**
- File-structure analysis + AI enrichment — analyze directory layout and file names to infer components, pass to AI in Phase 12
- For plain JavaScript repos: parse .js/.jsx files with ts-morph (it can handle JS without tsconfig) to extract structural data
- For non-JS repos (Python, etc.): file-structure-only analysis — directory layout, file names, and any available metadata
- Partial results with warning on failure — show whatever was successfully parsed with a count like "23 of 45 files analyzed". Never crash, always produce something
- Show quality indicator badge when diagram was generated from file structure rather than full AST

**Code-level diagram scope**
- Public API only — only exported/public methods and properties shown. Private internals hidden
- Function signatures show return type only: `analyzeProject(): Promise<AnalysisResult>`. Parameters omitted for brevity
- Cap at ~15 elements per Code diagram — show most important first (exported, then by usage), add "... and N more" overflow note
- React components and hooks get framework-specific stereotypes (`<<Component>>`, `<<Hook>>`)

### Claude's Discretion
- JSDoc annotation handling — how JSDoc feeds into diagram content (descriptions, classification, both, or neither)
- Type alias and enum visibility — whether they become diagram elements or stay as metadata
- Directory nesting depth for component grouping — flat vs two-level vs adaptive
- Root file grouping strategy — whether root-level files get their own group
- Loading skeleton and exact error state designs
- Specific threshold for "significant" function heuristic

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLZ-01 | Static analysis multi-pass extraction produces accurate results (fix forgetDescendants call order) | Confirmed: `forgetDescendants()` at line 160/205/242/275 is called BEFORE extraction — nodes become inaccessible after forgetting. Fix: move call AFTER extraction per-file, or use `forgetNodesCreatedInBlock`. |
| ANLZ-02 | User sees richer diagram content from extracted functions, decorators, JSDoc, parameter types, and return types | ts-morph 23 provides: `sourceFile.getFunctions()`, `classDecl.getDecorators()`, `decl.getJsDocs()`, `funcDecl.getReturnType().getText()`, `funcDecl.isAsync()`, `funcDecl.isExported()` — all verified via Context7 and official docs. |
| ANLZ-03 | User sees components grouped by directory structure and architectural role, not just class suffix matching | Requires: (1) directory scan of analyzed file paths, (2) semantic role map (services→"Service Layer", etc.), (3) fallback to raw directory name — no new library needed, pure logic in `StaticAnalyzerService`. |
| ANLZ-04 | User can generate diagrams for non-TypeScript repos using file structure heuristics and AI-only analysis | ts-morph handles JS/JSX with `compilerOptions: { allowJs: true, jsx: JsxEmit.React }` and no tsconfig path. Python/Go repos: `fs.readdir` recursive scan + path-based heuristics. Both paths add `analysisQuality` field to `AnalysisResult`. |
</phase_requirements>

## Summary

Phase 11 is primarily a correctness and enrichment fix for the existing `StaticAnalyzerService`. The codebase already uses ts-morph 23.0.0 which provides all the APIs needed — this phase is about using them correctly and more completely. There are no new libraries to install.

The critical bug (ANLZ-01) is definitively identified: `forgetDescendants()` is called at the top of each extraction loop iteration, before any data is read from the source file's nodes. The ts-morph documentation explicitly states that accessing properties after `forgetDescendants()` throws an error. In practice, ts-morph appears to silently return empty arrays for already-forgotten nodes, resulting in empty class/interface/import lists. The fix is mechanical: move the `forgetDescendants()` call to after all extraction from a given source file.

For enrichment (ANLZ-02), ts-morph 23 exposes `getFunctions()`, `getDecorators()`, `getJsDocs()`, `getReturnType()`, and `isAsync()` — all confirmed against Context7 and official docs. The types in `analysisTypes.ts` need new fields (`FunctionInfo`, `DecoratorInfo`, updated `ClassInfo`). For non-TS repos (ANLZ-04), ts-morph can parse `.js`/`.jsx` without a tsconfig by passing `compilerOptions: { allowJs: true, jsx: JsxEmit.React }` and no `tsConfigFilePath`. Python/Go repos fall back to file-system-only scanning using Node's `fs` module.

**Primary recommendation:** Fix `forgetDescendants()` first in isolation, run existing tests to confirm recovery, then layer in enrichment fields one requirement at a time. This keeps each task independently testable.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | 23.0.0 (already installed) | TypeScript/JavaScript AST extraction | Already in use; provides all needed APIs for ANLZ-01 through ANLZ-04 |
| Node.js `fs/promises` | Built-in (Node 22) | File-system scan for non-JS repos | Already used in `detectTechnologies()` and `getProjectName()` |
| Node.js `path` | Built-in | Path manipulation for directory grouping | Already used throughout |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript `JsxEmit` enum | Bundled with ts-morph | Configure JSX parsing for React repos | When analyzing `.jsx`/`.tsx` JS files without tsconfig |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ts-morph for JS parsing | Babel parser (`@babel/parser`) | Babel handles more JS edge cases but adds a dependency and returns Babel AST instead of ts-morph API — switching cost too high for this phase |
| File-system scan (custom) | `fast-glob` | `fast-glob` is faster for large repos but Node's `fs.readdir` is already used and sufficient for v1.2 |
| Directory name → label mapping (inline map) | External config file | Config adds flexibility but over-engineers for the ~15 well-known directory names needed |

**Installation:** No new packages required. All dependencies are already present.

## Architecture Patterns

### Recommended Project Structure

No new files or directories are required for this phase. All changes are within:

```
src/main/services/c4/
├── staticAnalyzerService.ts    # Fix forgetDescendants; add extractFunctions(), extractDecorators(); add non-TS fallback
├── types/analysisTypes.ts      # Add FunctionInfo, DecoratorInfo, ComponentGroup; extend AnalysisResult
c4PlantUMLGenerator.ts          # Consume new fields for richer Component and Code diagrams
tests/unit/main/
├── staticAnalyzer.test.ts      # Extend for new extraction capabilities
tests/fixtures/sample-repo/src/
└── (add decorated/hook examples for test coverage)
```

### Pattern 1: Fix forgetDescendants Bug (ANLZ-01)

**What:** Move `forgetDescendants()` to AFTER extracting all data from each source file in a loop.
**When to use:** Every extraction loop — classes, interfaces, imports, exports.
**Example:**

```typescript
// Source: https://ts-morph.com/manipulation/performance
// WRONG (current code): forgets nodes BEFORE reading them
for (const sourceFile of sourceFiles) {
  sourceFile.forgetDescendants(); // BUG: nodes forgotten before access
  const classDeclarations = sourceFile.getClasses(); // returns empty — nodes gone
}

// CORRECT (fix): extract first, then forget
for (const sourceFile of sourceFiles) {
  const classDeclarations = sourceFile.getClasses(); // read while nodes are live
  for (const classDecl of classDeclarations) {
    // ... extract all data into plain objects ...
  }
  sourceFile.forgetDescendants(); // release memory AFTER extraction
}
```

**Key insight:** `forgetDescendants()` releases the in-memory cache of wrapped AST nodes. Data must be copied to plain objects (strings, booleans) before calling it. The current code calls it first, so every extraction method sees an empty AST.

**Alternative — use `forgetNodesCreatedInBlock`:**

```typescript
// Source: https://ts-morph.com/manipulation/performance
// For large projects, wrap extraction in forgetNodesCreatedInBlock for precise control
const classInfos = await project.forgetNodesCreatedInBlock(() => {
  return sourceFile.getClasses().map(cls => ({
    name: cls.getName(),
    // ... extract into plain object
  }));
});
```

The simpler fix (move `forgetDescendants()` after the loop) is correct and sufficient. `forgetNodesCreatedInBlock` is more advanced and not required.

### Pattern 2: Extract Functions with Significance Heuristic (ANLZ-02)

**What:** Extract function declarations, filter by significance, collect metadata.
**When to use:** In a new `extractFunctions()` method called from `analyzeProject()`.

```typescript
// Source: https://ts-morph.com/details/functions
// Source: https://ts-morph.com/details/documentation
// Source: https://ts-morph.com/details/async

private extractFunctions(sourceFiles: SourceFile[]): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  for (const sourceFile of sourceFiles) {
    const funcDeclarations = sourceFile.getFunctions(); // extract BEFORE forgetDescendants

    for (const funcDecl of funcDeclarations) {
      const name = funcDecl.getName();
      if (!name) continue;
      if (!funcDecl.isExported()) continue; // only exported functions

      const isSignificant = this.classifyFunctionSignificance(name, sourceFile.getFilePath());
      const jsDocs = funcDecl.getJsDocs();
      const jsDocDescription = jsDocs[0]?.getDescription().trim() ?? undefined;

      functions.push({
        name,
        file: sourceFile.getFilePath(),
        returnType: funcDecl.getReturnType().getText(),
        isAsync: funcDecl.isAsync(),
        isExported: true,
        isSignificant,
        jsDocDescription,
      });
    }

    sourceFile.forgetDescendants(); // after all extraction done
  }

  return functions;
}

// Significance heuristic (Claude's discretion on threshold)
private classifyFunctionSignificance(name: string, filePath: string): boolean {
  // React hooks: start with "use" + uppercase
  if (/^use[A-Z]/.test(name)) return true;
  // Route handlers: common Express/NestJS patterns
  if (/Handler$|Controller$|Route$/.test(name)) return true;
  // File location hints: files in /services/, /routes/, /api/
  if (/\/(services|routes|api|controllers|hooks)\//.test(filePath)) return true;
  // Default: small utilities not significant
  return false;
}
```

### Pattern 3: Extract Decorators from Classes (ANLZ-02)

**What:** Read class-level decorators and map to architectural role labels.
**When to use:** In `extractClasses()` — enrich each `ClassInfo` with decorator data.

```typescript
// Source: https://ts-morph.com/details/decorators

// Extend ClassInfo with decorator names
const decoratorNames = classDecl.getDecorators().map(d => d.getName());

// In detectArchitecturalRole():
const DECORATOR_ROLE_MAP: Record<string, string> = {
  'Controller': 'API Controller',
  'Injectable': 'Service',
  'Component': 'UI Component',
  'Pipe': 'Data Transformer',
  'Guard': 'Auth Guard',
  'Module': 'Module',
  'Entity': 'Data Entity',
};
```

### Pattern 4: JSDoc-enriched Descriptions (Claude's Discretion — RECOMMENDED)

**Recommendation:** Use JSDoc descriptions as diagram element descriptions. They are the closest thing to human-authored documentation and directly useful in C4 diagrams.

```typescript
// Source: https://ts-morph.com/details/documentation
const jsDocs = classDecl.getJsDocs();
const description = jsDocs[0]?.getDescription().trim() || '';
// Use as ClassInfo.description field (new field)
```

**Rationale:** JSDoc descriptions are already written for humans. If present, they eliminate the need for AI to guess at purpose. Absence is graceful — fall back to empty string, AI enrichment fills in Phase 12.

### Pattern 5: Directory-based Component Grouping (ANLZ-03)

**What:** Map file paths to semantic group labels. This replaces the current class-name-suffix-only approach in `getAvailableComponents()`.

```typescript
// No new library — pure logic
const DIRECTORY_ROLE_MAP: Record<string, string> = {
  'services': 'Service Layer',
  'service': 'Service Layer',
  'controllers': 'API Controllers',
  'controller': 'API Controllers',
  'stores': 'State Management',
  'store': 'State Management',
  'hooks': 'React Hooks',
  'hook': 'React Hooks',
  'components': 'UI Components',
  'component': 'UI Components',
  'pages': 'Pages',
  'page': 'Pages',
  'routes': 'Route Handlers',
  'route': 'Route Handlers',
  'middleware': 'Middleware',
  'models': 'Data Models',
  'model': 'Data Models',
  'repositories': 'Data Access',
  'repository': 'Data Access',
  'utils': 'Utilities',
  'helpers': 'Utilities',
  'types': 'Type Definitions',
  'interfaces': 'Type Definitions',
};

function getComponentGroup(filePath: string, srcRoot: string): ComponentGroup {
  const relativePath = filePath.replace(srcRoot, '');
  const segments = relativePath.split('/').filter(Boolean);
  // Skip 'src', 'main', 'renderer' top-level segments
  // Find first meaningful directory segment
  for (const segment of segments.slice(1)) {
    const label = DIRECTORY_ROLE_MAP[segment.toLowerCase()];
    if (label) return { rawName: segment, label };
    if (!segment.includes('.')) return { rawName: segment, label: segment }; // fallback
  }
  return { rawName: 'root', label: 'Root' };
}
```

### Pattern 6: Non-TypeScript Repo Handling (ANLZ-04)

**What:** Two-tier fallback: (1) JS/JSX via ts-morph with allowJs, (2) file-structure scan for Python/Go/etc.

```typescript
// Source: https://ts-morph.com/setup/ (compiler options override)
// For JavaScript repos without tsconfig:
const project = new Project({
  compilerOptions: {
    allowJs: true,
    jsx: JsxEmit.React, // from 'typescript' package, re-exported by ts-morph
    strict: false,
    skipLibCheck: true,
  },
  // No tsConfigFilePath — ts-morph infers JS mode
  skipFileDependencyResolution: true,
});
project.addSourceFilesAtPaths(join(repoPath, 'src/**/*.{js,jsx}'));
```

**For Python/Go/non-JS repos — file-structure scan:**

```typescript
// Pure Node.js fs — no new library
async function fileStructureScan(repoPath: string): Promise<FileStructureResult> {
  const entries = await fs.readdir(repoPath, { recursive: true, withFileTypes: true });
  // Group by directory, infer component groups from dir names
  // Return: directories, file counts, detected language from extensions
}
```

**`AnalysisResult` extension for quality indicator:**

```typescript
// New fields on AnalysisResult.metadata
analysisQuality: 'full-ast' | 'js-ast' | 'file-structure';
analysisWarning?: string; // e.g., "23 of 45 files analyzed. TypeScript not detected."
partialResults?: boolean;
```

### Anti-Patterns to Avoid

- **Replacing ts-morph with another parser:** The project already has ts-morph 23 installed. Adding Babel or Acorn for JS parsing creates a second AST abstraction layer with incompatible types.
- **Crashing on tsconfig absence:** The current code already returns a graceful error. The fix is to try JS fallback before returning the error, not to wrap in another try/catch.
- **Forgetting nodes globally:** Never call `project.forgetNodesCreatedInBlock()` wrapping the entire multi-file loop — this loses cross-file data needed for the dependency graph. Forget per source file only.
- **Using class name suffix as the only grouping signal:** The current `getAvailableComponents()` filters by `endsWith('Service')` etc. This is supplementary at best; directory-based grouping is the primary mechanism for ANLZ-03.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AST traversal for JS | Custom regex-based JS parser | ts-morph with `allowJs: true` | Regex breaks on edge cases (template literals, destructuring, nested functions); ts-morph uses TypeScript compiler as backend |
| File glob expansion | Manual `readdir` recursive walker | `fs.readdir` with `{ recursive: true }` (Node 18+) OR existing `addSourceFilesAtPaths` glob support | Node 18+ has built-in recursive readdir; ts-morph handles glob internally |
| Decorator-to-role lookup | Hardcoded switch/if chains | Record<string, string> lookup map | Maps are easier to extend, test, and document |
| JSDoc parsing | String manipulation on comment blocks | `getJsDocs()[0]?.getDescription()` from ts-morph | ts-morph parses JSDoc correctly including multiline, tags, and nested content |

**Key insight:** ts-morph is a thin wrapper around the TypeScript compiler API. It handles edge cases in JS/TS parsing that would require thousands of lines of custom code. The only gap is non-JS languages (Python, Go) where file-structure heuristics are explicitly the accepted fallback per the locked decisions.

## Common Pitfalls

### Pitfall 1: forgetDescendants Silently Produces Empty Data

**What goes wrong:** Calling `sourceFile.forgetDescendants()` at the top of each loop iteration causes `getClasses()`, `getInterfaces()`, `getFunctions()`, etc. to return empty arrays. No exception is thrown in ts-morph 23 for this pattern — the data is just empty.
**Why it happens:** ts-morph tracks AST wrapper nodes in a cache. `forgetDescendants()` clears that cache. The TypeScript compiler still has the data, but ts-morph won't re-wrap nodes for forgotten parents.
**How to avoid:** Always extract all data into plain objects (strings, numbers, booleans) before calling `forgetDescendants()`. The call should be the last statement before the next iteration.
**Warning signs:** If the existing tests pass after the fix (they check specific class counts from the fixture), the fix is correct. If class arrays are empty, `forgetDescendants()` was still called too early.

### Pitfall 2: ts-morph Project Initialization Fails Silently for JS Repos

**What goes wrong:** Creating a `Project` without a `tsConfigFilePath` and without explicit `compilerOptions` may cause ts-morph to fall back to very strict TypeScript defaults that reject `.js` files.
**Why it happens:** Default TypeScript compiler settings have `allowJs: false`.
**How to avoid:** Explicitly pass `compilerOptions: { allowJs: true, jsx: JsxEmit.React, strict: false, skipLibCheck: true }` when no tsconfig is found.
**Warning signs:** `project.getSourceFiles()` returns 0 files after `addSourceFilesAtPaths('src/**/*.js')`.

### Pitfall 3: `getReturnType().getText()` Fails After forgetDescendants

**What goes wrong:** Calling type-resolution APIs (`getReturnType()`, `getType()`) requires the type checker to be active. After `forgetDescendants()`, type information may be unavailable.
**Why it happens:** Type resolution walks the AST, which requires live node access.
**How to avoid:** Call `funcDecl.getReturnType().getText()` before `forgetDescendants()`. Cache the string result.
**Warning signs:** `Error: Node was forgotten` thrown during type getText calls.

### Pitfall 4: Directory Grouping Breaks for Deeply Nested File Structures

**What goes wrong:** A file at `src/main/services/c4/staticAnalyzerService.ts` would group under `c4` (the directory immediately above the file), not `services`.
**Why it happens:** Naive "take the parent directory" approach doesn't account for nesting depth.
**How to avoid:** Walk segments from the container root outward. For Reef (Electron), skip `main`/`renderer` as first segments and look for the next meaningful directory. Use the `DIRECTORY_ROLE_MAP` to identify where to stop.
**Warning signs:** Components appear under `c4` or `types` group labels instead of `Service Layer`.

### Pitfall 5: Non-JS File Extension Confusion

**What goes wrong:** ts-morph's `addSourceFilesAtPaths` may pick up `.d.ts` files, config files, or test files in JS repos, inflating the analysis.
**Why it happens:** The glob pattern `src/**/*.{js,jsx}` may match unexpected files.
**How to avoid:** Add explicit exclusion: `['src/**/*.{js,jsx}', '!**/*.test.js', '!**/*.spec.js', '!**/*.d.ts']`.
**Warning signs:** Test functions appear as significant elements, or type declaration functions appear as exported symbols.

## Code Examples

Verified patterns from official sources:

### Fix forgetDescendants (ANLZ-01)

```typescript
// Source: https://ts-morph.com/manipulation/performance

private extractClasses(sourceFiles: SourceFile[]): ClassInfo[] {
  const classes: ClassInfo[] = [];

  for (const sourceFile of sourceFiles) {
    // FIXED: Extract ALL data BEFORE forgetting descendants
    const classDeclarations = sourceFile.getClasses();

    for (const classDecl of classDeclarations) {
      const name = classDecl.getName();
      if (!name) continue;

      const decorators = classDecl.getDecorators().map(d => d.getName());
      const jsDocs = classDecl.getJsDocs();
      const description = jsDocs[0]?.getDescription().trim() || undefined;

      classes.push({
        name,
        file: sourceFile.getFilePath(),
        methods: classDecl.getMethods().map(m => m.getName()),
        properties: classDecl.getProperties().map(p => p.getName()),
        implements: classDecl.getImplements().map(impl => impl.getText()),
        extends: classDecl.getExtends()?.getText(),
        isExported: classDecl.isExported(),
        isAbstract: classDecl.isAbstract(),
        decorators,         // NEW
        description,        // NEW
      });
    }

    // FIXED: forget AFTER extraction
    sourceFile.forgetDescendants();
  }

  return classes;
}
```

### Extract Exported Functions with Significance Heuristic (ANLZ-02)

```typescript
// Source: https://ts-morph.com/details/functions
// Source: https://ts-morph.com/details/async
// Source: https://ts-morph.com/details/documentation

private extractFunctions(sourceFiles: SourceFile[]): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    const funcDeclarations = sourceFile.getFunctions();

    for (const funcDecl of funcDeclarations) {
      const name = funcDecl.getName();
      if (!name || !funcDecl.isExported()) continue;

      const returnType = funcDecl.getReturnType().getText(); // before forgetDescendants
      const isAsync = funcDecl.isAsync();
      const jsDocs = funcDecl.getJsDocs();
      const jsDocDescription = jsDocs[0]?.getDescription().trim() || undefined;
      const isSignificant = this.classifyFunctionSignificance(name, filePath);

      functions.push({
        name,
        file: filePath,
        returnType,
        isAsync,
        isExported: true,
        isSignificant,
        jsDocDescription,
      });
    }

    sourceFile.forgetDescendants(); // after extraction
  }

  return functions;
}
```

### JS Repo Analysis without tsconfig (ANLZ-04)

```typescript
// Source: https://ts-morph.com/setup/
import { Project, JsxEmit } from 'ts-morph';

const project = new Project({
  compilerOptions: {
    allowJs: true,
    jsx: JsxEmit.React,
    strict: false,
    skipLibCheck: true,
    noEmit: true,
  },
  skipFileDependencyResolution: true,
});

project.addSourceFilesAtPaths([
  join(repoPath, 'src/**/*.{js,jsx}'),
  `!${join(repoPath, '**/*.test.{js,jsx}')}`,
  `!${join(repoPath, '**/*.spec.{js,jsx}')}`,
]);
```

### New AnalysisResult Fields for Quality Indicator (ANLZ-04)

```typescript
// Extend metadata in analysisTypes.ts
export interface AnalysisResult {
  readonly structure: ProjectStructure;
  readonly dependencies: DependencyGraph;
  readonly technologies: readonly string[];
  readonly entryPoints: readonly string[];
  readonly metadata: {
    readonly projectName: string;
    readonly filesAnalyzed: number;
    readonly totalFiles: number;
    readonly timestamp: string;
    readonly duration?: number;
    // NEW fields for ANLZ-04:
    readonly analysisQuality: 'full-ast' | 'js-ast' | 'file-structure';
    readonly analysisWarning?: string;
    readonly partialResults?: boolean;
  };
  readonly error?: string;
  // NEW for ANLZ-03:
  readonly componentGroups?: readonly ComponentGroup[];
}

export interface FunctionInfo {
  readonly name: string;
  readonly file: string;
  readonly returnType: string;
  readonly isAsync: boolean;
  readonly isExported: boolean;
  readonly isSignificant: boolean;
  readonly jsDocDescription?: string;
}

export interface ComponentGroup {
  readonly rawName: string;    // directory name as-is (e.g., 'services')
  readonly label: string;      // semantic label (e.g., 'Service Layer')
  readonly files: readonly string[];
  readonly classCount: number;
  readonly functionCount: number;
}
```

### PlantUML Component Diagram Consuming Directory Groups (ANLZ-03)

```typescript
// In c4PlantUMLGenerator.ts — replace detectComponents() logic
private detectComponents(staticData: AnalysisResult, containerPath: string): ComponentEntry[] {
  // Use pre-computed componentGroups from StaticAnalyzerService
  if (staticData.componentGroups) {
    return staticData.componentGroups
      .filter(group => /* group is within containerPath */)
      .map(group => ({
        name: group.label,             // "Service Layer" not "services"
        description: `${group.classCount} classes, ${group.functionCount} functions`,
        tech: 'TypeScript',
      }));
  }
  // Fallback to existing logic for backwards compatibility
  return this.detectComponentsLegacy(staticData, containerPath);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `forgetNodesCreatedInBlock` for selective forgetting | `forgetDescendants()` per-file post-extraction | ts-morph has supported both since v5+ | Both are valid; `forgetDescendants` is simpler for this use case |
| Manual AST walking for JS | ts-morph `allowJs: true` | ts-morph has had allowJs since v1 | Eliminates need for separate Babel/Acorn parser for JS repos |
| Separate parser per language | File-structure heuristics for non-JS | This project's design decision (v1.2) | Limits scope appropriately; multi-language AST is future work (LANG-01/02/03) |

**Deprecated/outdated in the codebase:**
- Class-name-suffix matching (`endsWith('Service')`) in `getAvailableComponents()`: Valid supplement but insufficient as primary grouping — directory-based grouping supersedes it for ANLZ-03.
- Hardcoded container path map in `getContainerPath()` (`'Main Process' → 'src/main'`): Works for Reef only. Phase 13 (NAV) will generalize this — do not touch in Phase 11.

## Open Questions

1. **Significance threshold for functions**
   - What we know: The locked decision says use "export status, naming conventions, file location"
   - What's unclear: Exact cutoff — should all exports in `/services/` be significant, or only those matching additional patterns?
   - Recommendation (Claude's Discretion): Treat all exported functions in `/services/`, `/routes/`, `/api/`, `/controllers/`, `/hooks/` directories as significant. Functions in `/utils/`, `/helpers/`, `/lib/` are metadata-only regardless of export status.

2. **JSDoc as diagram descriptions (Claude's Discretion)**
   - What we know: JSDoc `getDescription()` returns the main comment text
   - What's unclear: Whether to use JSDoc `@description` tag, the leading description, or both; how to handle multiline JSDoc
   - Recommendation: Use `getDescription().trim()` as-is. If empty, use undefined (not empty string). AI enrichment (Phase 12) fills gaps.

3. **Type aliases and enums visibility (Claude's Discretion)**
   - What we know: `analysisTypes.ts` has no `TypeAliasInfo` or `EnumInfo` types
   - What's unclear: Adding them requires new extraction methods and new types — scope risk
   - Recommendation: Extract as metadata-only (names + files) appended to `exports[]`. Do not create new diagram nodes for enums/type aliases in Phase 11. Revisit in Phase 12 if AI enrichment can use them.

4. **Root-level file grouping (Claude's Discretion)**
   - What we know: Files like `main.ts`, `App.tsx` at `src/` root have no parent directory group
   - Recommendation: Group them under an "Entry Points" group in `componentGroups`. This provides a useful signal for Container-level diagram generation.

5. **Directory nesting depth (Claude's Discretion)**
   - What we know: Reef has 3-4 levels deep (e.g., `src/main/services/c4/`)
   - Recommendation: Use one level below the container directory (e.g., below `main/` or `renderer/`). For the Reef case: `src/main/services/` → "Service Layer", `src/main/services/c4/` → nests under "Service Layer". Two-level nesting as secondary grouping within a component is acceptable but adds complexity — start flat.

## Sources

### Primary (HIGH confidence)
- `/dsherret/ts-morph` (Context7) — forgetDescendants behavior, getFunctions, getDecorators, getJsDocs, getReturnType, getParameters, isAsync, isExported
- https://ts-morph.com/manipulation/performance — forgetDescendants and forgetNodesCreatedInBlock semantics verified
- https://ts-morph.com/details/decorators — getDecorators, getName, getArguments verified
- https://ts-morph.com/details/functions — getFunctions, getFunction verified
- https://ts-morph.com/details/documentation — getJsDocs, getDescription, getTags verified
- `/Users/johnrusch/Code/reef/src/main/services/c4/staticAnalyzerService.ts` — bug location confirmed at lines 160, 205, 242, 275

### Secondary (MEDIUM confidence)
- https://ts-morph.com/setup/ — allowJs and compiler options override confirmed (page confirms compilerOptions override tsconfig settings; specific allowJs example absent but API is consistent with TypeScript compiler options)
- WebSearch: ts-morph allowJs + JSX configuration — corroborated by TypeScript documentation on allowJs semantics

### Tertiary (LOW confidence)
- None — all key findings verified through Context7 or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — ts-morph 23 already installed, all APIs verified via Context7 + official docs
- Architecture: HIGH — forgetDescendants bug precisely located in source; fix pattern is textbook; type extensions follow existing patterns
- Pitfalls: HIGH for ANLZ-01 (confirmed from official docs); MEDIUM for ANLZ-04 JS handling (allowJs verified conceptually, specific ts-morph init pattern not shown in official example but consistent with API)

**Research date:** 2026-03-02
**Valid until:** 2026-05-01 (ts-morph API is stable; ts-morph 23 is current)
