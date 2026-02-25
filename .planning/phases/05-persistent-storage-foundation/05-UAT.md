---
status: complete
phase: 05-persistent-storage-foundation
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md
started: 2026-02-24T23:50:00Z
updated: 2026-02-25T00:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Fresh Diagram Badge
expected: Open a repository with a recently generated diagram. The diagram header shows a green checkmark badge with "Up to date" text. Badge is not clickable.
result: pass

### 2. Never Generated Diagram Prompt
expected: Open a repository that has never had a diagram generated. Instead of the diagram, you see a centered blue-themed card prompting you to generate the diagram with a "Generate" button.
result: issue
reported: "this does not appear at all"
severity: major

### 3. Generating State Badge
expected: Click Generate on a never-generated diagram (or regenerate an existing one). While generating, the header shows a blue spinner badge with "Generating..." text.
result: issue
reported: "the header did not show this. the generate button did grey out and have a spinner icon, but that isn't what this should be i think"
severity: major

### 4. Stale Diagram Badge
expected: If a diagram is marked stale (code changed), the header shows an amber clock badge. The badge is clickable and clicking it offers to regenerate.
result: issue
reported: "nope, not showing stale either. the header isn't changing from Up to date"
severity: major

### 5. Error State Badge
expected: If diagram generation fails, the header shows a red warning badge with a user-friendly error message. The badge is clickable to retry. No technical error details visible in UI (only in console).
result: skipped
reason: can't easily trigger an error

### 6. Storage Info in Settings
expected: Open Settings (gear icon). There is a "Storage" section showing the storage database path, total size (e.g., "1.2 MB"), and diagram count (e.g., "5 diagrams").
result: pass

### 7. Clear All Diagrams Button
expected: In Settings > Storage section, there is a red "Clear All Stored Diagrams" button. Clicking it shows a confirmation dialog ("This action cannot be undone"). Confirming clears all diagrams, count shows 0, and any open diagram viewers update to show the never-generated state.
result: issue
reported: "that button stays greyed out because no matter how many diagrams i generate, it always shows that i have 0 diagrams stored"
severity: blocker

### 8. Diagram Persists Across Restart
expected: Generate a diagram, close the app completely, reopen it, navigate to the same repository. The diagram is still there (not regenerated), showing fresh state badge.
result: issue
reported: "i don't even have to test this because even when i just navigate away from the tab (don't need to close the app) and return to the diagram tab, the diagram i generated isn't there anymore"
severity: blocker

## Summary

total: 8
passed: 2
issues: 5
pending: 0
skipped: 1

## Gaps

- truth: "Never-generated diagrams show centered blue-themed GeneratePromptCard with Generate button"
  status: failed
  reason: "User reported: this does not appear at all"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Generating state shows blue spinner badge in diagram header with Generating... text"
  status: failed
  reason: "User reported: the header did not show this. the generate button did grey out and have a spinner icon, but that isn't what this should be i think"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Stale diagrams show amber clock badge in header, clickable to regenerate"
  status: failed
  reason: "User reported: nope, not showing stale either. the header isn't changing from Up to date"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Diagrams are stored in persistent storage and count reflects stored diagrams"
  status: failed
  reason: "User reported: that button stays greyed out because no matter how many diagrams i generate, it always shows that i have 0 diagrams stored"
  severity: blocker
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Diagrams persist across tab navigation and app restarts"
  status: failed
  reason: "User reported: i don't even have to test this because even when i just navigate away from the tab (don't need to close the app) and return to the diagram tab, the diagram i generated isn't there anymore"
  severity: blocker
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
