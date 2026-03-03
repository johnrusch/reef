---
status: diagnosed
trigger: "Empty component placeholder not showing when drilling into container with no components"
created: 2026-03-03T20:00:00Z
updated: 2026-03-03T20:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - This is NOT a standalone issue. It is a consequence of the elementId blocker.
test: Full call chain traced from UI click to PlantUML generation
expecting: n/a - root cause confirmed
next_action: Return diagnosis

## Symptoms

expected: When drilling into a container with no detected components, user should see "No components found" placeholder
actual: Fails instead of showing placeholder
errors: "Component diagram requires elementId (container name)" error thrown at c4AnalyzerService.ts:181
reproduction: Drill down from container diagram into a container that has no components
started: After phase 13 implementation

## Eliminated

- hypothesis: The placeholder code is missing or incorrectly implemented
  evidence: Placeholder exists at c4PlantUMLGenerator.ts:326-328, correctly generates a Component() with "No components found" message when components array is empty
  timestamp: 2026-03-03T20:02:00Z

- hypothesis: The UI doesn't handle the generated placeholder diagram correctly
  evidence: DiagramViewer.tsx renders whatever diagram content is returned by the backend; if PlantUML with the placeholder were generated, it would be rendered normally as any other diagram
  timestamp: 2026-03-03T20:03:00Z

## Evidence

- timestamp: 2026-03-03T20:01:00Z
  checked: c4PlantUMLGenerator.ts generateComponentDiagram (lines 293-373)
  found: Placeholder code exists at lines 326-328. When components.length === 0, it generates `Component(no_content, "No components found", "TypeScript", "Check container ID mapping")`. This code is correct and would work if reached.
  implication: The placeholder implementation is fine -- the issue is upstream.

- timestamp: 2026-03-03T20:02:00Z
  checked: c4AnalyzerService.ts generatePlantUML (lines 159-202)
  found: At line 180-181, there is a guard: `if (!elementId) { throw new Error('Component diagram requires elementId (container name)'); }`. This throw happens BEFORE generateComponentDiagram is ever called (line 187).
  implication: If elementId is missing/undefined, the error is thrown and the placeholder code at line 326 of the generator is never reached.

- timestamp: 2026-03-03T20:03:00Z
  checked: DiagramViewer.tsx handleElementClick (lines 207-253)
  found: When a user clicks a container in the SVG, handleElementClick fires with the SVG element's ID. It calls onRegenerateDiagram with `elementId: elementId` (line 245). The elementId IS passed -- it comes from the SVG click handler.
  implication: When drilling down via click, elementId IS provided. The guard at line 181 should NOT throw. The issue would only manifest if elementId were somehow lost or undefined.

- timestamp: 2026-03-03T20:04:00Z
  checked: VisualMapTab.tsx generateDiagram (lines 234-373)
  found: VisualMapTab passes `elementId: elementId` (line 288) to window.reef.diagram.generate. However, the elementId state variable is managed separately (line 30). For drill-down clicks coming through DiagramViewer.handleElementClick -> onRegenerateDiagram, the elementId comes via the options parameter (line 249 of VisualMapTab). BUT VisualMapTab.generateDiagram uses its OWN elementId state (line 288), NOT the elementId from the options parameter passed by DiagramViewer.
  implication: CRITICAL BUG IDENTIFIED - VisualMapTab.generateDiagram ignores the elementId passed in the options parameter and always uses its own state variable `elementId`, which for drill-down navigation is NOT updated by handleElementClick in DiagramViewer.

- timestamp: 2026-03-03T20:04:30Z
  checked: VisualMapTab.tsx generateDiagram options handling (lines 234-290)
  found: The generateDiagram function signature is `async (options?: { type?, detailLevel?, focusArea?, model? })`. It accepts type, detailLevel, focusArea, model -- but NOT elementId. The DiagramViewer passes `elementId` in its options object (DiagramViewer.tsx line 245), but VisualMapTab's generateDiagram function never reads options.elementId. Instead it always uses the component-level `elementId` state (line 288).
  implication: The elementId from drill-down clicks is silently dropped. The state-level elementId may be undefined (for container->component transitions via click, it's never set by the click flow). This means the guard at c4AnalyzerService.ts:181 DOES fire, throwing the error, and the placeholder is never reached.

## Resolution

root_cause: |
  This is a CONSEQUENCE of the elementId blocker, not a standalone issue.

  The call chain for drill-down is:
  1. User clicks container element in SVG
  2. DiagramViewer.handleElementClick(elementId) fires (line 207)
  3. It calls onRegenerateDiagram({ ...currentOptions, type: 'c4-component', elementId: elementId }) (line 243-245)
  4. onRegenerateDiagram is bound to VisualMapTab.generateDiagram (line 477 of VisualMapTab)
  5. generateDiagram receives options with elementId, BUT its function signature only destructures type/detailLevel/focusArea/model -- NOT elementId
  6. generateDiagram uses its OWN state variable `elementId` (line 288), which was never updated by the click
  7. That state-level elementId is undefined (it's only set via the settings UI dropdowns for manual container selection)
  8. window.reef.diagram.generate is called with elementId=undefined
  9. IPC routes to diagramGeneratorService.generateDiagram -> c4Analyzer.generateC4Diagram(path, 'component', undefined)
  10. c4AnalyzerService.generatePlantUML hits the guard: `if (!elementId) throw new Error('Component diagram requires elementId')`
  11. Error is caught and returned as { success: false, error: "..." }
  12. The placeholder code in generateComponentDiagram (line 326) is NEVER reached

  The fix requires VisualMapTab.generateDiagram to accept and use the elementId from the options parameter, falling back to its state variable. This is the same elementId blocker issue -- once elementId is properly threaded through, the placeholder would be reached for containers with no detected components.

fix:
verification:
files_changed: []
