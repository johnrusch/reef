# Testing Patterns

**Analysis Date:** 2026-02-21

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config: `vitest.config.ts` (renderer/integration tests, jsdom environment) and `vitest.config.main.ts` (main process tests, node environment)

**Assertion Library:**
- @testing-library/react 16.3.0 (component testing)
- Built-in Vitest expect() assertions
- @testing-library/jest-dom 6.8.0 for DOM matchers

**Run Commands:**
```bash
npm test                    # Run all tests (unit + integration)
npm run test:unit           # Run unit tests only (concurrent vitest for both configs)
npm run test:integration    # Run integration tests
npm run test:e2e            # Run end-to-end tests with Playwright
npm run test:watch          # Watch mode for development
npm run test:coverage       # Generate coverage reports
```

## Test File Organization

**Location:**
- Renderer/React tests: `tests/unit/renderer/**/*.test.{ts,tsx}`
- Main process tests: `tests/unit/main/**/*.test.ts`
- Integration tests: `tests/integration/**/*.test.{ts,tsx}`
- End-to-end tests: `tests/e2e/**/*.spec.ts`
- Mock setup: `tests/setup.ts` (global mocks)
- MSW setup: `tests/msw-setup.ts` (API mocking)

**Naming:**
- Test files match source files: `GitService.ts` → `GitService.test.ts`
- Export location matches source: `src/main/services/GitService.ts` → `tests/unit/main/services/GitService.test.ts`

**Structure:**
```
tests/
├── unit/
│   ├── main/              # Node environment (Electron main process)
│   │   └── services/
│   │       └── GitService.test.ts
│   ├── renderer/          # jsdom environment (React components)
│   │   ├── components/
│   │   │   └── Button.test.tsx
│   │   └── mocks/
│   ├── mocks/             # Mock implementation tests
│   │   ├── github-api.test.ts
│   │   ├── git-operations.test.ts
│   │   └── electron-api.test.ts
│   └── contract/          # Configuration contract tests
├── integration/           # jsdom environment (API + IPC integration)
│   ├── api/
│   │   └── GitHubService.test.ts
│   ├── ipc/
│   │   └── GitOperations.test.ts
│   ├── config/
│   │   ├── path-aliases.test.ts
│   │   ├── vitest-renderer.test.ts
│   │   ├── vitest-main.test.ts
│   │   └── playwright.test.ts
│   └── mocks/
│       └── ipc-mock.test.ts
├── fixtures/              # Test data
├── mocks/                 # Mock implementations
│   ├── electron.ts
│   ├── github-handlers.ts
│   ├── ipc.ts
│   └── git.ts
├── e2e/                   # Playwright end-to-end tests
├── utils/                 # Testing utilities
├── setup.ts               # Global test setup
└── msw-setup.ts           # Mock Service Worker setup
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('GitService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('GitService returns repository status', async () => {
    // Arrange
    const mockStatus = { /* ... */ };
    mockGit.status.mockResolvedValue(mockStatus);

    // Act
    const gitService = new GitService();
    const status = await gitService.getStatus('/test/repo');

    // Assert
    expect(status).toEqual(mockStatus);
    expect(mockGit.status).toHaveBeenCalledWith({ cwd: '/test/repo' });
  });

  test('GitService handles repository that is not a git repo', async () => {
    // Error case testing
  });
});
```

**Patterns:**
- `describe()` blocks organize related tests by functionality
- `beforeEach()` clears mocks between tests for isolation
- Try-catch pattern in tests to handle import failures (TDD-style expected failures)
- Descriptive test names follow behavior pattern: "GitService returns repository status"

**Async Testing Pattern:**
```typescript
// Tests use async/await naturally with Vitest
test('GitService can clone repositories', async () => {
  const gitService = new GitService();
  const result = await gitService.cloneRepository(
    'https://github.com/user/repo.git',
    '/local/path'
  );
  expect(result).toBe('/local/path/repo');
});

// Error assertions with rejects
await expect(gitService.getStatus('/not/a/repo'))
  .rejects.toThrow('Not a git repository');
```

