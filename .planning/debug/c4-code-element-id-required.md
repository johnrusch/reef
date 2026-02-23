---
status: diagnosed
trigger: "Investigate why C4 Code diagram generation fails with 'requires elementId (component name)' error."
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:01:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Code and Component diagrams require elementId parameter, but UI doesn't provide it
test: examined full flow from UI → IPC → Service → Generator
expecting: root cause found and documented
next_action: return diagnosis

## Symptoms

expected: Generate a C4 Code diagram showing class details with methods, properties, inheritance, and relationships
actual: VisualMapTab.tsx:189 Diagram generation error: Error: PlantUML generation failed: Code diagram requires elementId (component name)
errors: "Code diagram requires elementId (component name)"
reproduction: Click on "Code" C4 level button in Visual Map tab and click "Generate Diagram"
started: Current issue in UAT Test 4

## Eliminated

## Evidence

- timestamp: 2026-02-23T00:00:01Z
  checked: c4AnalyzerService.ts generatePlantUML method
  found: Line 153-155 throws error "Code diagram requires elementId (component name)" when elementId is undefined for 'code' level
  implication: validation exists and requires elementId parameter for code diagrams

- timestamp: 2026-02-23T00:00:02Z
  checked: c4PlantUMLGenerator.ts generateCodeDiagram method
  found: Method signature accepts componentId parameter (line 211), uses it to filter classes by file name matching (line 224-226)
  implication: Code diagram needs to know which component to generate code-level details for

- timestamp: 2026-02-23T00:00:03Z
  checked: VisualMapTab.tsx generateDiagram function
  found: Line 131-135 calls window.reef.diagram.generate with type and detailLevel, but no elementId parameter
  implication: UI never provides elementId when generating C4 diagrams

- timestamp: 2026-02-23T00:00:04Z
  checked: DiagramOptions type definition
  found: src/shared/types/diagram.ts line 9 defines elementId as optional parameter with comment "Element ID for drill-down navigation"
  implication: The type system supports elementId, but the UI doesn't utilize it

- timestamp: 2026-02-23T00:00:05Z
  checked: diagramGeneratorService.ts generateDiagram method
  found: Line 117 passes options.elementId to c4Analyzer.generateC4Diagram for C4 diagrams
  implication: IPC layer correctly forwards elementId when provided

- timestamp: 2026-02-23T00:00:06Z
  checked: c4AnalyzerService.ts validation logic
  found: Lines 148-150 validate elementId for 'component' level (requires container name). Lines 153-155 validate elementId for 'code' level (requires component name)
  implication: Both Component and Code levels require elementId, not just Code level

- timestamp: 2026-02-23T00:00:07Z
  checked: Container detection logic
  found: c4PlantUMLGenerator.ts detectContainers() returns: "Main Process", "Renderer Process", "Preload Script", "Config Store"
  implication: These are the valid elementId values for Component diagrams

- timestamp: 2026-02-23T00:00:08Z
  checked: Component detection logic
  found: c4PlantUMLGenerator.ts detectComponents() groups classes by directory (e.g., "Services", "Stores", "Components") within a container path
  implication: Components are dynamically discovered based on directory structure. UI would need to fetch available containers first, then fetch components for selected container

## Resolution

root_cause: C4 Component and Code diagrams require elementId to specify which container/component to drill into, but the UI (VisualMapTab.tsx) has no mechanism to collect or provide this parameter. The UI only passes type, detailLevel, and focusArea in the options object, never elementId. This is not just a Code diagram issue - Component diagrams (UAT Test 3) also require elementId.

The architectural design expects a drill-down workflow:
1. Context diagram (system level) - no elementId needed ✓ works
2. Container diagram (deployable units) - no elementId needed ✓ works
3. Component diagram - requires elementId to specify which container to drill into ✗ missing
4. Code diagram - requires elementId to specify which component to show class details for ✗ missing

The UI is missing the selection mechanism for steps 3 and 4. The fix requires:
1. Add UI controls to select container when c4-component is chosen
2. Add UI controls to select component when c4-code is chosen (after selecting container)
3. Fetch available options from backend (containers are static, components depend on container selection)
4. Pass elementId in the options object when generating these diagram types

fix: UI enhancement needed - add container/component selector controls that populate elementId parameter
verification: N/A (diagnosis only mode)
files_changed: []
