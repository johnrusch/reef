# Testing Guide

This document provides comprehensive guidance for testing the Reef application, an Electron-based multi-repository GitHub desktop client.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Quick Start](#quick-start)
- [Test Types](#test-types)
- [Writing Tests](#writing-tests)
- [Mocking](#mocking)
- [Fixtures](#fixtures)
- [Coverage](#coverage)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

Reef uses a comprehensive testing framework designed specifically for Electron applications, with support for:

- **Unit Testing**: Individual components and services
- **Integration Testing**: IPC communication and API interactions
- **End-to-End Testing**: Complete user workflows
- **Coverage Reporting**: Code quality metrics

### Technology Stack

- **Vitest**: Primary test runner and assertion library
- **@testing-library/react**: React component testing utilities
- **Playwright**: End-to-end testing framework
- **MSW (Mock Service Worker)**: API mocking
- **c8**: Code coverage reporting

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── main/               # Electron main process tests
│   │   └── services/       # Service layer tests
│   └── renderer/           # React renderer tests
│       └── components/     # Component tests
├── integration/            # Integration tests
│   ├── api/               # GitHub API integration
│   ├── config/            # Configuration validation
│   ├── ipc/               # IPC communication
│   └── mocks/             # Mock integration tests
├── e2e/                   # End-to-end tests
├── contract/              # Contract/API tests
├── fixtures/              # Test data and fixtures
│   ├── api-responses.ts   # GitHub API response fixtures
│   └── git-repos.ts       # Git repository fixtures
├── mocks/                 # Mock implementations
│   ├── electron.ts        # Electron API mocks
│   ├── git.ts            # Git operations mocks
│   ├── github-handlers.ts # GitHub API handlers
│   └── ipc.ts            # IPC communication mocks
├── utils/                 # Testing utilities
│   ├── component-utils.ts # Component testing helpers
│   └── async-utils.ts     # Async operation helpers
├── setup.ts              # Global test setup
└── msw-setup.ts          # MSW configuration
```

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only (fast feedback)
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run tests in watch mode (development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Writing Your First Test

#### React Component Test

```typescript
// tests/unit/renderer/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@renderer/components/Button';

test('button renders with correct text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});

test('button calls onClick when clicked', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### Service Test

```typescript
// tests/unit/main/services/GitService.test.ts
import { GitService } from '@main/services/GitService';
import { vi } from 'vitest';

// Mock simple-git
vi.mock('simple-git', () => ({
  default: () => ({
    status: vi.fn().mockResolvedValue({ files: [] }),
    branch: vi.fn().mockResolvedValue({ current: 'main' })
  })
}));

test('GitService returns repository status', async () => {
  const gitService = new GitService();
  const status = await gitService.getStatus('/path/to/repo');
  
  expect(status).toBeDefined();
  expect(status.files).toEqual([]);
});
```

## Test Types

### Unit Tests

Test individual components or functions in isolation.

**Locations:**
- `tests/unit/main/` - Main process services
- `tests/unit/renderer/` - React components and hooks

**Environment:**
- Main process: Node.js environment
- Renderer: jsdom environment with React Testing Library

**Example:**
```typescript
test('should format repository name correctly', () => {
  const formatted = formatRepoName('user', 'repo-name');
  expect(formatted).toBe('user/repo-name');
});
```

### Integration Tests

Test interactions between components, services, and external systems.

**Locations:**
- `tests/integration/api/` - GitHub API integration
- `tests/integration/ipc/` - IPC communication
- `tests/integration/config/` - Configuration validation

**Example:**
```typescript
test('IPC communication between main and renderer', async () => {
  const result = await ipcRenderer.invoke('git:status', '/repo/path');
  expect(result.success).toBe(true);
  expect(result.data).toHaveProperty('files');
});
```

### End-to-End Tests

Test complete user workflows using the actual application.

**Location:** `tests/e2e/`

**Example:**
```typescript
test('user can add and view repository', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="add-repo-button"]');
  await page.fill('[data-testid="repo-path-input"]', '/path/to/repo');
  await page.click('[data-testid="confirm-add-button"]');
  
  await expect(page.locator('[data-testid="repo-list"]')).toContainText('repo');
});
```

### Contract Tests

Validate API contracts and npm script interfaces.

**Location:** `tests/contract/`

**Purpose:**
- Ensure npm scripts work correctly
- Validate API response schemas
- Test configuration loading

## Writing Tests

### Test Organization

#### Test File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.test.ts`
- E2E tests: `*.spec.ts`

#### Test Structure
Follow the AAA pattern (Arrange, Act, Assert):

```typescript
test('should handle user input correctly', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<InputComponent />);
  
  // Act
  await user.type(screen.getByRole('textbox'), 'test input');
  
  // Assert
  expect(screen.getByDisplayValue('test input')).toBeInTheDocument();
});
```

### Best Practices

1. **Test Behavior, Not Implementation**
   ```typescript
   // Good: Tests user interaction
   fireEvent.click(screen.getByRole('button', { name: 'Save' }));
   
   // Bad: Tests implementation details
   wrapper.find('.save-button').simulate('click');
   ```

2. **Use Descriptive Test Names**
   ```typescript
   // Good
   test('should display error message when form submission fails');
   
   // Bad
   test('error test');
   ```

3. **Group Related Tests**
   ```typescript
   describe('UserProfile Component', () => {
     describe('when user is logged in', () => {
       test('should display user name');
       test('should show logout button');
     });
     
     describe('when user is not logged in', () => {
       test('should show login prompt');
     });
   });
   ```

4. **Clean Up After Tests**
   ```typescript
   afterEach(() => {
     vi.clearAllMocks();
     cleanup(); // React Testing Library cleanup
   });
   ```

## Mocking

### Electron APIs

Use the provided Electron mocks:

```typescript
import { setupElectronMocks } from '../mocks/electron';

beforeEach(() => {
  setupElectronMocks();
});
```

### Git Operations

```typescript
import { setupGitMocks, createGitFromFixture } from '../mocks/git';

beforeEach(() => {
  setupGitMocks();
});

test('should handle dirty repository', () => {
  const mockGit = createGitFromFixture('dirtyRepo');
  // Test with dirty repository state
});
```

### GitHub API

```typescript
import { server } from '../msw-setup';
import { rest } from 'msw';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('should handle API error', async () => {
  server.use(
    rest.get('https://api.github.com/user', (req, res, ctx) => {
      return res(ctx.status(401), ctx.json({ message: 'Unauthorized' }));
    })
  );
  
  // Test error handling
});
```

### IPC Communication

```typescript
import { mockIPCRenderer, createIPCErrorMock } from '../mocks/ipc';

test('should handle IPC error', async () => {
  createIPCErrorMock('git:status', 'unauthorized');
  
  await expect(electronAPI.getRepositoryStatus('/repo'))
    .rejects.toThrow('unauthorized');
});
```

## Fixtures

### Git Repository Fixtures

```typescript
import { createTempRepo, gitRepoFixtures } from '../fixtures/git-repos';

test('should work with clean repository', async () => {
  const repo = await createTempRepo('test-repo', { 
    fixture: 'cleanRepo' 
  });
  
  // Test with clean repository
  
  await repo.cleanup();
});
```

### API Response Fixtures

```typescript
import { userFixtures, repositoryFixtures } from '../fixtures/api-responses';

test('should display user information', () => {
  const user = userFixtures.validUser;
  render(<UserProfile user={user} />);
  
  expect(screen.getByText(user.name)).toBeInTheDocument();
});
```

## Coverage

### Requirements

- **Overall**: 80% minimum (statements, branches, functions, lines)
- **Critical Services**: 85-90% coverage
- **Utilities**: 90% coverage

### Generating Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Configuration

Coverage is configured in `vitest.config.ts` and `coverage.config.js`:

- Excludes test files, node_modules, dist directories
- Includes type definitions exclusion
- Separate thresholds for different file types

### Interpreting Results

- **Statements**: Lines of code executed
- **Branches**: Conditional paths taken
- **Functions**: Functions called
- **Lines**: Physical lines executed

Focus on uncovered branches and functions for meaningful improvements.

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Multiple Node.js versions (18, 20)
- Multiple OS (Ubuntu, macOS, Windows)

### Pre-commit Hooks

Husky runs these checks before each commit:
- ESLint
- TypeScript type checking
- Unit tests

### Pre-push Hooks

Additional checks before pushing:
- Full test suite (for main/develop)
- Coverage verification
- Build verification

## Troubleshooting

### Common Issues

#### Tests Not Running
```bash
# Check Node.js version
node --version  # Should be 18 or 20

# Clear cache
npm run test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Import Path Issues
- Verify path aliases in `vitest.config.ts`
- Check TypeScript configuration
- Ensure consistent alias usage

#### Mocking Issues
```typescript
// Ensure mocks are set up before imports
vi.mock('module-name', () => ({ ... }));
import { ComponentToTest } from './component';
```

#### Async Test Issues
```typescript
// Use proper async/await
test('async operation', async () => {
  await waitFor(() => {
    expect(screen.getByText('Result')).toBeInTheDocument();
  });
});
```

### Environment Issues

#### Electron Environment
- Main process tests run in Node.js environment
- Renderer tests run in jsdom environment
- E2E tests run in actual Electron app

#### Path Resolution
- Use absolute imports with aliases
- Avoid relative paths in tests
- Configure path mapping consistently

### Performance Tips

1. **Use `test:unit` for development** - Faster feedback
2. **Run specific tests**: `npm test -- Button.test.tsx`
3. **Use `test:watch`** - Automatic re-running
4. **Parallel execution** - Tests run in parallel by default

### Getting Help

1. Check the console output for specific error messages
2. Review test configuration files
3. Examine similar working tests for patterns
4. Use `console.log` for debugging (remove before committing)

## Advanced Topics

### Custom Testing Utilities

Create reusable testing utilities in `tests/utils/`:

```typescript
// Component testing utilities
export const renderWithProviders = (ui: ReactElement) => {
  return render(ui, { wrapper: TestProviders });
};

// Async testing utilities
export const waitForAsyncOperation = async (operation: () => Promise<any>) => {
  return promiseUtils.withTimeout(operation(), 5000);
};
```

### Performance Testing

```typescript
test('should complete operation within time limit', async () => {
  const startTime = performance.now();
  await performOperation();
  const duration = performance.now() - startTime;
  
  expect(duration).toBeLessThan(1000); // 1 second
});
```

### Visual Regression Testing

For E2E tests, use Playwright's screenshot comparison:

```typescript
test('should match visual design', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png');
});
```

### Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should be accessible', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

For more information about specific testing patterns or troubleshooting, refer to the individual tool documentation:

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)