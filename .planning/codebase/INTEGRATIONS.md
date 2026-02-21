# External Integrations

**Analysis Date:** 2026-02-21

## APIs & External Services

**GitHub API:**
- Service: GitHub REST API v3
- What it's used for: Repository management, user authentication, pull requests, issues, workflow runs
- SDK/Client: `@octokit/rest` 20.0.2
- Auth: OAuth 2.0 Device Flow with GitHub (Client ID: 178c6fc778ccc68e1d6a)
- Implementation: `src/main/services/githubService.ts`
- Scopes: `repo`, `user:email`, `workflow`
- IPC Handlers:
  - `github-auth` - Store GitHub token
  - `github-user` - Fetch authenticated user
  - `github-repos` - List user repositories (up to 100, sorted by updated)
  - `github-pull-requests` - Fetch open PRs for repo
  - `github-issues` - Fetch open issues for repo
  - `github-create-pr` - Create new pull request
  - `github-workflow-runs` - Fetch GitHub Actions workflow runs
  - `github-oauth-start` - Initiate device flow authentication
  - `github-logout` - Clear GitHub token

**Anthropic Claude API:**
- Service: Claude API for diagram generation and context extraction
- What it's used for: Generate diagrams from repository code, extract repository context with token counting
- SDK/Client: `@anthropic-ai/sdk` 0.59.0
- Auth: API key configured in main process
- Token Counting: `tiktoken` 1.0.22 for Claude token tracking
- Implementation:
  - `src/main/services/diagramGeneratorService.ts` - V1 diagram generation
  - `src/main/services/diagramGeneratorServiceV2.ts` - V2 with improved prompts
  - `src/main/services/contextExtractorService.ts` - File extraction with token budget
  - `src/main/services/contextExtractorServiceV2.ts` - V2 context extraction
  - `src/main/services/tokenCounterService.ts` - Token counting utilities
  - `src/main/services/rateLimiterService.ts` - Rate limiting for API calls

## Data Storage

**Databases:**
- SQLite (better-sqlite3 11.10.0):
  - Database: `diagram_cache.db` in user data directory
  - Client: `better-sqlite3`
  - Purpose: Cache diagram generation results and metadata
  - Location: `src/main/services/cacheService.ts`
  - Features: WAL mode for concurrency, foreign key constraints
  - Tables: DiagramCacheEntry (repo_path, diagram_type, diagram_content, model_used, prompt_version, tokens_used, generation_cost, access_count, timestamps)

**Persistent Storage:**
- electron-store 8.1.0:
  - GitHub token: `github-token` key
  - User data: `github-user` object
  - Auth method: `github-auth-method` (device or token)
  - Diagram settings: custom diagram preferences
  - Workspace data: workspace organization and repository selections
  - Locations: Main process stores (`src/main/main.ts`, `src/main/services/githubService.ts`, `src/main/services/diagramGeneratorServiceV2.ts`)

**File Storage:**
- Local filesystem only (git repositories)
- Cache directory: `[userData]/cache/` for SQLite database
- No external file storage service

**Caching:**
- Multi-layer caching:
  1. Memory cache via React Query (`@tanstack/react-query`)
  2. SQLite diagram cache with hit/miss tracking
  3. Cache Service (`src/main/services/cacheService.ts`) with automatic expiration (7 days default)
  4. Cache statistics tracking (totalEntries, hitRate, avgTokensUsed, totalCost)

## Authentication & Identity

**Auth Provider:**
- Custom OAuth 2.0 Device Flow with GitHub
- Implementation: `src/main/services/githubService.ts`
- Method: GitHub Device Flow (lines 35-302)
  1. User initiates auth via `github-oauth-start` IPC handler
  2. Opens browser to GitHub verification URL with user code
  3. Polls `https://github.com/login/oauth/access_token` until user authorizes
  4. Implements exponential backoff (slow_down response handling)
  5. Stores token and user data in electron-store
  6. Token persisted across app restarts

