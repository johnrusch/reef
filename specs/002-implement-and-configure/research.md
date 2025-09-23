# Testing Framework Research

## Primary Testing Framework Selection

### Decision: Vitest
**Rationale**: 
- Native Vite integration (already used in the project)
- Excellent TypeScript support out of the box
- Fast execution with ES modules support
- Compatible with path aliases (@/, @main/, @renderer/, @shared/)
- Similar API to Jest but better suited for modern build tools
- Good support for React component testing with @testing-library/react

**Alternatives considered**:
- Jest: Popular but requires additional configuration for ES modules and path aliases with Vite
- Playwright Test: Excellent for E2E but overkill for unit/integration testing
- Node.js built-in test runner: Too minimal for React component testing needs

## React Component Testing

### Decision: @testing-library/react + @testing-library/jest-dom
**Rationale**:
- Industry standard for React component testing
- Promotes testing user behavior rather than implementation details
- Excellent accessibility testing capabilities
- Works seamlessly with Vitest
- Good support for async testing and user interactions

**Alternatives considered**:
- Enzyme: Deprecated and not maintained
- React Test Renderer: Too low-level for user behavior testing

## Electron-Specific Testing

### Decision: @electron/remote + electron-mock-ipc
**Rationale**:
- @electron/remote allows renderer tests to access main process APIs safely
- electron-mock-ipc provides clean mocking of IPC communication
- Allows testing of main/renderer communication without full Electron instance
- Compatible with headless CI environments

**Alternatives considered**:
- spectron: Deprecated by Electron team
- Running full Electron instances: Too slow for unit tests
- Custom IPC mocks: Reinventing existing solutions

## E2E Testing Strategy

### Decision: Playwright for E2E Tests
**Rationale**:
- Best-in-class Electron support with @playwright/test
- Can launch and control actual Electron application
- Supports file system interactions needed for Git testing
- Cross-platform testing capabilities
- Built-in video/screenshot capture for debugging

**Alternatives considered**:
- WebDriver: Less Electron-specific support
- Puppeteer: Primarily web browsers, limited Electron support
- Manual testing only: Not scalable for regression prevention

## Mocking Strategy

### Decision: Vitest mocks + MSW for API calls
**Rationale**:
- Vitest provides excellent built-in mocking capabilities
- MSW (Mock Service Worker) for intercepting GitHub API calls
- Can mock file system operations for Git testing
- Supports both unit test mocks and integration test scenarios

**Alternatives considered**:
- Manual fetch mocking: Too brittle and verbose
- Nock: Node.js only, doesn't work in browser environments
- JSON fixtures only: Not interactive enough for testing error scenarios

## Coverage Reporting

### Decision: Vitest coverage with c8
**Rationale**:
- Built into Vitest, no additional configuration needed
- Supports TypeScript source maps
- Accurate coverage reporting for ES modules
- Can exclude Electron main process files appropriately
- Integrates with CI/CD systems

**Alternatives considered**:
- Istanbul/nyc: Older, requires more configuration
- Manual coverage tracking: Not sustainable

## Configuration Strategy

### Decision: Separate configs for main/renderer processes
**Rationale**:
- Main process needs Node.js environment setup
- Renderer process needs DOM environment and React testing utilities
- Allows different mock strategies for each environment
- Cleaner separation of concerns

**Test Structure**:
```
tests/
├── unit/           # Fast unit tests
│   ├── main/      # Electron main process tests
│   └── renderer/  # React component tests
├── integration/   # Service integration tests
└── e2e/          # End-to-end Playwright tests
```

## Git Operations Testing

### Decision: Mock git operations + test repositories
**Rationale**:
- simple-git library provides good mocking capabilities
- Can create temporary test repositories for integration tests
- Avoids modifying real repositories during testing
- Supports testing various Git states and error conditions

## GitHub API Testing

### Decision: MSW with GitHub API schema validation
**Rationale**:
- MSW intercepts actual HTTP calls
- Can test rate limiting and error scenarios
- Validates request/response schemas against GitHub API
- Supports both success and failure testing paths

## Performance Testing

### Decision: Vitest benchmark for critical paths
**Rationale**:
- Built-in benchmarking capabilities in Vitest
- Can measure Git operation performance
- Useful for regression testing of large repository handling
- Lightweight compared to dedicated performance testing tools

**Focus areas**:
- Repository loading times
- Git status update performance
- UI responsiveness during background operations