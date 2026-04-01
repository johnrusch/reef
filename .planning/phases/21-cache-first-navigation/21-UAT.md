---
status: partial
phase: 21-cache-first-navigation
source: 21-01-SUMMARY.md, 21-02-SUMMARY.md
started: 2026-03-31T16:00:00Z
updated: 2026-04-01T10:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Breadcrumb Navigation Uses Cache (No Regeneration)
expected: Navigate to a repo with existing diagrams. Click a breadcrumb segment to go to a previously visited level. The diagram loads instantly from cache — no generation spinner or AI API call.
result: blocked
blocked_by: server
reason: "app isn't pulling in the anthropic key from env file"

### 2. Sidebar Navigation Uses Cache (No Regeneration)
expected: Click a level in the sidebar hierarchy tree to navigate to a previously visited level. The diagram loads from cache instantly — no generation triggered.
result: pass

### 3. Element Click Drill-Down (Cache Miss Triggers Generation)
expected: Click an element in a diagram to drill down to a level not yet generated. Since it's a cache miss, generation should trigger (spinner appears, AI generates the diagram). The new diagram appears after generation completes.
result: pass

### 4. Generate All Produces All 4 C4 Levels
expected: On a repo with no diagrams, click "Generate All". All 4 C4 levels (context, container, component, code) are generated sequentially — all components finish before any code diagrams start. After completion, you can drill down through all levels without triggering additional generation.
result: pass

### 5. Generate All Button Label and Copy
expected: On a repo that has never had diagrams generated, the GeneratePromptCard shows with button label "Generate All" and description mentioning all 4 levels. After diagrams exist, the "Generate All" button in the toolbar is visible when appropriate.
result: pass

### 6. Sidebar Shows Cached Elements
expected: When viewing a context or container level with existing diagrams, the sidebar shows a list of clickable child elements under the active level (not "No elements cached").
result: issue
reported: "no, still not showing. navigated all diagrams in screenshot (so they should already be generated) but they aren't listed in the sidebar — shows 'No elements cached'"
severity: major

### 7. GeneratePromptCard UI Copy
expected: The GeneratePromptCard shows: description "All 4 levels will be generated so drill-down navigation is instant.", button "Generate All", footnote "Requires an Anthropic API key. Generation may take 30-60 seconds."
result: pass

## Summary

total: 7
passed: 5
issues: 1
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "Sidebar shows clickable child elements under the active level when diagrams exist"
  status: failed
  reason: "User reported: no, still not showing. navigated all diagrams in screenshot (so they should already be generated) but they aren't listed in the sidebar — shows 'No elements cached'"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