## Mocking

**Framework:** Vitest vi module + Mock Service Worker (MSW)

**Mock Implementation:**

1. **Vitest vi mocks for modules:**
```typescript
// tests/unit/main/services/GitService.test.ts
const mockGit = {
  status: vi.fn(),
  branch: vi.fn(),
  log: vi.fn(),
  add: vi.fn(),
  commit: vi.fn(),
  push: vi.fn(),
  pull: vi.fn(),
  fetch: vi.fn(),
  clone: vi.fn(),
  checkout: vi.fn(),
  diff: vi.fn(),
  stash: vi.fn(),
};

vi.mock('simple-git', () => ({
  default: () => mockGit
}));
```

2. **Global mocks in tests/setup.ts:**
```typescript
// Mock Electron APIs
const mockElectronAPI = {
  getRepositoryStatus: vi.fn(),
  cloneRepository: vi.fn(),
  fetchRepository: vi.fn(),
  // ... etc
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock browser APIs
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// localStorage mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Auto-clear after each test
afterEach(() => {
  vi.clearAllMocks();
});
```

3. **Mock Service Worker (MSW) for API mocking:**
```typescript
// tests/msw-setup.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const githubHandlers = [
  rest.get('https://api.github.com/user', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      login: 'testuser',
      id: 12345,
      // ...
    }));
  }),
  // ... more handlers
];

export const server = setupServer(...githubHandlers);

// Helper functions for test control
export const resetHandlers = () => {
  server.resetHandlers(...githubHandlers);
};

export const simulateApiError = (endpoint: string, status: number = 500) => {
  server.use(
    rest.get(endpoint, (req, res, ctx) => {
      return res(ctx.status(status), ctx.json({ message: 'API Error' }));
    })
  );
};

export const simulateRateLimit = () => {
  server.use(
    rest.get('https://api.github.com/*', (req, res, ctx) => {
      return res(ctx.status(403), ctx.json({
        message: 'API rate limit exceeded',
      }));
    })
  );
};
```

**What to Mock:**
- External dependencies (APIs, file system operations)
- Electron IPC APIs
- Browser APIs (localStorage, IntersectionObserver, ResizeObserver)
- Simple-git Git operations
- Octokit GitHub client

**What NOT to Mock:**
- Core business logic (GitService, RepositoryStore)
- State management (Zustand stores, unless testing store interactions)
- Component rendering (use render from @testing-library/react)
- User interactions (use userEvent or fireEvent from @testing-library)

## Fixtures and Factories

**Test Data:**

Located in `tests/fixtures/` directory. Example from msw-setup:
```typescript
// Inline mock data in tests
const mockStatus = {
  files: [
    { path: 'src/test.ts', working_dir: 'M', index: ' ' }
  ],
  current: 'main',
  tracking: 'origin/main',
  ahead: 0,
  behind: 0,
};

// API response fixtures
{
  id: 1,
  name: 'test-repo',
  full_name: 'testuser/test-repo',
  description: 'A test repository',
  private: false,
  clone_url: 'https://github.com/testuser/test-repo.git',
  default_branch: 'main',
  updated_at: '2023-01-01T00:00:00Z',
}
```

**Location:**
- Inline fixtures within test files for unit tests
- MSW handlers in `tests/msw-setup.ts` for API responses
- Shared mock handlers in `tests/mocks/` directory

## Coverage

**Requirements:**
- Overall coverage threshold: 80% (statements, branches, functions, lines)
- All metrics must meet 80% minimum

**Configuration in vitest.config.ts:**
```typescript
coverage: {
  provider: 'c8',
  reporter: ['text', 'html', 'json'],
  exclude: [
    'node_modules/',
    'dist/',
    'tests/',
    'src/main/main.ts',
    'src/main/preload.ts',
    '**/*.d.ts'
  ],
  thresholds: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  }
}
```

