---
status: diagnosed
trigger: "Component diagram drill-down throws 'requires elementId' error"
created: 2026-03-03T00:00:00Z
updated: 2026-03-03T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED - generateDiagram in VisualMapTab does not accept elementId in its options parameter, so the elementId passed by DiagramViewer is silently dropped
test: Traced full call chain
expecting: n/a
next_action: Report root cause

## Symptoms

expected: Clicking a container in the container-level diagram drills down to component level
actual: Error "Component diagram requires elementId (container name)"
errors: PlantUML generation failed: Component diagram requires elementId (container name)
reproduction: Open repo > Visual Map > Generate C4 > Click container > Click container element
started: unknown

## Eliminated

## Evidence

- timestamp: 2026-03-03T00:00:30Z
  checked: DiagramViewer.tsx handleElementClick (line 243-246)
  found: Correctly passes elementId in options to onRegenerateDiagram
  implication: Caller side is correct

- timestamp: 2026-03-03T00:00:35Z
  checked: DiagramViewerProps interface (line 46-52)
  found: onRegenerateDiagram type includes elementId?: string
  implication: Type contract expects elementId

- timestamp: 2026-03-03T00:00:40Z
  checked: VisualMapTab.tsx generateDiagram signature (line 234-239)
  found: Options type is { type?, detailLevel?, focusArea?, model? } -- NO elementId field
  implication: elementId from DiagramViewer is silently dropped by TypeScript structural typing

- timestamp: 2026-03-03T00:00:45Z
  checked: VisualMapTab.tsx generateDiagram body (line 288)
  found: Uses local state variable `elementId` (line 30) instead of options.elementId
  implication: The IPC call always sends the stale local state elementId, not the one from drill-down

- timestamp: 2026-03-03T00:00:50Z
  checked: VisualMapTab.tsx useEffect (lines 42-46)
  found: Resets local elementId to undefined when diagramType is c4-context or c4-container
  implication: When user is viewing container level, local elementId state is undefined

- timestamp: 2026-03-03T00:00:55Z
  checked: Main process diagramGeneratorService.ts (line 117)
  found: Correctly passes options.elementId to c4Analyzer.generateC4Diagram
  implication: Main process side is fine

- timestamp: 2026-03-03T00:01:00Z
  checked: c4AnalyzerService.ts generatePlantUML (line 180-181)
  found: Throws "Component diagram requires elementId" when elementId is falsy
  implication: This is where the error originates, correctly guarding against missing elementId

## Resolution

root_cause: VisualMapTab.generateDiagram (line 234-239) does not include `elementId` in its options parameter type. When DiagramViewer calls onRegenerateDiagram({...currentOptions, type: newType, elementId: elementId}), the elementId is passed but generateDiagram never reads it from options. Instead, generateDiagram uses the local React state variable `elementId` (line 30, used on line 288), which is `undefined` because the useEffect on lines 42-46 resets it to undefined when diagramType is c4-context or c4-container (the level the user is viewing before drilling down). The undefined elementId reaches c4AnalyzerService.ts line 180, which correctly throws the "Component diagram requires elementId" error.
fix:
verification:
files_changed: []
