---
phase: 23-code-level-diagram-quality
plan: 02
subsystem: plantuml-generation
tags: [c4-code-diagram, plantuml, tdd, directory-matching, stereotypes, enums, functions, react-components]
dependency_graph:
  requires: [ParameterInfo, EnumInfo, ProjectStructure.enums, FunctionInfo.parameters]
  provides: [generateCodeDiagram-rewritten, <<function>>-stereotype, <<component>>-stereotype, <<enumeration>>-stereotype]
  affects: [c4PlantUMLGenerator.generateCodeDiagram, c4PlantUMLGenerator.extractUsageRelationships]
tech_stack:
  added: []
  patterns: [TDD RED-GREEN, PlantUML stereotyped classes, directory-prefix matching, exported-only filter]
key_files:
  created:
    - tests/unit/main/c4PlantUMLGenerator.codeDiagram.test.ts
  modified:
    - src/main/services/c4/c4PlantUMLGenerator.ts
decisions:
  - isReactComponent detects JSX.Element/ReactElement/React.FC/ReactNode return types with capital-letter name
  - extractUsageRelationships accepts unified elements array instead of separate classes/interfaces params
  - Legacy fallback in isInComponent uses case-insensitive filename check + element-name exact match for backwards compatibility with tests that pass componentId as class name
  - groupDirPrefix computed from first file in componentGroup for D-05 recursive subdirectory inclusion
  - Empty fallback renders PlantUML note with file count breakdown before @enduml
metrics:
  duration: 20min
  completed: "2026-03-31"
  tasks_completed: 1
  files_changed: 2
---

# Phase 23 Plan 02: generateCodeDiagram Rewrite Summary

**One-liner:** Rewrote generateCodeDiagram to render exported functions as <<function>>, React components as <<component>>, enums as <<enumeration>>, matched to parent component by directory path, with empty-component fallback note.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for code diagram rewrite | db7abda | tests/unit/main/c4PlantUMLGenerator.codeDiagram.test.ts |
| 1 (GREEN) | Rewrite generateCodeDiagram and extractUsageRelationships | 2e6363e | src/main/services/c4/c4PlantUMLGenerator.ts |

## What Was Built

### generateCodeDiagram (c4PlantUMLGenerator.ts)

Full rewrite of the method body (lines 384-466 replaced with ~150 lines). Key changes:

**D-04/D-05: Directory-based matching**
- Resolves `componentId` to a `ComponentGroup` via `staticData.componentGroups?.find(g => g.rawName === componentId || g.label === componentId)`
- Builds `groupFiles` Set from matched group's files array
- Computes `groupDirPrefix` from first file's directory path for recursive subdirectory inclusion
- `isInComponent(filePath, elementName?)` checks group membership, prefix match, case-insensitive filename, and element-name exact match (legacy fallback)

**D-06: Exported-only filter**
- `classes = structure.classes.filter(c => c.isExported && isInComponent(c.file, c.name))`
- Same pattern for interfaces, functions, enums

**D-02: React component detection**
- `isReactComponent(func)`: capital first letter AND return type contains JSX.Element/ReactElement/React.FC/ReactNode
- Split functions into `reactComponents` and `regularFunctions`

**D-08: Empty fallback**
- If all four arrays empty: renders `note "No diagrammable code elements found.\nN files: X type files, Y config files, Z other files" as N1`

**Rendering (D-01, D-02, D-03)**
- Regular functions: `class FuncName <<function>> { +param: type .. +returns: returnType }`
- React components: `class CompName <<component>> { +param: type }`
- Enums: `class EnumName <<enumeration>> { MEMBER_A MEMBER_B }`
- Classes: unchanged (abstractPrefix + properties + methods)
- Interfaces: unchanged (property name: type with optional marker)

### extractUsageRelationships (c4PlantUMLGenerator.ts)

Updated private method signature from `(staticData, classes, interfaces)` to `(staticData, elements)` where `elements` is a unified `readonly { name: string; file: string }[]`. Body updated to iterate over all elements and check against `allNames` Set. Call site updated to pass combined array of classes + functions + React components + enums + interfaces.

### Test File (c4PlantUMLGenerator.codeDiagram.test.ts)

9 tests covering all D-01 through D-08 requirements plus signature compatibility:
- `makeStaticData` helper with classes, functions (regular + React component), enums (exported + non-exported), componentGroups, and a subdirectory function for D-05
- All tests pass in 3ms

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added case-insensitive filename matching and element-name fallback in isInComponent**
- **Found during:** Task 1 GREEN phase verification
- **Issue:** Enrichment test's "Test 8" passes `componentId = 'GitService'` with class file `gitService.ts` — original `isInComponent` used case-sensitive `includes()` which missed the match
- **Fix:** Made filename check case-insensitive with `.toLowerCase()`. Added `elementName === componentId` exact-match fallback so direct class-name lookup still works
- **Files modified:** src/main/services/c4/c4PlantUMLGenerator.ts
- **Commit:** 2e6363e (included in implementation commit)

## Verification Results

- `npx tsc --noEmit` exits 0 — no TypeScript errors
- `npm run test:unit -- --run c4PlantUMLGenerator.codeDiagram` — 9/9 tests pass
- `npm run test:unit -- --run c4PlantUMLGenerator.enrichment` — 13/13 tests pass (no regression)
- `npm run test:unit -- --run staticAnalyzerService.codeElements` — 8/8 tests pass (Plan 01 no regression)

## Known Stubs

None — all rendering paths are fully implemented and tested.

## Self-Check: PASSED

- [x] `src/main/services/c4/c4PlantUMLGenerator.ts` — contains `staticData.componentGroups?.find`, `<<function>>`, `<<component>>`, `<<enumeration>>`, `isReactComponent`, `No diagrammable code elements found`, `c.isExported`, `filePath.startsWith(groupDirPrefix)`, `elements` param in extractUsageRelationships
- [x] `tests/unit/main/c4PlantUMLGenerator.codeDiagram.test.ts` — exists with 9 passing tests
- [x] Commits db7abda (RED) and 2e6363e (GREEN) exist
