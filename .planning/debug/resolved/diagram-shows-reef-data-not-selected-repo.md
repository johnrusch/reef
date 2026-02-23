---
status: resolved
trigger: "Continue debugging wrong-repo-containers-components. The UI selection fix was applied but diagram generation still uses Reef instead of the selected repository."
created: 2026-02-23T08:00:00Z
updated: 2026-02-23T08:30:00Z
---

## Current Focus

hypothesis: Fix implemented - dynamic project names and relationships
test: Build TypeScript and test with the application
expecting: Diagrams should now show the selected repository's name and data
next_action: Clear cache and test diagram generation with different repositories

## Symptoms

expected: When little-bit repository is selected, the generated diagram should show "Container Diagram for little-bit" with little-bit's architecture
actual: The generated diagram shows "Container Diagram for Reef" with Reef's system, Developer person, mainProcess, and File System components - completely ignoring the selected repository
errors: None - just shows wrong data
reproduction: 1. Select "little-bit" repository from sidebar (visible in header). 2. Go to Visual Map tab. 3. Select a diagram level and click "Generate Diagram". 4. Diagram shows Reef's architecture instead of little-bit's.
started: After the previous fix that added dynamic container/component selection - the UI dropdowns now work, but the diagram content is still Reef's data

## Eliminated

## Evidence

- timestamp: 2026-02-23T08:05:00Z
  checked: VisualMapTab.tsx line 204
  found: repository.path is correctly passed to window.reef.diagram.generate()
  implication: The frontend is passing the correct repository path

- timestamp: 2026-02-23T08:06:00Z
  checked: diagramGeneratorService.ts line 298, line 117
  found: IPC handler receives context (repo path) and passes to c4Analyzer.generateC4Diagram(contextOrPath, level, options.elementId)
  implication: The IPC layer is correctly forwarding the repository path

- timestamp: 2026-02-23T08:07:00Z
  checked: c4AnalyzerService.ts line 68
  found: const staticData = await this.staticAnalyzer.analyzeProject(repoPath) - uses the correct repoPath
  implication: Static analysis is performed on the correct repository

- timestamp: 2026-02-23T08:10:00Z
  checked: c4PlantUMLGenerator.ts lines 29, 81, 85, 89, 122-131
  found: Multiple hardcoded "Reef" references in PlantUML generation:
    - Line 29: 'title System Context Diagram for Reef'
    - Line 81: 'title Container Diagram for Reef'
    - Line 85: Person(user, "Developer", "Uses Reef to manage repositories")
    - Line 89: System_Boundary(reef, "Reef") {
    - Lines 122-131: Hardcoded Reef-specific relationships (mainProcess, rendererProcess, etc.)
  implication: The PlantUML generator is hardcoded to generate diagrams for Reef regardless of which repository's staticData it receives

## Resolution

root_cause: The c4PlantUMLGenerator.ts file has hardcoded "Reef" references throughout the diagram generation methods. Specifically:
1. Context diagram (line 29): "System Context Diagram for Reef"
2. Container diagram (line 81): "Container Diagram for Reef"
3. Person actor (line 85): "Uses Reef to manage repositories"
4. System boundary (line 89): System_Boundary(reef, "Reef")
5. Container relationships (lines 122-131): Hardcoded Reef-specific component names and relationships

The static analysis correctly analyzes the selected repository, but the PlantUML generator ignores this data and hardcodes Reef's information.

fix:
1. Added projectName to AnalysisResult metadata interface (analysisTypes.ts)
2. Added getProjectName() method to staticAnalyzerService that extracts name from package.json (with fallback to directory name)
3. Updated generateContextDiagram() to use dynamic projectName:
   - Title uses projectName
   - System ID uses sanitized projectName
   - Generic "User" actor instead of "Developer using Reef"
4. Updated generateContainerDiagram() to use dynamic projectName and relationships:
   - Title uses projectName
   - System boundary uses projectName
   - Generic "User" actor
   - Dynamic container relationships based on detected containers and technologies
   - Checks for Electron app and adds appropriate IPC relationships
   - Falls back to basic sequential relationships for non-Electron apps
5. Component and Code diagrams already used elementId dynamically, so no changes needed

verification:
1. TypeScript compilation successful (npm run build:main) ✅
2. All type errors resolved ✅
3. Need to clear C4 cache if app was previously run:
   - Cache location: ~/Library/Application Support/Reef/c4-cache.db
   - Can delete manually or app will auto-expire old cache entries
4. Test plan:
   - Start app with npm run dev
   - Select little-bit repository
   - Generate Context diagram
   - Verify title shows "System Context Diagram for little-bit"
   - Verify system shows "little-bit" not "Reef"
   - Generate Container diagram
   - Verify title shows "Container Diagram for little-bit"
   - Verify system boundary shows "little-bit" not "Reef"
files_changed:
  - src/main/services/c4/types/analysisTypes.ts
  - src/main/services/c4/staticAnalyzerService.ts
  - src/main/services/c4/c4PlantUMLGenerator.ts
