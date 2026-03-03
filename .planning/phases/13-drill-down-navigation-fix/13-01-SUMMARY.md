---
phase: 13-drill-down-navigation-fix
plan: 01
subsystem: c4-diagram-generation
tags: [typescript, plantuml, element-registry, sanitize-id, container-path]

# Dependency graph
requires:
  - phase: 12-ai-enrichment-pipeline
    provides: C4PlantUMLGenerator with enrichment data consumption
provides:
  - ElementIdRegistry with register/lookup/clear API
  - shared sanitizeId exported from elementIdRegistry.ts (single source of truth)
  - deriveContainerPath dynamically resolving container names to filesystem paths
  - generateContainerDiagram populates registry during generation
  - generateComponentDiagram uses registry-provided or derived containerPath
affects:
  - 13-drill-down-navigation-fix (13-02 wires IPC handler to use registry)
  - 14-performance (reads from the same registry/generator changes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ElementIdRegistry singleton pattern: callers control lifecycle, pass registry to diagram generator
    - sanitizeId single source of truth: defined in elementIdRegistry.ts, re-exported by changeTrackingService
    - deriveContainerPath fuzzy matching: entryPoints -> classes -> componentGroups -> lowercase fallback

key-files:
  created:
    - src/main/services/c4/elementIdRegistry.ts
    - tests/unit/main/services/elementIdRegistry.test.ts
  modified:
    - src/main/services/c4/c4PlantUMLGenerator.ts
    - src/main/services/changeTrackingService.ts
    - tests/unit/main/c4PlantUMLGenerator.enrichment.test.ts

key-decisions:
  - "sanitizeId defined once in elementIdRegistry.ts; both c4PlantUMLGenerator and changeTrackingService import from it"
  - "ElementIdRegistry is a plain class (not singleton) — callers control lifecycle and pass it to generators"
  - "deriveContainerPath uses fuzzy matching on entryPoints->classes->groups with lowercase fallback so it never returns empty"
  - "generateComponentDiagram adds 'No components found' placeholder when components array is empty to avoid blank boundary box"
  - "changeTrackingService re-exports sanitizeId from elementIdRegistry to preserve the existing public API"

patterns-established:
  - "Pattern 1: Pass optional registry to diagram generator so population is opt-in (backward-compatible)"
  - "Pattern 2: containerPath is optional parameter in generateComponentDiagram, falls back to deriveContainerPath"

requirements-completed: [NAV-01, NAV-02, NAV-03]

# Metrics
duration: 6min
completed: 2026-03-03
---

# Phase 13 Plan 01: ElementIdRegistry + Consolidated sanitizeId Summary

**ElementIdRegistry maps sanitized SVG IDs to filesystem paths so container drill-down can locate components dynamically, replacing the hardcoded Electron-only path map**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-03T19:40:54Z
- **Completed:** 2026-03-03T19:47:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `ElementIdRegistry` with `register/getContainerPath/getHumanName/clear` API
- Exported `sanitizeId` as the single source of truth (was duplicated in generator and changeTrackingService)
- Implemented `deriveContainerPath` with fuzzy matching on entryPoints, class file paths, componentGroups, and lowercase fallback — works for any repo structure, not just Electron
- Wired registry into `generateContainerDiagram` (optional param, populates on generation)
- Wired `deriveContainerPath` into `generateComponentDiagram` (replaces hardcoded map)
- Added empty-component placeholder so users see "No components found" instead of blank diagram

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ElementIdRegistry with shared sanitizeId and deriveContainerPath** - `1c90e8f` (feat)
2. **Task 2: Wire registry into generator and consolidate sanitizeId imports** - `08c5db0` (feat)

_Note: Task 1 used TDD (RED phase confirmed tests fail, GREEN phase created implementation)_

## Files Created/Modified

- `src/main/services/c4/elementIdRegistry.ts` - New module: sanitizeId, RegistryEntry, ElementIdRegistry, deriveContainerPath
- `tests/unit/main/services/elementIdRegistry.test.ts` - 11 unit tests covering all behavior cases
- `src/main/services/c4/c4PlantUMLGenerator.ts` - Removed private sanitizeId/getContainerPath; imports from registry; registry wired into generators
- `src/main/services/changeTrackingService.ts` - Replaced local sanitizeId function with re-export from elementIdRegistry
- `tests/unit/main/c4PlantUMLGenerator.enrichment.test.ts` - 3 new tests: registry population, explicit containerPath, empty placeholder

## Decisions Made

- `sanitizeId` defined once in `elementIdRegistry.ts` — both `c4PlantUMLGenerator` and `changeTrackingService` import from it. The duplicate in changeTrackingService was replaced with a re-export to preserve the public API.
- `ElementIdRegistry` is a plain class (not singleton) — callers control lifecycle and pass the instance to diagram generators. This is opt-in and backward-compatible.
- `deriveContainerPath` uses sequential fuzzy matching (entryPoints → classes → componentGroups → lowercase fallback) so it never returns an empty string and works for non-Electron repos.
- Added `No components found` placeholder in `generateComponentDiagram` to give users visual feedback when container path resolution yields no components.

## Deviations from Plan

**1. [Rule 1 - Bug] sanitizeId re-export needed additional import in changeTrackingService**
- **Found during:** Task 2 (changeTrackingService update)
- **Issue:** The `mapFilesToElements` method inside `ChangeTrackingService` called `sanitizeId()` directly. After replacing the local definition with a re-export, the internal usage had no binding — `sanitizeId is not defined` at runtime.
- **Fix:** Added `import { sanitizeId } from './c4/elementIdRegistry'` alongside the `export { sanitizeId }` re-export statement.
- **Files modified:** `src/main/services/changeTrackingService.ts`
- **Verification:** All 18 changeTrackingService tests pass
- **Committed in:** `08c5db0` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: missing internal import alongside re-export)
**Impact on plan:** The fix was a one-line addition necessary for correctness. No scope creep.

## Issues Encountered

None beyond the deviation documented above.

## Next Phase Readiness

- Registry and path resolution infrastructure is complete
- 13-02 can now wire the IPC drill-down handler to call `generateContainerDiagram` with a registry, then look up container paths from the registry when handling component diagram requests
- No blockers

## Self-Check: PASSED

- FOUND: src/main/services/c4/elementIdRegistry.ts
- FOUND: tests/unit/main/services/elementIdRegistry.test.ts
- FOUND: .planning/phases/13-drill-down-navigation-fix/13-01-SUMMARY.md
- FOUND: commit 1c90e8f (Task 1)
- FOUND: commit 08c5db0 (Task 2)

---
*Phase: 13-drill-down-navigation-fix*
*Completed: 2026-03-03*
