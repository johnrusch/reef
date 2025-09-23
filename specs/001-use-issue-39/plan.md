# Implementation Plan: Fix External GitHub Links in Repository Management

**Branch**: `001-use-issue-39` | **Date**: 2025-09-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/johnrusch/Code/reef/specs/001-use-issue-39/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Fix broken external links in the Repository Management tab by implementing robust URL parsing for GitHub remote URLs. Users need reliable navigation from Reef to GitHub pages (repository, PRs, issues, actions) regardless of their git remote URL format (SSH, HTTPS, git protocol). The solution leverages existing React/TypeScript/Electron stack without introducing new technologies.

## Technical Context
**Language/Version**: TypeScript/React 18 with Electron 28  
**Primary Dependencies**: React, Zustand (state management), Radix UI, Tailwind CSS, simple-git, Octokit  
**Storage**: Electron-store for configuration, Git repositories on filesystem  
**Testing**: No testing framework currently configured (needs setup for TDD)  
**Target Platform**: Cross-platform desktop (Windows, macOS, Linux via Electron)
**Project Type**: single (Electron desktop application with main/renderer processes)  
**Performance Goals**: Instant URL parsing (<1ms), immediate link navigation  
**Constraints**: Must preserve existing functionality, no new dependencies, maintain Electron security model  
**Scale/Scope**: Repository management for individual developers, handle standard GitHub URL formats

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**: ✅ PASS
- Projects: 1 (Electron app with URL utility functions)
- Using framework directly: Yes (React, Zustand directly)
- Single data model: Yes (URL parsing utility with simple input/output)
- Avoiding patterns: Yes (direct utility functions, no over-engineering)

**Architecture**: ⚠️ NEEDS ADAPTATION (Electron desktop app)
- EVERY feature as library: Will create utils/githubUrl.ts as library-style module
- Libraries listed: githubUrl utility (URL parsing and validation)
- CLI per library: N/A (Electron desktop app, not CLI-first)
- Library docs: Will document utility functions with JSDoc

**Testing (NON-NEGOTIABLE)**: ❌ VIOLATION - MUST ADDRESS
- RED-GREEN-Refactor cycle: WILL ENFORCE (need to setup testing framework)
- Git commits show tests before implementation: WILL ENFORCE
- Order: Contract→Integration→E2E→Unit: WILL FOLLOW
- Real dependencies: N/A (pure URL parsing utility)
- Integration tests: Component-level tests for link functionality
- VIOLATION: No testing framework configured - MUST SETUP

**Observability**: ✅ PASS
- Structured logging: Console errors for invalid URLs
- Frontend logs: Built-in Electron renderer logging
- Error context: URL parsing error details included

**Versioning**: ✅ PASS
- Version: Using existing 0.1.0, will increment BUILD for fix
- BUILD increments: Following semantic versioning
- Breaking changes: None (pure addition/fix)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 1 (Single Electron project) - matches existing src/renderer/, src/main/ structure

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/update-agent-context.sh [claude|gemini|copilot]` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| No testing framework | TDD is NON-NEGOTIABLE constitutional requirement | Cannot implement with RED-GREEN-Refactor without test framework |
| Add Vitest dev dependency | Required for constitutional compliance | Cannot write tests first without testing framework |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (with testing framework addition noted)
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*