---
status: resolved
trigger: "c4-plantuml-syntax-error"
created: 2026-02-22T00:00:00.000Z
updated: 2026-02-22T00:20:00.000Z
---

## Current Focus

hypothesis: CONFIRMED - C4PlantUMLGenerator uses HTTPS URLs for !include statements, but PlantUML JAR may not have internet access or doesn't support HTTPS includes
test: Check if PlantUML JAR has C4-PlantUML library bundled in stdlib, or if we need to use local includes
expecting: Need to switch from `!include https://raw.githubusercontent.com/...` to stdlib includes like `!include <C4/C4_Context>`
next_action: Research PlantUML 1.2024.8 C4 stdlib support and update generator to use stdlib includes

## Symptoms

expected: C4 diagrams should render with Person/System/Container/Component elements. When regenerating diagrams with different specifications through UI, C4-PlantUML syntax should work correctly.

actual: PlantUML 1.2024.8 throws "Syntax Error?" when encountering Person(user, "Developer", "Uses Reef to manage repositories") at line 5 of the diagram. Error shown in Reef UI diagram viewer.

errors:
```
PlantUML 1.2024.8

<b>This version of PlantUML is 464 days old, so you should
<b>consider upgrading from https://plantuml.com/download
[From string (line 5) ]

@startuml

title System Context Diagram for Reef
Person(user, "Developer", "Uses Reef to manage repositories")
Syntax Error?
```

reproduction:
1. Use Reef UI diagram viewer
2. Generate or regenerate a C4 diagram with different specifications
3. Diagram contains C4-PlantUML syntax like Person(), System(), etc.
4. PlantUML renderer throws syntax error

started: Just implemented C4 feature in Phase 1 (recently completed 3 plans: 01-01, 01-02, 01-03). Now testing the implementation. This is the first real usage after implementation.

## Eliminated

## Evidence

- timestamp: 2026-02-22T00:05:00.000Z
  checked: C4PlantUMLGenerator source code (c4PlantUMLGenerator.ts)
  found: Line 25 uses `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml`
  implication: Generator uses HTTPS URLs to fetch C4 library from GitHub at render time

- timestamp: 2026-02-22T00:06:00.000Z
  checked: All three C4 diagram methods (Context/Container/Component)
  found: Lines 25, 77, 160 all use HTTPS includes to raw.githubusercontent.com
  implication: Every C4 diagram generation requires internet access to fetch C4 library

- timestamp: 2026-02-22T00:07:00.000Z
  checked: Error message from symptoms
  found: "Syntax Error?" at line 5 after `Person(user, "Developer", "Uses Reef...")` - PlantUML doesn't recognize Person() macro
  implication: C4 library not loaded - either HTTPS include failed or PlantUML doesn't support HTTPS includes

- timestamp: 2026-02-22T00:10:00.000Z
  checked: PlantUML C4 documentation and stdlib support
  found: PlantUML has C4 bundled in stdlib - correct syntax is `!include <C4/C4_Context>` not HTTPS URL
  implication: Generator using wrong include syntax - should use stdlib angle bracket syntax for offline support

## Evidence

## Resolution

root_cause: C4PlantUMLGenerator uses HTTPS URLs (`!include https://raw.githubusercontent.com/...`) to fetch C4 library at render time. PlantUML JAR has C4 library bundled in its stdlib, but the generator is not using the correct syntax to access it. The correct syntax is `!include <C4/C4_Context>` which uses the built-in stdlib (no internet required).

Lines affected:
- c4PlantUMLGenerator.ts:25 - Context diagram
- c4PlantUMLGenerator.ts:77 - Container diagram
- c4PlantUMLGenerator.ts:160 - Component diagram

fix: Changed all three C4 diagram generation methods to use stdlib syntax:
- `!include <C4/C4_Context>` instead of `!include https://raw.githubusercontent.com/.../C4_Context.puml`
- `!include <C4/C4_Container>` instead of `!include https://raw.githubusercontent.com/.../C4_Container.puml`
- `!include <C4/C4_Component>` instead of `!include https://raw.githubusercontent.com/.../C4_Component.puml`

Also updated test expectations in c4Generation.test.ts to match new include syntax.

verification:
1. All 19 C4 integration tests passing
2. Tests verify generated diagrams contain `!include <C4/C4_Context>` syntax
3. Tests verify C4 macros (Person, System, Container, Component) are present in output
4. Main process builds successfully with TypeScript
5. Fix addresses root cause: PlantUML stdlib includes work offline without internet access

files_changed:
- src/main/services/c4/c4PlantUMLGenerator.ts
- tests/integration/c4Generation.test.ts
