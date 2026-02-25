---
status: investigating
trigger: "DiagramStateBadge always shows 'Up to date' regardless of actual state"
created: 2025-02-25T10:30:00Z
updated: 2025-02-25T11:00:00Z
---

## Current Focus

hypothesis: CONFIRMED ROOT CAUSE - The diagram generation flow (C4AnalyzerService -> C4CacheService) never updates the c4Storage state. After successful generation, state remains 'never_generated' (no entry) or stays stuck at 'generating'. The badge shows 'Up to date' only if migration ran, otherwise no badge appears at all.
test: Trace all state transitions and verify no code sets 'fresh' after generation
expecting: No code path sets state to 'fresh' after diagram generation
next_action: Document root cause and required fix

## Symptoms

expected: DiagramStateBadge should show different icons based on diagram state (fresh=green check, stale=amber clock, generating=spinner, error=red, never_generated=no badge)
actual: Always shows "Up to date" (green check = fresh state) OR no badge at all depending on migration state
errors: None observed
reproduction: Open any repository, view diagram panel - badge behavior is inconsistent
started: Initial implementation (never worked correctly)

## Eliminated

- hypothesis: Conditional rendering logic in DiagramPanel is wrong
  evidence: The conditional `{diagramState && onRegenerateFromBadge && ...}` correctly renders badge for all non-falsy states
  timestamp: 2025-02-25T10:50:00Z

## Evidence

- timestamp: 2025-02-25T10:30:00Z
  checked: DiagramViewer.tsx state loading (lines 244-251)
  found: useEffect loads states from backend on repo change via `window.reef.c4Storage.getRepoStates(repoPath).then(states => loadStatesFromBackend(states))`
  implication: State loading mechanism exists, need to verify backend returns data

- timestamp: 2025-02-25T10:31:00Z
  checked: diagramStateStore.ts getState method (lines 50-54)
  found: Returns `entry?.state || 'never_generated'` - defaults to never_generated if no entry exists
  implication: If no states in store, should default to never_generated, not fresh

- timestamp: 2025-02-25T10:32:00Z
  checked: DiagramPanel.tsx conditional rendering (lines 96-104)
  found: `{diagramState && onRegenerateFromBadge && ( <DiagramStateBadge ... /> )}` - requires BOTH to be truthy
  implication: Badge will render as long as diagramState is truthy (any valid state string including 'never_generated')

- timestamp: 2025-02-25T10:33:00Z
  checked: DiagramViewer.tsx currentState derivation (lines 88-91)
  found: `const currentState = getState(_repository?.path || '', currentLevel, currentElementId);`
  implication: Uses getState which defaults to 'never_generated' if no entry

- timestamp: 2025-02-25T10:34:00Z
  checked: DiagramStateBadge.tsx rendering (lines 29-77)
  found: For 'never_generated' state, returns null (no badge shown)
  implication: If state is never_generated, badge div renders but component returns null

- timestamp: 2025-02-25T10:35:00Z
  checked: c4StorageHandlers.ts getRepoStates (lines 75-84)
  found: Returns array of state entries mapped from getAllDiagramsForRepo - only returns entries that EXIST in database
  implication: For new repos with no diagrams, returns empty array, store loads empty, getState defaults to 'never_generated'

- timestamp: 2025-02-25T10:40:00Z
  checked: C4AnalyzerService.ts generateC4Diagram (lines 43-130)
  found: Uses C4CacheService (old TTL-based cache) at line 104 `await this.cache.setCachedDiagram()`, NOT the new C4StorageService
  implication: Diagram generation stores to OLD cache, never updates NEW storage system with state

- timestamp: 2025-02-25T10:41:00Z
  checked: DiagramViewer.tsx handleRegenerate (lines 97-123)
  found: Calls `window.reef.c4Storage.updateState(repoPath, level, 'generating')` BEFORE generation, but comment at line 112-113 explicitly says "The diagram generation service should update state to 'fresh' after successful generation" - IT DOESN'T
  implication: State transitions to 'generating' but NEVER transitions to 'fresh' after success

- timestamp: 2025-02-25T10:42:00Z
  checked: VisualMapTab.tsx generateDiagram (lines 169-268)
  found: Calls `window.reef.diagram.generate()` but NEVER updates c4Storage state - this is the MAIN entry point for generation
  implication: VisualMapTab bypasses all state management

- timestamp: 2025-02-25T10:45:00Z
  checked: c4StorageService.ts schema (line 128)
  found: `state TEXT NOT NULL DEFAULT 'fresh'` - database schema defaults to 'fresh'
  implication: If migration runs and stores diagrams, they get 'fresh' state by default

- timestamp: 2025-02-25T10:55:00Z
  checked: VisualMapTab.tsx rendering logic (lines 359-374)
  found: DiagramViewer only renders when `viewMode === 'diagram' && diagram && metadata` - so DiagramViewer never renders without a diagram
  implication: GeneratePromptCard can NEVER show because DiagramViewer is only rendered when diagram already exists

- timestamp: 2025-02-25T10:57:00Z
  checked: Complete state flow
  found: VisualMapTab generates diagram -> stores in C4CacheService (old) -> sets local state diagram -> switches viewMode to 'diagram' -> renders DiagramViewer with diagram prop
  implication: No state is ever written to c4StorageService (new) during generation from VisualMapTab

## Resolution

root_cause: MULTIPLE RELATED ISSUES:

1. **State never transitions to 'fresh' after successful generation:**
   - handleRegenerate in DiagramViewer.tsx sets 'generating' before calling onRegenerateDiagram
   - But NOTHING sets 'fresh' after successful completion
   - The comment at line 112-113 explicitly acknowledges this gap
   - Fix: Add `await window.reef.c4Storage.updateState(repoPath, level, 'fresh', elementId)` after successful generation

2. **VisualMapTab bypasses state management entirely:**
   - Main entry point VisualMapTab.generateDiagram() never touches c4Storage
   - It stores diagrams in local component state, not persistent storage
   - Fix: VisualMapTab should update c4Storage state during generation lifecycle

3. **GeneratePromptCard can never display:**
   - DiagramViewer only renders when diagram prop exists
   - GeneratePromptCard condition requires `currentState === 'never_generated' && !diagram`
   - But DiagramViewer is never called without a diagram
   - Fix: Either show GeneratePromptCard in VisualMapTab for never_generated state, or restructure the component hierarchy

4. **Two parallel storage systems:**
   - C4CacheService (old v1.0) - used by C4AnalyzerService for diagram storage
   - C4StorageService (new v1.1) - used by UI for state tracking
   - These are not connected - generation stores to old, UI reads from new
   - Fix: C4AnalyzerService should store diagrams in C4StorageService (not C4CacheService)

fix:
verification:
files_changed: []
