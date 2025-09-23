# Test Runner API Contract

## Overview
This contract defines the CLI interface for running tests in the Reef application.

## Commands

### `npm test` - Run All Tests
**Purpose**: Execute the complete test suite with default configuration

**Usage**: 
```bash
npm test
```

**Expected Behavior**:
- Run unit tests for renderer components
- Run unit tests for main process services  
- Run integration tests for Git operations
- Generate coverage report
- Exit with code 0 on success, 1 on failure

**Output Format**:
```
✓ Unit tests: 45 passed, 0 failed
✓ Integration tests: 12 passed, 0 failed  
✓ Coverage: 85% (threshold: 80%)

Test run completed in 2.3s
```

### `npm test:unit` - Run Unit Tests Only
**Purpose**: Execute only unit tests for fast feedback

**Usage**:
```bash
npm test:unit [pattern]
```

**Parameters**:
- `pattern` (optional): Glob pattern to filter test files

**Expected Behavior**:
- Run tests in `tests/unit/` directory
- Skip integration and E2E tests
- Provide fast feedback for development

### `npm test:integration` - Run Integration Tests
**Purpose**: Execute integration tests that may modify filesystem/repositories

**Usage**:
```bash
npm test:integration
```

**Expected Behavior**:
- Run tests in `tests/integration/` directory
- Set up temporary test repositories
- Clean up test artifacts afterward

### `npm test:e2e` - Run End-to-End Tests
**Purpose**: Execute full application testing with Playwright

**Usage**:
```bash
npm test:e2e [--headed]
```

**Parameters**:
- `--headed` (optional): Run with visible browser window

**Expected Behavior**:
- Launch actual Electron application
- Simulate user interactions
- Test complete workflows
- Generate screenshots on failure

### `npm test:watch` - Development Watch Mode
**Purpose**: Re-run tests automatically when files change

**Usage**:
```bash
npm test:watch
```

**Expected Behavior**:
- Monitor source and test files for changes
- Re-run affected tests automatically
- Provide instant feedback during development

### `npm test:coverage` - Generate Coverage Report
**Purpose**: Generate detailed coverage analysis

**Usage**:
```bash
npm test:coverage [--output=html|json|text]
```

**Parameters**:
- `--output` (optional): Report format (default: html)

**Expected Behavior**:
- Run all tests with coverage instrumentation
- Generate report in specified format
- Open HTML report in browser if requested
- Fail if coverage below threshold

## Configuration Files

### `vitest.config.ts` - Main Test Configuration
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'json'],
      exclude: ['node_modules/', 'dist/', 'tests/']
    },
    setupFiles: ['./tests/setup.ts']
  }
})
```

### `vitest.config.main.ts` - Main Process Configuration
```typescript
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/main/**/*.test.ts']
  }
})
```

### `playwright.config.ts` - E2E Configuration
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    electronApp: './dist/main/main.js'
  }
})
```

## Error Handling

### Test Failures
- Exit code 1 when any test fails
- Detailed error messages with stack traces
- File and line number references for failures

### Configuration Errors
- Validate configuration before running tests
- Clear error messages for missing dependencies
- Suggestions for fixing common issues

### Resource Constraints
- Timeout handling for long-running tests
- Memory limit warnings
- Graceful handling of file system issues

## Integration Points

### Git Operations Testing
- Mock Git commands for unit tests
- Use temporary repositories for integration tests
- Test error scenarios (network issues, permissions)

### GitHub API Testing
- Mock API responses for unit tests
- Test rate limiting scenarios
- Validate request/response schemas

### Electron API Testing
- Mock main process APIs in renderer tests
- Test IPC communication patterns
- Validate security model compliance