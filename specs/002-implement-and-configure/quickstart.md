# Testing Framework Quickstart

## Setup Verification

### 1. Install Dependencies
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event c8 playwright @playwright/test
```

### 2. Verify Configuration
```bash
# Check if test commands are available
npm run test --dry-run
npm run test:unit --dry-run
npm run test:coverage --dry-run
```

**Expected**: Commands should be recognized without errors

## Core Test Scenarios

### Scenario 1: React Component Unit Test
**Objective**: Verify React component testing capabilities

**Test File**: `tests/unit/renderer/components/Button.test.tsx`
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@renderer/components/Button'

test('button renders with correct text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole('button')).toHaveTextContent('Click me')
})

test('button calls onClick when clicked', () => {
  const handleClick = vi.fn()
  render(<Button onClick={handleClick}>Click me</Button>)
  
  fireEvent.click(screen.getByRole('button'))
  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

**Execute**: `npm test:unit Button.test.tsx`
**Expected**: 2 tests pass, component renders and handles events correctly

### Scenario 2: Electron Main Process Test
**Objective**: Verify main process service testing

**Test File**: `tests/unit/main/services/GitService.test.ts`
```typescript
import { GitService } from '@main/services/GitService'
import { vi } from 'vitest'

// Mock simple-git
vi.mock('simple-git', () => ({
  default: () => ({
    status: vi.fn().mockResolvedValue({ files: [] }),
    branch: vi.fn().mockResolvedValue({ current: 'main' })
  })
}))

test('GitService returns repository status', async () => {
  const gitService = new GitService()
  const status = await gitService.getStatus('/path/to/repo')
  
  expect(status).toBeDefined()
  expect(status.files).toEqual([])
})
```

**Execute**: `npm test:unit GitService.test.ts`
**Expected**: Test passes, Git operations are properly mocked

### Scenario 3: IPC Communication Test
**Objective**: Verify main-renderer communication testing

**Test File**: `tests/integration/ipc/GitOperations.test.ts`
```typescript
import { ipcRenderer } from 'electron'
import { GitOperations } from '@renderer/services/GitOperations'

// Mock IPC
const mockIpcRenderer = {
  invoke: vi.fn()
}

test('GitOperations calls main process via IPC', async () => {
  mockIpcRenderer.invoke.mockResolvedValue({ success: true })
  
  const gitOps = new GitOperations()
  const result = await gitOps.getRepositoryStatus('/path/to/repo')
  
  expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
    'git:status',
    '/path/to/repo'
  )
  expect(result.success).toBe(true)
})
```

**Execute**: `npm test:integration IPC`
**Expected**: IPC communication is properly tested and mocked

### Scenario 4: GitHub API Integration Test
**Objective**: Verify API testing with MSW

**Test File**: `tests/integration/api/GitHubService.test.ts`
```typescript
import { setupServer } from 'msw/node'
import { rest } from 'msw'
import { GitHubService } from '@main/services/GitHubService'

const server = setupServer(
  rest.get('https://api.github.com/user', (req, res, ctx) => {
    return res(ctx.json({ login: 'testuser', id: 123 }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('GitHubService fetches user data', async () => {
  const service = new GitHubService('fake-token')
  const user = await service.getCurrentUser()
  
  expect(user.login).toBe('testuser')
  expect(user.id).toBe(123)
})
```

**Execute**: `npm test:integration GitHubService`
**Expected**: API calls are intercepted and tested successfully

### Scenario 5: End-to-End User Workflow
**Objective**: Verify complete application functionality

**Test File**: `tests/e2e/repository-management.spec.ts`
```typescript
import { test, expect } from '@playwright/test'
import { ElectronApplication } from 'playwright'

test('user can add and view repository', async ({ page, electronApp }) => {
  // Wait for app to load
  await page.waitForSelector('[data-testid="main-window"]')
  
  // Add repository
  await page.click('[data-testid="add-repo-button"]')
  await page.fill('[data-testid="repo-path-input"]', '/path/to/test/repo')
  await page.click('[data-testid="confirm-add-button"]')
  
  // Verify repository appears in list
  await expect(page.locator('[data-testid="repo-list"]')).toContainText('test/repo')
  
  // Verify repository status is displayed
  await expect(page.locator('[data-testid="repo-status"]')).toBeVisible()
})
```

**Execute**: `npm run test:e2e`
**Expected**: Full application launches and user workflow completes successfully

## Coverage Verification

### Generate Coverage Report
```bash
npm run test:coverage
```

**Expected Output**:
```
Coverage Summary:
├── Statements: 85% (850/1000)
├── Branches: 80% (400/500)
├── Functions: 90% (180/200)
└── Lines: 85% (850/1000)

✓ Coverage thresholds met
```

### View Detailed Coverage
```bash
open coverage/index.html
```

**Expected**: HTML report opens showing file-by-file coverage details

## Continuous Integration Setup

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
```

**Verify**: Tests run automatically on every commit and PR

## Development Workflow Integration

### Pre-commit Hook
```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm test:unit"
```

**Expected**: Unit tests run before every commit, preventing broken code

### Watch Mode Development
```bash
npm run test:watch
```

**Expected**: Tests re-run automatically when files change during development

## Troubleshooting Common Issues

### Path Alias Resolution
If imports like `@renderer/components` fail:
1. Check `vitest.config.ts` has correct path mapping
2. Verify `tsconfig.json` paths are consistent
3. Restart test runner to pick up config changes

### Electron API Mocking
If Electron APIs are undefined in tests:
1. Ensure test environment is set to 'node' for main process tests
2. Use proper mocking for renderer process electron APIs
3. Check that @electron/remote is properly configured

### Performance Issues
If tests run slowly:
1. Use `test:unit` for fast feedback during development
2. Limit E2E tests to critical user flows
3. Use `.only()` to run specific tests during debugging

## Success Criteria Validation

✅ **Unit Tests**: React components and services are testable  
✅ **Integration Tests**: IPC and API communication works correctly  
✅ **E2E Tests**: Complete user workflows are verified  
✅ **Coverage**: Minimum 80% code coverage achieved  
✅ **CI Integration**: Tests run automatically on every change  
✅ **Developer Experience**: Fast feedback with watch mode and clear error messages