---
status: resolved
trigger: "c4-plantuml-variable-error"
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:06:00Z
---

## Current Focus

hypothesis: VERIFIED - Installing Graphviz + updating PlantUML JAR fixes the issue
test: Create post-install script to automate PlantUML JAR update
expecting: Script will download latest PlantUML JAR and package.json will document Graphviz requirement
next_action: Create scripts/update-plantuml.js and add postinstall hook

## Symptoms

expected: Display PlantUML C4 diagram in the application's visual map interface
actual: Error message appears showing "Unknown variable NEW_C4_STYLE" with stack trace pointing to C4.puml includes
errors:
```
[From https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4.puml (line 17) ]
[From https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml (line 5) ]
[From string (line 2) ]
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml
' convert it with additional command line argument -DRELATIVE_INCLUDE="relative/absolute" to use locally
!if %variable_exists("RELATIVE_INCLUDE")
!include ./C4.puml
!else
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4.puml
' C4-PlantUML
' Global pre-settings
' ##################################
' NEW_C4_STYLE
' If NEW_C4_STYLE is set BEFORE the first C4_* file is loaded, new C4 layout style is used
' NEW_C4_STYLE can be set via
' !NEW_C4_STYLE = 1
' or with additional command line argument -DNEW_C4_STYLE=1
!global NEW_C4_STYLE ?= 0
' ROUNDED_STYLE
' If ROUNDED_STYLE is set BEFORE the first C4_* file is loaded, rectangles with rounded corners are used as default sh ...
' ROUNDED_STYLE can be set via
' !ROUNDED_STYLE = 1
' or with additional command line argument -DROUNDED_STYLE=1
!if (NEW_C4_STYLE == 1)
Unknown variable NEW_C4_STYLE
```
reproduction: Error appears when generating a C4 diagram through the application
timeline: Started recently (after C4 foundation implementation in phase 01-03)
error_location: Both UI and PlantUML service

## Eliminated

## Evidence

- timestamp: 2026-02-22T00:01:00Z
  checked: c4PlantUMLGenerator.ts, plantUmlService.ts, c4Generation.test.ts
  found: C4_Context.puml includes C4.puml internally, causing double inclusion. Line 25 includes C4_Context.puml which itself includes C4.puml at line 5 (as shown in error trace)
  implication: The error trace shows C4.puml is being included by C4_Context.puml, and the variable NEW_C4_STYLE is being defined there, but PlantUML is erroring on the conditional check

- timestamp: 2026-02-22T00:01:30Z
  checked: Error message pattern
  found: Error says "Unknown variable NEW_C4_STYLE" on line that checks "!if (NEW_C4_STYLE == 1)" but the variable was just defined on previous line "!global NEW_C4_STYLE ?= 0"
  implication: This suggests PlantUML preprocessor syntax issue or version incompatibility with the ?= operator

- timestamp: 2026-02-22T00:02:00Z
  checked: Generated test SVG output from node-plantuml
  found: PlantUML version in SVG metadata shows "PlantUML version 1.2019.06(Fri May 24 10:10:25 PDT 2019)"
  implication: node-plantuml 0.9.0 bundles a 2019 version of PlantUML which is too old to support the ?= operator

- timestamp: 2026-02-22T00:02:30Z
  checked: C4-PlantUML repository and PlantUML version requirements
  found: The ?= operator (conditional assignment) was introduced in PlantUML version 1.2020.x or later. Current bundled version is from 2019.
  implication: Need to either update node-plantuml package OR use a different approach to run PlantUML with latest JAR

- timestamp: 2026-02-22T00:03:00Z
  checked: Replaced plantuml.jar with versions 1.2024.8 and 1.2025.0
  found: Both versions fail with vizjs engine error "Cannot invoke net.sourceforge.plantuml.vizjs.VizJsEngine.execute(String) because engine is null"
  implication: The bundled vizjs.jar is incompatible with newer PlantUML versions; need different solution

- timestamp: 2026-02-22T00:03:30Z
  checked: PlantUML documentation and C4 diagram requirements
  found: C4 diagrams require Graphviz (dot) to render. node-plantuml bundles vizjs.jar as a fallback, but it's incompatible with modern PlantUML. Solution: install Graphviz system-wide or use newer PlantUML package
  implication: Best fix is to create a post-install script that downloads latest PlantUML JAR and ensure Graphviz is available

## Resolution

root_cause: node-plantuml 0.9.0 bundles PlantUML version 1.2019.06 (from May 2019), which does not support the ?= conditional assignment operator. C4-PlantUML uses this operator to set default values for variables like NEW_C4_STYLE and ROUNDED_STYLE. When the old PlantUML version encounters "!global NEW_C4_STYLE ?= 0", it fails to recognize the syntax and subsequently reports "Unknown variable NEW_C4_STYLE" when trying to use it in conditional statements. Additionally, C4 diagrams require Graphviz (dot executable) to render properly.

fix:
1. Created post-install script (scripts/update-plantuml.js) that downloads PlantUML 1.2024.8 JAR and replaces the bundled 2019 version in node_modules/node-plantuml/vendor/
2. Added postinstall hook to package.json to run the script automatically after npm install
3. Added engines field and postInstallMessage to package.json documenting Graphviz requirement
4. Installed Graphviz (required for C4 diagram rendering)

verification:
- Created test script that generates C4 Context diagram with Person and System elements
- Verified PlantUML JAR was successfully updated from 1.2019.06 to 1.2024.8
- Confirmed C4 diagram generates without "Unknown variable NEW_C4_STYLE" error
- Generated SVG contains proper C4 elements (person, system, relationships)
- Post-install script tested and works correctly with backup mechanism

files_changed:
- scripts/update-plantuml.js (created)
- package.json (modified - added postinstall script)
- package.json (modified - added note about Graphviz requirement)
