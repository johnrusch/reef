---
status: complete
phase: 11-static-analysis-depth
source: [11-01-SUMMARY.md, 11-02-SUMMARY.md]
started: 2026-03-02T22:00:00Z
updated: 2026-03-02T22:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. All tests pass
expected: Running `npm run test:unit` completes with 30 static analyzer tests passing and 0 failures.
result: pass

### 2. TypeScript repo analysis extracts functions
expected: The static analyzer extracts exported functions from TypeScript repos with name, filePath, parameters, returnType, and significance fields populated. Hook-prefixed functions (use*) are classified as significant.
result: pass

### 3. Class extraction includes decorators and JSDoc
expected: Classes analyzed from TypeScript have decorators listed as string arrays (e.g., ["Injectable"]) and description populated from JSDoc comments.
result: pass

### 4. Component grouping produces semantic labels
expected: Analysis of a TypeScript repo produces componentGroups where directory names are mapped to human-readable labels (e.g., "services" -> "Service Layer", "components" -> "UI Components", "hooks" -> "Custom Hooks").
result: pass

### 5. JavaScript-only repo analysis works
expected: Analyzing a repo with no tsconfig.json but with .js files succeeds with analysisQuality "js-ast" and extracts classes/functions from the JS source.
result: pass

### 6. Non-JS repo fallback to file structure scan
expected: Analyzing a Python repo (no .ts or .js entry points) produces analysisQuality "file-structure" with componentGroups derived from directory structure and an analysisWarning about partial analysis.
result: pass

### 7. PlantUML diagrams use semantic component labels
expected: Generated C4 PlantUML component diagrams show semantic labels like "Service Layer" and "UI Components" instead of raw directory names like "services" and "components".
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
