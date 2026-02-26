---
status: complete
phase: 06-auto-generation-on-repo-add
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md
started: 2026-02-26T00:00:00Z
updated: 2026-02-26T00:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Auto-Generation Preference in Settings
expected: Open Diagram Settings. There should be an "Auto-Generation" section with a dropdown for autoGenerateOnRepoAdd with three options: "Ask me each time" (default), "Always generate diagrams", "Never generate automatically". Changing selection persists.
result: pass

### 2. Generation Prompt Modal on Repo Add
expected: With setting on "Ask me each time", add a new repository. After the repo is added successfully, a centered modal should appear showing a cost estimate (~60k tokens, ~$0.03) and three buttons: "Generate Now" (blue primary), "Always Generate for New Repos" (gray secondary), and "Skip for Now" (ghost). Pressing Escape or clicking overlay should act as Skip.
result: pass

### 3. Generation Progress Bar
expected: Trigger a diagram generation (via the prompt modal or any means). A fixed status bar should appear at the bottom of the screen showing a progress bar with percentage, the repo name, a spinner, and a Cancel button. It should be hidden when no generation is active.
result: pass
note: "Status bar only appears when generation triggered via modal on repo add, not from diagram tab"

### 4. Toast on Generation Complete (Success)
expected: After generation completes successfully, a success toast notification should appear at the bottom-right of the screen and auto-dismiss after about 5 seconds.
result: pass

### 5. Toast on Generation Error
expected: If generation fails (e.g., no API key configured), a persistent error toast should appear at the bottom-right with a "Retry" action button. It should NOT auto-dismiss — user must dismiss or retry.
result: skipped
reason: Can't test without removing API key

### 6. Error Badge in Sidebar
expected: When generation fails for a repo, a red error icon (circle with exclamation) should appear next to the repo name in the sidebar. The badge should persist as long as the error state exists.
result: skipped
reason: Can't test without removing API key (requires error state)

### 7. Cancel Generation
expected: While generation is in progress, click the Cancel button on the status bar. Generation should stop, an info toast should appear confirming cancellation (auto-dismiss ~3s), and partial diagram results should be cleaned up.
result: pass

## Summary

total: 7
passed: 5
issues: 0
pending: 0
skipped: 2

## Gaps

[none yet]
