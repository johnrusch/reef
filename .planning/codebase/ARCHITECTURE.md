# Architecture

**Analysis Date:** 2026-02-21

## Pattern Overview

**Overall:** Multi-process Electron application with separated Main and Renderer processes, using IPC for communication with context isolation enabled for security.

**Key Characteristics:**
- Electron multi-process architecture with preload script bridge
- Zustand stores for centralized React state management
- Service-based pattern in main process with IPC registration
- React Router for page-level navigation in renderer
- TypeScript with strict mode throughout
- Path aliases for clean imports (`@/`, `@main/`, `@renderer/`, `@shared/`)

## Layers

**Main Process (Electron Native):**
- Purpose: Manages application lifecycle, native APIs, and Git/GitHub operations
- Location: `src/main/`
- Contains: Service classes that register IPC handlers, window management
- Depends on: `simple-git`, `@octokit/rest`, `electron-store`, Electron APIs
- Used by: Renderer process through IPC bridge (preload script)

**Preload Script (Bridge):**
- Purpose: Secure context-isolated bridge between renderer and main process
- Location: `src/main/preload.ts`
- Contains: `ReefAPI` interface exposed to window.reef, all IPC method definitions
- Depends on: Electron contextBridge and ipcRenderer
- Used by: React components and Zustand stores

**Renderer Process (React UI):**
- Purpose: User interface and interaction layer
- Location: `src/renderer/`
- Contains: Pages, components, stores, hooks, and utilities
- Depends on: React, React Router, Zustand, React Query, Tailwind CSS
- Used by: Electron to display application UI

**Shared Types:**
- Purpose: Shared type definitions for main/renderer communication
- Location: `src/shared/types/`
- Contains: Interfaces for Diagram operations, Extractor options
- Depends on: None
- Used by: Both main and renderer processes

## Data Flow

**Repository State Management:**

1. App boots → `App.tsx` calls `loadWorkspaces()` and `loadRepositories()` from Zustand stores
2. Zustand stores load data from `electron-store` (persistent storage) via IPC
3. Stores initialized with repositories and workspace data
4. User navigates to repository → `RepositoryView` calls `fetchRepositoryDetails()`
5. `fetchRepositoryDetails()` uses IPC to call git operations in main process
6. Main process `GitService` executes git commands via `simple-git`
7. Results returned through IPC and stored in Zustand `detail` state
8. Components subscribe to store and re-render

**Git Operations:**

1. Component calls store method (e.g., `commitChanges()`)
2. Store method invokes `window.reef.git.commit()`
3. Preload bridges to `ipcRenderer.invoke('git-commit', ...)`
4. Main process `GitService` handler executes command
5. Result returned back through IPC chain
6. Store updates detail state, triggering re-render

**State Management:**

- Workspaces: `workspaceStore` (Zustand) → persistent in `electron-store`
- Repositories: `repositoryStore` (Zustand) → persistent in `electron-store`
- Repository Details: `repositoryStore.detail` object with status, branches, commits
- GitHub: `githubStore` (Zustand) → OAuth token stored in `electron-store`
- UI State: Transient tab selections, loading states, error messages

## Key Abstractions

**Service Classes (Main Process):**
- Purpose: Encapsulate IPC handler registration and business logic
- Examples: `GitService`, `GitHubService`, `DiagramGeneratorService`, `CacheService`
- Pattern: Constructor registers IPC handlers using `ipcMain.handle()`, methods are private

**Zustand Stores:**
- Purpose: Centralized React state with persistence integration
- Examples: `repositoryStore`, `workspaceStore`, `githubStore`
- Pattern: `create<State>()(devtools(...))` with Electron store read/write in async methods

**IPC Bridge Pattern:**
- Purpose: Secure type-safe communication between processes
- Pattern: Preload script defines `ReefAPI` interface, exports to `window.reef`, components call methods

**Tab System:**
- Purpose: Multi-view interface for repository details
- Tabs: Commit Workflow, Repository Management, Visual Map (beta)
- State: `activeTab` stored in `repositoryStore`, persistent per session

## Entry Points

**Main Process:**
- Location: `src/main/main.ts`
- Triggers: App startup via `app.whenReady()`
- Responsibilities: Window creation, menu setup, service initialization, Electron lifecycle management

**Renderer Process:**
- Location: `src/renderer/main.tsx`
- Triggers: Preload script loads renderer
- Responsibilities: React root initialization, provider setup (QueryClient, Router, QueryClientProvider)

**Application Root Component:**
- Location: `src/renderer/App.tsx`
- Triggers: After main.tsx mounts React
- Responsibilities: Initial store loading, route setup, IPC event listeners

**Page Entry Points:**
- `Dashboard` (path `/`) - Repository grid and statistics
- `RepositoryView` (path `/repository/:id`) - Detailed repository operations
- `WorkspaceManager` (path `/workspaces`) - Workspace CRUD
- `Settings` (path `/settings`) - Application preferences

## Error Handling

**Strategy:** Try-catch in service handlers with descriptive error messages, propagated through IPC to store, displayed to user via UI state

**Patterns:**
- Main process services throw errors with context: `throw new Error(`Failed to fetch: ${(error as Error).message}`)`
- Store methods wrap in try-catch and set `error` state
- Components check `error` state and display ConfirmDialog or error indicators
- Async operations use `Promise.allSettled()` to handle partial failures in batch operations

## Cross-Cutting Concerns

**Logging:** Console.log throughout, no structured logging framework yet

**Validation:** Component-level validation in forms, basic checks in store methods, no centralized validation schema

**Authentication:** GitHub OAuth via device flow in `GitHubService`, token stored in `electron-store`, accessible via `githubStore`

**Persistence:** `electron-store` for all persistent data (repositories, workspaces, tokens, settings), accessed through IPC handlers

**Rate Limiting:** `rateLimiterService` in main process for GitHub API calls

**Caching:** `cacheService` for diagram generation and context extraction results

---

*Architecture analysis: 2026-02-21*
