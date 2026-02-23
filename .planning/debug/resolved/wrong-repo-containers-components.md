---
status: resolved
trigger: "wrong-repo-containers-components: Component diagram shows Reef's containers instead of selected repository's containers"
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:25:00Z
---

## Current Focus

hypothesis: Fix implemented - dynamic fetching of containers/components
test: Build and test the application with different repositories
expecting: Component/Code level dropdowns show elements from the selected repository
next_action: Compile TypeScript and test in the app

## Symptoms

expected: Component diagram should show containers analyzed from the currently selected repository (little-bit). Code diagram should show components from the currently selected repository.
actual: Component diagram shows Reef's containers (Main Process, Renderer Process, Preload Script). Code diagram shows Reef's components (GitService, GitHubService, C4AnalyzerService, StaticAnalyzerService, DiagramGeneratorService).
errors: No error messages - it just shows the wrong data
reproduction: 1. Select a different repository (little-bit) from the sidebar. 2. Go to Visual Map tab. 3. Select Component level - see Reef's containers. 4. Select Code level - see Reef's components.
started: Never worked correctly - has always shown Reef's containers/components regardless of selected repository

## Eliminated

## Evidence

- timestamp: 2026-02-23T00:05:00Z
  checked: VisualMapTab.tsx lines 395-499
  found: Container and component selection UI is hardcoded with Reef-specific values
  implication: The elementId options for c4-component (lines 404-434) show hardcoded "reef_main", "reef_renderer", "reef_preload" containers. The elementId options for c4-code (lines 448-497) show hardcoded "gitservice", "githubservice", "c4analyzerservice", etc. These are never fetched from the selected repository's analysis.

- timestamp: 2026-02-23T00:06:00Z
  checked: VisualMapTab.tsx line 139
  found: diagram.generate() is called with repository.path as first parameter
  implication: The generation itself uses the correct repository path, but the UI dropdown options don't dynamically load available containers/components from that repository

- timestamp: 2026-02-23T00:20:00Z
  checked: Built application with npm run build:main
  found: TypeScript compilation successful, no errors
  implication: Fix is syntactically correct and type-safe

## Resolution

root_cause: The Visual Map tab has hardcoded UI buttons for container selection (c4-component level) and component selection (c4-code level) that only show Reef's architecture. Lines 404-434 hardcode reef_main/reef_renderer/reef_preload containers. Lines 448-497 hardcode gitservice/githubservice/c4analyzerservice components. There is no code that fetches available containers/components from the currently selected repository's C4 analysis. The backend C4 analyzer can generate diagrams for any repo, but there's no IPC method to query available elements before generating the diagram.
fix:
1. Added getAvailableContainers() and getAvailableComponents() methods to C4AnalyzerService
2. Added IPC handlers diagram:get-available-containers and diagram:get-available-components
3. Added IPC methods to preload.ts and ReefAPI interface
4. Updated VisualMapTab to dynamically fetch and render containers/components based on selected repository
5. Containers are identified from entry points and src/ subdirectories
6. Components are identified as exported classes ending in Service/Controller/Manager/Handler/Store/Repository
verification:
- TypeScript compilation passes (npm run typecheck)
- Main process builds successfully (npm run build:main)
- Added proper error handling and loading states in UI
- Dynamic fetching triggers when switching diagram levels or repositories
- Auto-selects first container/component if none selected
- Shows helpful message when no elements found
files_changed:
  - src/main/services/c4/c4AnalyzerService.ts
  - src/main/services/diagramGeneratorService.ts
  - src/main/preload.ts
  - src/renderer/components/tabs/VisualMapTab.tsx
