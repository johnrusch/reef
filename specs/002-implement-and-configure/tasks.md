# Tasks: Testing Framework Implementation

**Input**: Design documents from `/specs/002-implement-and-configure/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow Summary
Tech stack identified: TypeScript 5.3.3, Electron 28, React 18, Vite, Vitest, @testing-library/react, Playwright
Structure: Single project with Electron main/renderer separation
Entities: TestSuite, TestConfiguration, CoverageReport, MockObject, TestFixture, TestEnvironment
Contract: Test Runner API with npm scripts for test execution

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths are absolute for Electron desktop application structure

## Phase 3.1: Setup
- [X] T001 Install testing framework dependencies (vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, c8, playwright, @playwright/test, msw)
- [X] T002 [P] Create test directory structure: tests/unit/, tests/integration/, tests/e2e/
- [X] T003 [P] Create test subdirectories: tests/unit/main/, tests/unit/renderer/, tests/integration/api/, tests/integration/ipc/

## Phase 3.2: Configuration Setup
- [X] T004 [P] Configure Vitest for renderer process in vitest.config.ts
- [X] T005 [P] Configure Vitest for main process in vitest.config.main.ts  
- [X] T006 [P] Configure Playwright for E2E tests in playwright.config.ts
- [X] T007 [P] Create test setup file in tests/setup.ts
- [X] T008 [P] Create MSW setup for API mocking in tests/msw-setup.ts

## Phase 3.3: Package.json Scripts (TDD - Tests Before Implementation)
- [X] T009 Add test scripts to package.json (test, test:unit, test:integration, test:e2e, test:watch, test:coverage)
- [X] T010 [P] Contract test for npm test command execution in tests/contract/test-runner.test.ts
- [X] T011 [P] Contract test for npm test:unit command in tests/contract/unit-runner.test.ts
- [X] T012 [P] Contract test for npm test:coverage reporting in tests/contract/coverage-runner.test.ts

## Phase 3.4: Test Framework Configuration Tests (MUST FAIL before implementation)
- [X] T013 [P] Integration test for Vitest renderer config loading in tests/integration/config/vitest-renderer.test.ts
- [X] T014 [P] Integration test for Vitest main config loading in tests/integration/config/vitest-main.test.ts
- [X] T015 [P] Integration test for Playwright config loading in tests/integration/config/playwright.test.ts
- [X] T016 [P] Integration test for path alias resolution in tests/integration/config/path-aliases.test.ts

## Phase 3.5: Mock Infrastructure Tests (MUST FAIL before implementation)
- [X] T017 [P] Unit test for Electron API mocking in tests/unit/mocks/electron-api.test.ts
- [X] T018 [P] Unit test for GitHub API mocking with MSW in tests/unit/mocks/github-api.test.ts
- [X] T019 [P] Unit test for Git operations mocking in tests/unit/mocks/git-operations.test.ts
- [X] T020 [P] Integration test for IPC communication mocking in tests/integration/mocks/ipc-mock.test.ts

## Phase 3.6: Example Test Implementation (MUST FAIL before implementation)
- [X] T021 [P] React component unit test example in tests/unit/renderer/components/Button.test.tsx
- [X] T022 [P] Main process service unit test example in tests/unit/main/services/GitService.test.ts
- [X] T023 [P] IPC integration test example in tests/integration/ipc/GitOperations.test.ts
- [X] T024 [P] GitHub API integration test example in tests/integration/api/GitHubService.test.ts
- [X] T025 E2E test example in tests/e2e/repository-management.spec.ts

## Phase 3.7: Core Implementation (ONLY after ALL tests are failing)
- [X] T026 Implement package.json test scripts
- [X] T027 [P] Implement Vitest renderer configuration
- [X] T028 [P] Implement Vitest main process configuration  
- [X] T029 [P] Implement Playwright configuration
- [X] T030 [P] Implement test setup utilities
- [X] T031 [P] Implement MSW API mocking setup

## Phase 3.8: Mock Implementation
- [X] T032 [P] Implement Electron API mocks in tests/mocks/electron.ts
- [X] T033 [P] Implement GitHub API MSW handlers in tests/mocks/github-handlers.ts
- [X] T034 [P] Implement Git operations mocks in tests/mocks/git.ts
- [X] T035 [P] Implement IPC communication mocks in tests/mocks/ipc.ts

## Phase 3.9: Test Infrastructure
- [X] T036 [P] Implement test fixtures for Git repositories in tests/fixtures/git-repos.ts
- [X] T037 [P] Implement test fixtures for API responses in tests/fixtures/api-responses.ts
- [X] T038 [P] Implement test utilities for component testing in tests/utils/component-utils.ts
- [X] T039 [P] Implement test utilities for async operations in tests/utils/async-utils.ts

## Phase 3.10: Coverage and CI Setup
- [X] T040 Configure c8 coverage thresholds and reporting
- [X] T041 [P] Create GitHub Actions workflow in .github/workflows/tests.yml
- [X] T042 [P] Configure pre-commit hooks with Husky in .husky/pre-commit
- [X] T043 Update CLAUDE.md with testing commands and guidance

## Phase 3.11: Validation and Polish
- [X] T044 Run quickstart test scenarios to verify setup
- [X] T045 [P] Create testing documentation in docs/testing.md
- [X] T046 [P] Update README.md with testing section
- [X] T047 Verify all contract tests pass
- [X] T048 Verify coverage thresholds are met
- [X] T049 Run manual testing scenarios from quickstart.md

## Dependencies
- Setup (T001-T003) before configuration (T004-T008)
- Package scripts (T009) before contract tests (T010-T012)
- Configuration tests (T013-T016) before mock tests (T017-T020)
- All tests (T010-T025) MUST be written and failing before implementation (T026-T043)
- T026 blocks T027-T031
- Mock implementation (T032-T035) after core implementation (T026-T031)
- Test infrastructure (T036-T039) can run parallel with mocks
- Coverage setup (T040) after core implementation complete
- CI setup (T041-T042) after all testing infrastructure ready
- Validation (T044-T049) only after everything implemented

## Parallel Execution Examples

### Phase 3.2 Configuration Setup (T004-T008):
```
Task: "Configure Vitest for renderer process in vitest.config.ts"
Task: "Configure Vitest for main process in vitest.config.main.ts"
Task: "Configure Playwright for E2E tests in playwright.config.ts"
Task: "Create test setup file in tests/setup.ts"
Task: "Create MSW setup for API mocking in tests/msw-setup.ts"
```

### Phase 3.4-3.6 Test Creation (T013-T025):
```
Task: "Integration test for Vitest renderer config loading in tests/integration/config/vitest-renderer.test.ts"
Task: "Integration test for Vitest main config loading in tests/integration/config/vitest-main.test.ts"
Task: "Unit test for Electron API mocking in tests/unit/mocks/electron-api.test.ts"
Task: "React component unit test example in tests/unit/renderer/components/Button.test.tsx"
Task: "Main process service unit test example in tests/unit/main/services/GitService.test.ts"
```

### Phase 3.8 Mock Implementation (T032-T035):
```
Task: "Implement Electron API mocks in tests/mocks/electron.ts"
Task: "Implement GitHub API MSW handlers in tests/mocks/github-handlers.ts"  
Task: "Implement Git operations mocks in tests/mocks/git.ts"
Task: "Implement IPC communication mocks in tests/mocks/ipc.ts"
```

## Notes
- [P] tasks = different files, can run simultaneously
- TDD enforced: ALL tests T010-T025 must fail before ANY implementation T026+
- Commit after each task completion
- Verify tests fail with clear error messages before proceeding
- Focus on Electron-specific testing challenges (main/renderer separation, IPC, file system)

## Task Generation Rules Applied
1. **From Contract** (test-runner-api.md): Created contract tests for each npm command (T010-T012)
2. **From Data Model**: Configuration entities → config tests (T013-T016), Mock entities → mock tests (T017-T020)
3. **From Quickstart**: Each scenario → example test (T021-T025)
4. **TDD Ordering**: All tests before implementation, setup before tests
5. **Parallel Marking**: Different files marked [P], same file sequential

## Validation Checklist
✅ All contracts have corresponding tests (T010-T012)
✅ All entities have related tasks (TestConfiguration → T013-T016, MockObject → T017-T020)
✅ All tests come before implementation (T010-T025 before T026+)
✅ Parallel tasks truly independent (different files)
✅ Each task specifies exact file path
✅ No task modifies same file as another [P] task
✅ Quickstart scenarios covered (T021-T025)
✅ TDD workflow enforced with clear gates