## Git Integration

**Git Operations:**
- Tool: simple-git 3.22.0
- Implementation: `src/main/services/gitService.ts`
- IPC Handlers for all git operations:
  - Repository management: status, fetch, pull, push, clone
  - Branch operations: list branches, checkout, create branch, delete branch
  - Commit operations: commit, add files, reset files, view log
  - Diff viewing: standard diffs and new file detection
  - Remotes: get remote configuration
  - Advanced: line-level revert functionality
- Security: Path traversal validation for all file operations

## Diagram Generation

**PlantUML Integration:**
- Service: PlantUML diagram generation (local or cloud)
- SDK: `node-plantuml` 0.9.0 + `plantuml-encoder` 1.4.0
- Implementation: `src/main/services/plantUmlService.ts`
- Purpose: Convert architecture descriptions to visual diagrams

## Monitoring & Observability

**Error Tracking:**
- Not integrated - errors logged to console in development

**Logs:**
- Development: Console output
- Production: No persistent logging configured
- Debugging: Electron DevTools available in dev mode

## Testing Infrastructure

**API Mocking:**
- MSW (Mock Service Worker) 2.11.3 for mocking GitHub API calls in tests
- Mock setup: `tests/msw-setup.ts`
- Mocks in test files: `tests/integration/mocks/`

**Test Doubles:**
- Electron API mocking: `tests/setup.ts` provides electronAPI mock
- IPC mocking: `tests/integration/mocks/ipc-mock.test.ts`
- Browser APIs mocked: IntersectionObserver, ResizeObserver, matchMedia, localStorage

## CI/CD & Deployment

**Hosting:**
- Desktop application packaged by electron-builder
- Target platforms: macOS (DMG), Windows (NSIS), Linux (AppImage)
- App ID: `com.reef.app`
- Product Name: `Reef`

**CI Pipeline:**
- GitHub Actions runners: ubuntu-latest, macos-latest, windows-latest
- Build matrix: Node.js 18 and 20
- Status checks:
  - ESLint linting
  - TypeScript type checking
  - Unit tests (Vitest)
  - Integration tests (Vitest)
  - E2E tests (Playwright)
  - Security audit (npm audit --audit-level=moderate)
  - Dependency vulnerability checks (OSSF Scorecard)
  - Coverage reporting (Codecov integration)

**Build Pipeline:**
- Sequential: `build:main` → `build:renderer` → `build:electron`
- Vite handles renderer dev server (port 3000 in development)
- TypeScript compilation via `tsc` for main process

## Environment Configuration

**Required env vars:**
- `NODE_ENV` - Set to 'development' or 'production' (for isDev check in main.ts)
- `ANTHROPIC_API_KEY` - Claude API key (for diagram generation, if Claude features used)
- GitHub OAuth: Built-in Client ID (no env var needed)

**Secrets location:**
- GitHub token: electron-store (user data directory)
- API keys: Should be passed via environment or stored securely
- No .env files in codebase (see .gitignore)

**Codecov Token:**
- Required: `CODECOV_TOKEN` secret in GitHub Actions for coverage uploads

**Slack Webhook:**
- Optional: `SLACK_WEBHOOK` secret for failure notifications on main branch

## Webhooks & Callbacks

**Incoming:**
- None detected - application is desktop-based, not web service

**Outgoing:**
- Slack notification webhook (optional, for CI/CD failures)
- GitHub Actions integration for PR checks and coverage comments
- Codecov for coverage tracking

## Build & Platform Specifics

**macOS:**
- Category: `public.app-category.developer-tools`
- Supports: Intel and Apple Silicon (universal binary support implicit)
- Code signing: Not configured (build may require manual signing)

**Windows:**
- Target: NSIS installer

**Linux:**
- Target: AppImage format

---

*Integration audit: 2026-02-21*
