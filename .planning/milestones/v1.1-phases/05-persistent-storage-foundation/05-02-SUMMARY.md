---
phase: 05-persistent-storage-foundation
plan: 02
subsystem: frontend-state-management
tags: [zustand, state-machine, ui-components, diagram-state]
dependency_graph:
  requires:
    - shared/types/diagramState.ts (type definitions)
    - main/services/c4/types/c4Types.ts (C4Level type)
  provides:
    - renderer/stores/diagramStateStore.ts (state machine)
    - renderer/components/DiagramViewer/DiagramStateBadge.tsx (state badge UI)
    - renderer/components/DiagramViewer/GeneratePromptCard.tsx (never-generated prompt UI)
  affects:
    - DiagramViewer component (will integrate these components)
tech_stack:
  added:
    - Zustand store with devtools middleware for diagram state management
  patterns:
    - State machine pattern with TypeScript enums
    - Map-based storage with normalized path keys
    - Component delegation (badge vs prompt card based on state)
key_files:
  created:
    - src/renderer/stores/diagramStateStore.ts
    - src/renderer/components/DiagramViewer/DiagramStateBadge.tsx
    - src/renderer/components/DiagramViewer/GeneratePromptCard.tsx
  modified: []
decisions:
  - User-friendly error messages only (technical details in tooltips)
  - Blue accent for never-generated state (inviting, not error-like)
  - Path normalization to forward slashes for cross-platform consistency
  - State badges are clickable for stale/error states to trigger regeneration
metrics:
  duration: "2m 46s"
  completed_at: "2026-02-24"
  tasks_completed: 3
  files_created: 3
  commits: 3
requirements:
  - STOR-04
---

# Phase 05 Plan 02: Frontend State Management and UI Summary

**One-liner:** Zustand state machine with badge components (Check/Clock/Loader2/AlertCircle) for diagram lifecycle visualization

## What Was Built

Created the frontend state management layer for diagram lifecycle states:

1. **DiagramStateStore (Zustand)**: Centralized state machine managing diagram states (never_generated, generating, fresh, stale, error) with type-safe transition methods and devtools integration
2. **DiagramStateBadge**: React component rendering state-specific icons and messages with clickable actions for stale/error states
3. **GeneratePromptCard**: Inviting blue-themed prompt card for never-generated diagrams with generate button

## Implementation Details

### DiagramStateStore Features
- **Map-based storage** with composite keys (repoPath:level:elementId)
- **Path normalization** to forward slashes for cross-platform consistency
- **Type-safe transitions**: transitionToGenerating, transitionToFresh, transitionToStale, transitionToError
- **Bulk operations**: loadStatesFromBackend, clearStatesForRepo
- **Devtools integration** for state debugging

### UI Component Design
- **Fresh state**: Green checkmark badge with "Up to date" message
- **Stale state**: Amber clock badge, clickable to regenerate
- **Generating state**: Blue spinner badge with "Generating..." message
- **Error state**: Red warning badge, clickable to retry, error details in tooltip
- **Never generated**: Centered prompt card with blue theme and generate button

### User Decision Implementations
- Error messages are user-friendly only (e.g., "Failed to load - Click to retry")
- Technical error details shown in tooltips, not prominently displayed
- Never-generated prompt uses inviting blue colors, not error colors (red/yellow)
- Single badge location in diagram header (no duplicate badges)

## Deviations from Plan

None - plan executed exactly as written.

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create diagramStateStore Zustand store | e2cb81d | src/renderer/stores/diagramStateStore.ts |
| 2 | Create DiagramStateBadge component | 59fcdcd | src/renderer/components/DiagramViewer/DiagramStateBadge.tsx |
| 3 | Create GeneratePromptCard component | 7626012 | src/renderer/components/DiagramViewer/GeneratePromptCard.tsx |

## Verification

**TypeScript Compilation**: ✅ Passes (npm run typecheck)

All files successfully created with proper TypeScript types and exports:
- useDiagramStateStore hook exports correctly from diagramStateStore.ts
- DiagramStateBadge component uses lucide-react icons as specified
- GeneratePromptCard uses inviting blue theme per user decision

**Pre-existing Issue**: TypeScript error in src/main/services/c4/migrationService.ts (unused variable) - out of scope for this plan.

## Integration Notes

### Next Steps for Integration
1. Import useDiagramStateStore into DiagramViewer component
2. Replace existing StalenessBadge with DiagramStateBadge
3. Add GeneratePromptCard for never-generated state handling
4. Wire onRegenerate callbacks to diagram generation logic
5. Sync state changes from backend via IPC listeners

### State Synchronization Pattern
```typescript
// In DiagramViewer component:
const state = useDiagramStateStore(s => s.getState(repoPath, level, elementId));

// Listen for IPC state changes:
useEffect(() => {
  window.reef.ipc.on('diagram:state-changed', (event) => {
    useDiagramStateStore.getState().setState(
      event.repoPath,
      event.level,
      event.state,
      event.elementId,
      event.errorMessage
    );
  });
}, []);
```

## Success Criteria Met

- [x] src/renderer/stores/diagramStateStore.ts exports useDiagramStateStore hook
- [x] Store has getState, setState, and transition methods
- [x] DiagramStateBadge renders Check (green), Clock (amber), Loader2 (blue), AlertCircle (red) icons
- [x] DiagramStateBadge handles onClick for stale and error states
- [x] GeneratePromptCard renders centered, inviting prompt with generate button
- [x] All TypeScript compiles without errors in created files

## Self-Check: PASSED

**Files exist:**
- ✅ FOUND: src/renderer/stores/diagramStateStore.ts
- ✅ FOUND: src/renderer/components/DiagramViewer/DiagramStateBadge.tsx
- ✅ FOUND: src/renderer/components/DiagramViewer/GeneratePromptCard.tsx

**Commits exist:**
- ✅ FOUND: e2cb81d (Task 1 - diagramStateStore)
- ✅ FOUND: 59fcdcd (Task 2 - DiagramStateBadge)
- ✅ FOUND: 7626012 (Task 3 - GeneratePromptCard)

All planned artifacts created and committed successfully.
