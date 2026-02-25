---
phase: 06-auto-generation-on-repo-add
plan: 03
subsystem: ui-integration
tags: [react, electron, ipc, modal, zustand, sidebar, settings]
dependency_graph:
  requires:
    - phase: 06-auto-generation-on-repo-add
      plan: 01
      provides: "c4Generation IPC API, autoGenerateOnRepoAdd settings"
    - phase: 06-auto-generation-on-repo-add
      plan: 02
      provides: "generationQueueStore, toastStore, GenerationStatusBar, ToastContainer"
  provides:
    - "GenerationPromptModal: Radix Dialog with cost estimate and three action buttons"
    - "AddRepositoryModal: checks autoGenerateOnRepoAdd preference and shows prompt flow"
    - "MainLayout: mounts GenerationStatusBar and ToastContainer; wires all IPC events"
    - "DiagramSettings: autoGenerateOnRepoAdd dropdown (ask/always/never)"
    - "Sidebar: persistent red error badge on repos with failed generation"
  affects:
    - "End-to-end auto-generation flow: add repo -> preference check -> modal -> IPC -> progress -> toast"
tech-stack:
  added: []
  patterns:
    - "Radix Dialog modal with onOpenChange treating close as skip"
    - "Fragment wrapper in AddRepositoryModal to coexist with GenerationPromptModal"
    - "useGenerationQueueStore.getState() in useEffect callbacks to avoid exhaustive-deps issues"
    - "void keyword for fire-and-forget IPC calls"
    - "Lucide icon title via span wrapper (LucideProps does not accept title)"
key-files:
  created:
    - src/renderer/components/GenerationPromptModal.tsx
  modified:
    - src/renderer/components/AddRepositoryModal.tsx
    - src/renderer/components/layouts/MainLayout.tsx
    - src/renderer/components/DiagramSettings/DiagramSettings.tsx
    - src/renderer/components/Sidebar.tsx
decisions:
  - "GenerationPromptModal onOpenChange treats dialog close (Escape/overlay) as Skip — consistent UX"
  - "Fragment wrapper in AddRepositoryModal allows GenerationPromptModal to render after main modal closes"
  - "useGenerationQueueStore.getState() inside useEffect callbacks avoids re-subscriptions from dependencies"
  - "void keyword for c4Generation.enqueue() calls — fire-and-forget, store tracks state via IPC events"
  - "Lucide LucideProps does not accept title — wrapped in span for tooltip"
metrics:
  duration_seconds: 173
  completed_date: "2026-02-25"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 4
---

# Phase 6 Plan 3: UI Integration — Generation Prompt Modal, MainLayout Wiring, Error Badge Summary

**One-liner:** Radix Dialog generation prompt modal integrated into AddRepositoryModal with three-mode preference check, MainLayout IPC event wiring driving Zustand stores, and persistent sidebar error badge for failed generations.

## What Was Built

- `GenerationPromptModal.tsx`: Centered Radix Dialog modal with cost estimate (~60k tokens, ~$0.03), and three action buttons: Generate Now (primary blue), Always Generate for New Repos (secondary gray), Skip for Now (ghost). Dialog close (Escape/overlay) treated as Skip.

- `AddRepositoryModal.tsx`: After `addRepository()` succeeds, checks `autoGenerateOnRepoAdd` preference via `window.reef.diagramSettings.get()`. Routes to: auto-generate (always), silent close (never), or GenerationPromptModal (prompt). Handler functions: `handlePromptGenerate`, `handlePromptSkip`, `handlePromptAlwaysGenerate`, `cleanupAndClose`. All generation calls are fire-and-forget (`void window.reef.c4Generation.enqueue(...)`).

- `MainLayout.tsx`: Single `useEffect` with empty deps subscribes to all three IPC events using `useGenerationQueueStore.getState()` and `useToastStore.getState()` for stable references. Success: auto-dismiss toast (5s) + job dismissed after 2s delay. Error: persistent toast (duration:0) with Retry button. Cancel: info toast (3s) + job dismissed after 1s. All three unsubscribers returned from cleanup. Added `pb-10` to main content area to clear fixed status bar.

- `DiagramSettings.tsx`: Added Auto-Generation section with `<select>` dropdown for `autoGenerateOnRepoAdd` (Ask me each time / Always generate diagrams / Never generate automatically). Calls `saveSettings()` on change, which uses the existing `window.reef.diagramSettings.set()` pattern.

- `Sidebar.tsx`: Imports `AlertCircle` and `useGenerationQueueStore`. Repo list items show both yellow modified dot and red `AlertCircle` icon wrapped in a flex container (`ml-auto shrink-0`) to avoid positioning conflict. Error badge persists as long as job has `status === 'error'` in the store.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create GenerationPromptModal and integrate into AddRepositoryModal | 56bc705 | GenerationPromptModal.tsx (created), AddRepositoryModal.tsx |
| 2 | Mount StatusBar and ToastContainer in MainLayout with IPC event wiring | 60027be | MainLayout.tsx, DiagramSettings.tsx |
| 3 | Add persistent error badge to sidebar repo list for failed generations | 2af2c5e | Sidebar.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Lucide icon title prop TypeScript error**
- **Found during:** Task 3 verification (`npx tsc --noEmit`)
- **Issue:** The plan specified `<AlertCircle size={14} className="text-red-400" title="Diagram generation failed" />` but Lucide's `LucideProps` type does not include `title`, causing TS2322 error.
- **Fix:** Wrapped the `AlertCircle` in a `<span title="Diagram generation failed">` — same visual result, TypeScript-clean.
- **Files modified:** `src/renderer/components/Sidebar.tsx`
- **Commit:** 2af2c5e

None of the other plan implementation choices required deviation — all three tasks executed as specified.

## Self-Check: PASSED

Files verified:
- FOUND: src/renderer/components/GenerationPromptModal.tsx
- FOUND: src/renderer/components/AddRepositoryModal.tsx (contains showGenerationPrompt, handlePromptGenerate)
- FOUND: src/renderer/components/layouts/MainLayout.tsx (contains GenerationStatusBar, ToastContainer, onProgress, onComplete, onCancelled)
- FOUND: src/renderer/components/DiagramSettings/DiagramSettings.tsx (contains autoGenerateOnRepoAdd dropdown)
- FOUND: src/renderer/components/Sidebar.tsx (contains AlertCircle, useGenerationQueueStore, jobs.get)

Commits verified:
- FOUND: 56bc705
- FOUND: 60027be
- FOUND: 2af2c5e

TypeScript: `npx tsc --noEmit` passes with zero errors.