**View Coverage:**
```bash
npm run test:coverage       # Generate HTML, JSON, LCOV reports
# Reports available in coverage/ directory
```

## Test Types

**Unit Tests:**
- Scope: Individual services and components in isolation
- Location: `tests/unit/renderer/` and `tests/unit/main/`
- Approach: Mock external dependencies, test single responsibility
- Example: `GitService.test.ts` tests individual git operations

**Integration Tests:**
- Scope: API integration and IPC communication between main/renderer
- Location: `tests/integration/api/` and `tests/integration/ipc/`
- Approach: Use MSW for API mocking, test realistic workflows
- Example: `GitHubService.test.ts` tests end-to-end GitHub API usage including error scenarios

**E2E Tests:**
- Framework: Playwright 1.55.0
- Location: `tests/e2e/`
- Command: `npm run test:e2e`
- Scope: Full application workflows from user perspective

**Configuration Tests:**
- Location: `tests/integration/config/`
- Verify: Path aliases, vitest configurations, test environments work correctly

## Common Patterns

**Async Testing:**
```typescript
// Using async/await with expect
test('GitService can fetch and pull updates', async () => {
  mockGit.fetch.mockResolvedValue('');
  mockGit.pull.mockResolvedValue({
    summary: { changes: 5, insertions: 20, deletions: 3 }
  });

  const gitService = new GitService();
  const fetchResult = await gitService.fetchRepository('/test/repo');
  const pullResult = await gitService.pullRepository('/test/repo');

  expect(fetchResult).toBeDefined();
  expect(pullResult.summary.changes).toBe(5);
});

// Error rejection testing
await expect(gitService.fetchRepository('/test/repo'))
  .rejects.toThrow('Network timeout');
```

**Component Testing with React Testing Library:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('button renders with correct text', async () => {
  const { Button } = await import('@renderer/components/Button');
  render(<Button>Click me</Button>);

  const buttonElement = screen.getByRole('button');
  expect(buttonElement).toBeInTheDocument();
  expect(buttonElement).toHaveTextContent('Click me');
});

test('button calls onClick when clicked', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);

  const buttonElement = screen.getByRole('button');
  fireEvent.click(buttonElement);

  expect(handleClick).toHaveBeenCalledTimes(1);
});

test('button supports keyboard navigation', async () => {
  const handleClick = vi.fn();
  const user = userEvent.setup();

  render(<Button onClick={handleClick}>Keyboard Button</Button>);

  const buttonElement = screen.getByRole('button');
  buttonElement.focus();

  await user.keyboard('{Enter}');
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

**API Error Testing:**
```typescript
test('GitHubService handles authentication errors', async () => {
  simulateApiError('https://api.github.com/user', 401);

  const service = new GitHubService('invalid-token');

  await expect(service.getCurrentUser())
    .rejects.toThrow(/authentication/i);
});

test('GitHubService handles rate limiting', async () => {
  simulateRateLimit();

  const service = new GitHubService('fake-token');

  await expect(service.getCurrentUser())
    .rejects.toThrow(/rate limit/i);
});
```

**TDD Pattern - Expected Failures:**
Tests use try-catch to handle import failures during TDD, allowing tests to fail gracefully when implementation doesn't exist yet:
```typescript
test('button renders with correct text', async () => {
  try {
    const { Button } = await import('@renderer/components/Button');
    // test assertions
  } catch (error) {
    expect.fail(`Button component not implemented yet - this failure is expected in TDD: ${error}`);
  }
});
```

## Pre-commit & CI Testing

**Hooks:** Husky pre-commit hooks run unit tests automatically before commits

**CI Pipeline:** Full test suite runs on pre-push to main/develop branches

**Commands in package.json:**
```json
"test": "npm run test:unit && npm run test:integration",
"test:unit": "concurrently \"vitest run --config vitest.config.ts\" \"vitest run --config vitest.config.main.ts\"",
"test:integration": "vitest run --config vitest.config.ts tests/integration",
"test:e2e": "playwright test"
```

---

*Testing analysis: 2026-02-21*
