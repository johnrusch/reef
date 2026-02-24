---
phase: 05-persistent-storage-foundation
plan: 00
subsystem: testing-infrastructure
tags: [test-scaffolds, tdd, wave-0]
requirements: [STOR-01, STOR-02, STOR-03, STOR-04]
dependency_graph:
  requires: []
  provides: [test-scaffolds-for-persistent-storage]
  affects: [subsequent-implementation-plans]
tech_stack:
  added: []
  patterns: [test-driven-development, vitest-todo-tests]
key_files:
  created:
    - tests/unit/main/services/storageService.test.ts
    - tests/integration/storageService.test.ts
    - tests/unit/main/services/migrationService.test.ts
    - tests/integration/migrationService.test.ts
    - tests/unit/renderer/stores/diagramStateStore.test.ts
    - tests/unit/renderer/components/DiagramStateBadge.test.tsx
    - tests/fixtures/v1_cache.db
    - tests/mocks/electron.mock.ts
  modified: []
decisions:
  - desc: "Used .todo tests for TDD scaffolds to define behavior before implementation"
    rationale: "Allows implementation plans to have clear success criteria via failing tests"
  - desc: "Created v1.0 fixture database with explicit schema and 3 sample entries"
    rationale: "Enables migration testing with realistic TTL expiration scenarios"
  - desc: "Separated unit and integration tests for storage and migration services"
    rationale: "Follows project test structure pattern (tests/unit/main vs tests/integration)"
metrics:
  duration_seconds: 146
  tasks_completed: 3
  files_created: 8
  test_scaffolds: 6
  completed_date: 2026-02-24
---

# Phase 5 Plan 00: Test Scaffolds for Persistent Storage

**One-liner:** Created comprehensive test scaffolds with .todo tests for STOR-01 through STOR-04, including v1.0 fixture database for migration testing.

## What Was Built

This plan created the complete test infrastructure required for Phase 5's persistent storage implementation. All test scaffolds define expected behavior via .todo tests, following the Nyquist sampling requirement that tests must exist before implementation.

### Test Scaffolds Created

**Storage Service Tests:**
- `tests/unit/main/services/storageService.test.ts` - 17 .todo tests covering STOR-01, STOR-03, STOR-04
  - Diagram persistence without TTL
  - WAL mode configuration
  - State tracking and transitions
  - Corruption handling
  - Storage operations
- `tests/integration/storageService.test.ts` - 4 .todo tests
  - Persistence across restarts
  - Concurrent access patterns

**Migration Service Tests:**
- `tests/unit/main/services/migrationService.test.ts` - 15 .todo tests covering STOR-02
  - Version detection (v1.0 vs v1.1)
  - Diagram migration logic
  - TTL expiration detection for all levels
  - Migration safety and atomicity
  - Cleanup operations
- `tests/integration/migrationService.test.ts` - 4 .todo tests
  - End-to-end migration flow
  - File cleanup verification
  - Data preservation

**Frontend Tests:**
- `tests/unit/renderer/stores/diagramStateStore.test.ts` - 13 .todo tests for STOR-04
  - State retrieval and mutations
  - Transition helpers
  - Bulk operations
- `tests/unit/renderer/components/DiagramStateBadge.test.tsx` - 12 .todo tests for STOR-04
  - Icon rendering for each state
  - Interactivity (click handlers, tooltips)
  - Accessibility

### Fixtures and Mocks

**v1.0 Database Fixture:**
Created `tests/fixtures/v1_cache.db` with v1.0 schema:
- Schema: diagram_cache table matching c4CacheService.ts structure
- Fields: id, repo_path, diagram_type, element_id, diagram_content, created_at, last_accessed, access_count
- user_version: 0 (indicates v1.0)
- Sample data: 3 entries for TTL testing
  - Fresh context diagram (1 day old, within 7-day TTL)
  - Expired context diagram (10 days old, outside 7-day TTL)
  - Expired code diagram (12 hours old, outside 6-hour TTL)

**Electron Mock:**
Created `tests/mocks/electron.mock.ts`:
- Provides app.getPath mock for userData directory
- Enables tests to run in isolated temp directories
- Supports electron-store mocking for future tests

## Test Coverage Map

| Requirement | Test Type | File | Test Count |
|-------------|-----------|------|------------|
| STOR-01 (Persistence) | Unit | storageService.test.ts | 5 |
| STOR-01 (Persistence) | Integration | storageService.test.ts | 2 |
| STOR-02 (Migration) | Unit | migrationService.test.ts | 15 |
| STOR-02 (Migration) | Integration | migrationService.test.ts | 4 |
| STOR-03 (WAL Mode) | Unit | storageService.test.ts | 3 |
| STOR-03 (WAL Mode) | Integration | storageService.test.ts | 2 |
| STOR-04 (State) | Unit | storageService.test.ts | 6 |
| STOR-04 (State) | Unit | diagramStateStore.test.ts | 13 |
| STOR-04 (State) | Unit | DiagramStateBadge.test.tsx | 12 |

**Total:** 62 .todo tests defining expected behavior across all Phase 5 requirements.

## Implementation Notes

### Test Execution Verified
- All test scaffolds run successfully with `npm run test:unit`
- Tests correctly show as "todo" and skip execution
- No compilation or syntax errors
- Test structure follows existing project patterns (GitService.test.ts)

### Fixture Database Verification
```sql
sqlite3 tests/fixtures/v1_cache.db
> SELECT COUNT(*) FROM diagram_cache;
3
> PRAGMA user_version;
0
```

Database schema matches v1.0 structure exactly, enabling realistic migration testing.

### Next Steps for Implementation Plans

Subsequent plans (05-01 through 05-04) should:
1. Read relevant test scaffolds to understand expected behavior
2. Implement features until tests pass
3. Convert .todo to actual test implementations
4. Verify tests pass before marking task complete

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria

- [x] tests/unit/main/services/storageService.test.ts exists with STOR-01, STOR-03, STOR-04 test stubs
- [x] tests/unit/main/services/migrationService.test.ts exists with STOR-02 test stubs
- [x] tests/integration/storageService.test.ts exists with persistence test stubs
- [x] tests/integration/migrationService.test.ts exists with migration flow test stubs
- [x] tests/unit/renderer/stores/diagramStateStore.test.ts exists with state machine test stubs
- [x] tests/unit/renderer/components/DiagramStateBadge.test.tsx exists with badge rendering test stubs
- [x] tests/fixtures/v1_cache.db exists with v1.0 schema sample data
- [x] tests/mocks/electron.mock.ts provides app.getPath mock
- [x] `npm run test:unit` passes (skips .todo tests)

All success criteria met.

## Self-Check

Verifying all claimed files exist:

**Files:**
- ✓ tests/unit/main/services/storageService.test.ts
- ✓ tests/integration/storageService.test.ts
- ✓ tests/unit/main/services/migrationService.test.ts
- ✓ tests/integration/migrationService.test.ts
- ✓ tests/unit/renderer/stores/diagramStateStore.test.ts
- ✓ tests/unit/renderer/components/DiagramStateBadge.test.tsx
- ✓ tests/fixtures/v1_cache.db
- ✓ tests/mocks/electron.mock.ts

**Commits:**
- ✓ f242397 - test(05-00): add storage service test scaffolds
- ✓ de5ba58 - test(05-00): add migration service test scaffolds and fixtures
- ✓ 27d2465 - test(05-00): add frontend test scaffolds

**Self-Check: PASSED**

All claimed files and commits verified.
