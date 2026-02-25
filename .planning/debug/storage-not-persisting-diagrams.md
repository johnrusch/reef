---
status: diagnosed
trigger: "Storage Not Persisting Diagrams - diagrams show 0 count, Clear All greyed out"
created: 2025-02-25T12:00:00Z
updated: 2025-02-25T12:30:00Z
---

## Current Focus

hypothesis: Diagram generation NEVER calls c4StorageService.storeDiagram() - only uses old cacheService
test: Traced code path from renderer -> main process
expecting: Should call window.reef.c4Storage.storeDiagram() after generation
next_action: Root cause confirmed - need to integrate c4Storage into generation flow

## Symptoms

expected: Diagrams should persist in SQLite database, Settings should show diagram count, Clear All should be enabled
actual: Storage always shows 0 diagrams, Clear All stays greyed out, diagrams disappear on tab navigation
errors: None reported
reproduction: Generate any diagram, check Settings tab storage section
started: Since new storage system was implemented (v1.1)

## Eliminated

(none - root cause found on first investigation)

## Evidence

- timestamp: 2025-02-25T12:05:00Z
  checked: VisualMapTab.tsx generateDiagram() function
  found: Calls window.reef.diagram.generate() but NEVER calls window.reef.c4Storage.storeDiagram()
  implication: Diagrams are generated but never stored in the new c4StorageService

- timestamp: 2025-02-25T12:10:00Z
  checked: diagramGeneratorService.ts generateDiagram()
  found: For C4 diagrams, delegates to C4AnalyzerService.generateC4Diagram()
  implication: Need to check if C4AnalyzerService stores to the new system

- timestamp: 2025-02-25T12:15:00Z
  checked: c4AnalyzerService.ts generateC4Diagram()
  found: Uses OLD C4CacheService (c4-cache.db), NOT the new C4StorageService (diagram_storage.db)
  implication: Two separate storage systems exist, new one never written to

- timestamp: 2025-02-25T12:18:00Z
  checked: diagramGeneratorServiceV2.ts (line 244)
  found: Uses cacheService.storeDiagram() - the OLD caching system, not c4Storage
  implication: Even non-C4 diagrams use old system

- timestamp: 2025-02-25T12:20:00Z
  checked: c4StorageHandlers.ts (c4-storage:store-diagram handler)
  found: Handler exists and works correctly, but NOBODY CALLS IT
  implication: The IPC bridge is complete, but the generation services don't use it

- timestamp: 2025-02-25T12:25:00Z
  checked: preload.ts c4Storage.storeDiagram()
  found: IPC bridge is properly implemented
  implication: Renderer CAN call window.reef.c4Storage.storeDiagram(), just doesn't

## Resolution

root_cause: |
  There is a **complete disconnect between diagram generation and the new storage system**.

  The codebase has TWO storage systems:
  1. **OLD**: C4CacheService (c4-cache.db) - TTL-based cache, used by C4AnalyzerService
  2. **NEW**: C4StorageService (diagram_storage.db) - Persistent storage with states

  The generation flow:
  - VisualMapTab.generateDiagram() -> window.reef.diagram.generate()
  - diagramGeneratorService.generateDiagram() -> C4AnalyzerService.generateC4Diagram()
  - C4AnalyzerService stores to OLD C4CacheService (line 104)

  **NOBODY ever calls:**
  - window.reef.c4Storage.storeDiagram() from renderer
  - C4StorageService.storeDiagram() from main process

  The new storage system is completely wired up but disconnected from the generation pipeline.

fix: |
  OPTION A (Renderer-side): After successful generation in VisualMapTab.tsx:
  ```typescript
  if (result.success && result.diagram) {
    // Store in new persistent storage
    await window.reef.c4Storage.storeDiagram({
      repoPath: repository.path,
      level: finalOptions.type.replace('c4-', ''),
      diagramContent: result.diagram,
      diagramMetadata: JSON.stringify(newMetadata),
      state: 'fresh',
      modelUsed: finalOptions.model,
      promptVersion: '1.0.0',
      tokensUsed: result.tokensUsed?.input + result.tokensUsed?.output,
      generationCost: estimatedCost,
    });
  }
  ```

  OPTION B (Main-side): Modify C4AnalyzerService to use C4StorageService instead of C4CacheService

  Recommendation: OPTION B is cleaner - keep storage logic in main process

verification: (not yet verified)
files_changed: []
