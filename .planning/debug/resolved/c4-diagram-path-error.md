---
status: resolved
trigger: "c4-diagram-path-error"
created: 2026-02-21T00:00:00Z
updated: 2026-02-21T00:06:00Z
---

## Current Focus

hypothesis: CONFIRMED - API signature mismatch causes formatted context to be used as file path
test: examine how C4 diagrams should work vs how they're being called
expecting: need to pass repoPath instead of formatted context, or C4 analyzer needs to accept context
next_action: determine correct fix approach and implement

## Symptoms

expected: C4 diagram should be generated and displayed without errors
actual: Error occurs: "ENAMETOOLONG: name too long, open '/Users/johnrusch/Code/reef/=== ADDITIONAL CONTEXT ===..." with full debug output in the path
errors: ```
VisualMapTab.tsx:172 Diagram generation error: Error: Static analysis failed: Analysis failed: ENAMETOOLONG: name too long, open '/Users/johnrusch/Code/reef/=== ADDITIONAL CONTEXT ===

--- package.json ---
{... thousands of lines of pasted debug context ...}
```
reproduction: Click "Generate Diagram" button in Visual Map tab - happens every time
timeline: Just started happening today - first time seeing this error

## Eliminated

## Evidence

- timestamp: 2026-02-21T00:01:00Z
  checked: grep for "=== ADDITIONAL CONTEXT ==="
  found: String appears in contextExtractorServiceV2.ts:618 and contextExtractorService.ts:341
  implication: Context extractor adds this header to formatted output, which is being passed as repoPath parameter

- timestamp: 2026-02-21T00:02:00Z
  checked: diagramGeneratorService.ts:106
  found: `this.c4Analyzer.generateC4Diagram(context, level, options.elementId)` passes formatted context string as first parameter
  implication: API mismatch - generateC4Diagram expects repoPath but receives formatted context

- timestamp: 2026-02-21T00:03:00Z
  checked: c4AnalyzerService.ts:43-68
  found: generateC4Diagram(repoPath: string, ...) expects path, passes it to staticAnalyzer.analyzeProject(repoPath)
  implication: The formatted context string (containing "=== ADDITIONAL CONTEXT ===") gets passed to ts-morph as a file path

## Resolution

root_cause: API signature mismatch in VisualMapTab.tsx. When generating C4 diagrams, the frontend extracts formatted context and passes it to diagram.generate(), but C4 diagrams expect a repository path because they do their own static analysis using ts-morph. The formatted context string (containing "=== ADDITIONAL CONTEXT ===" and thousands of lines) was being used as a file path, causing ENAMETOOLONG error.

fix: Modified VisualMapTab.tsx:113-140 to detect C4 diagram types and pass repository.path directly instead of extracting and passing formatted context. Traditional UML diagrams still use pre-extracted context as before. Added explanatory comments to clarify the difference.

verification:
- TypeScript compilation: Passes (pre-existing DiagramSettings type error unrelated to this fix)
- Code changes verified via git diff
- Logic verified: C4 diagrams now receive repository.path, traditional diagrams receive formatted context
- Manual testing required: User should test generating a C4 diagram to confirm error is resolved
files_changed:
  - src/renderer/components/tabs/VisualMapTab.tsx
  - src/main/services/diagramGeneratorService.ts (comment clarification only)
