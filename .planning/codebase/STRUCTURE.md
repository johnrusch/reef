# Codebase Structure

**Analysis Date:** 2026-02-21

## Directory Layout

```
reef/
├── src/                           # Source code
│   ├── main/                      # Electron main process
│   │   ├── main.ts               # Entry point, window setup, menu
│   │   ├── preload.ts            # Context-isolated IPC bridge
│   │   └── services/             # Service classes with IPC handlers
│   ├── renderer/                 # React application
│   │   ├── main.tsx              # React root setup
│   │   ├── App.tsx               # Root component, routing, store init
│   │   ├── pages/                # Page-level components (routes)
│   │   ├── components/           # Reusable UI components
│   │   ├── stores/               # Zustand state stores
│   │   ├── utils/                # Utility functions
│   │   └── styles/               # Global CSS
│   ├── shared/                   # Shared types
│   │   └── types/               # Type definitions for main/renderer
│   └── types/                    # Additional type definitions
├── tests/                        # Test suite
│   ├── unit/                     # Unit tests
│   │   ├── main/                 # Main process tests
│   │   └── renderer/             # Renderer process tests
│   ├── integration/              # Integration tests
│   ├── e2e/                      # End-to-end tests
│   ├── fixtures/                 # Test data
│   ├── mocks/                    # Mock implementations
│   └── utils/                    # Test utilities
├── dist/                         # Built output (dev)
├── dist-electron/                # Packaged Electron app
├── vite.config.ts                # Vite + Electron plugins config
├── tsconfig.json                 # TypeScript base config
├── tsconfig.main.json            # TypeScript main process config
├── vitest.config.ts              # Vitest renderer config
└── vitest.config.main.ts         # Vitest main process config
```

## Directory Purposes

**`src/main/`:**
- Purpose: Electron main process - manages app lifecycle, native APIs, git/github operations
- Contains: Service classes, IPC handlers, window management
- Key files: `main.ts` (entry), `preload.ts` (IPC bridge), `services/` (business logic)
- Build output: `dist/main/main.js`

**`src/main/services/`:**
- Purpose: Service classes that encapsulate domain logic and register IPC handlers
- Contains: `gitService.ts`, `githubService.ts`, `diagramGeneratorService.ts`, `cacheService.ts`, `plantUmlService.ts`, `contextExtractorService.ts`, `rateLimiterService.ts`, `tokenCounterService.ts`
- Pattern: Constructor calls `this.registerHandlers()` to expose methods via IPC

**`src/renderer/`:**
- Purpose: React UI application for user interaction
- Contains: Pages, components, state management, utilities
- Build output: `dist/renderer/` with `index.html`

**`src/renderer/pages/`:**
- Purpose: Page-level components corresponding to routes
- Contains: `Dashboard.tsx`, `RepositoryView.tsx`, `WorkspaceManager.tsx`, `Settings.tsx`
- Each page connected to Zustand stores for data and methods

**`src/renderer/components/`:**
- Purpose: Reusable UI components organized by feature
- Subdirectories:
  - `repository/` - Repository-specific components (tabs, panels, diff viewer)
  - `tabs/` - Tab content components (CommitWorkflowTab, RepositoryManagementTab, VisualMapTab)
  - `github/` - GitHub-related components
  - `layouts/` - Layout wrapper components (MainLayout)
  - `ui/` - Generic UI components (dialogs, buttons)
  - `DiagramSettings/` - Diagram configuration components
  - `DiagramViewer/` - Diagram rendering and visualization

**`src/renderer/stores/`:**
- Purpose: Zustand state management stores with persistence
- Files:
  - `repositoryStore.ts` - Repository state and Git operations
  - `workspaceStore.ts` - Workspace state and management
  - `githubStore.ts` - GitHub authentication state
- Pattern: `create<State>()(devtools((...) => {...), { name: 'storage-key' }))`

**`src/renderer/utils/`:**
- Purpose: Utility functions and helpers
- Files: `pathUtils.ts`, `platform.ts`
- Usage: Path manipulation, platform detection

**`src/shared/types/`:**
- Purpose: Shared type definitions used in both main and renderer
- Files: `diagram.ts` - Diagram options, results, extractor options
- Usage: Ensures type safety across IPC boundary

**`tests/unit/main/`:**
- Purpose: Unit tests for main process services
- Environment: Node.js
- Config: `vitest.config.main.ts`
- Pattern: Test service initialization, IPC handler functionality

**`tests/unit/renderer/`:**
- Purpose: Unit tests for React components
- Environment: jsdom
- Config: `vitest.config.ts`
- Pattern: Component rendering, hooks, store interactions

**`tests/integration/`:**
- Purpose: Integration tests for APIs and IPC communication
- Subdirectories: `api/` (API mocks), `ipc/` (IPC communication), `config/` (shared config)
- Pattern: Test end-to-end data flow

**`tests/fixtures/`:**
- Purpose: Test data and mock repository fixtures
- Usage: Seeding tests with realistic data

**`dist/` and `dist-electron/`:**
- Purpose: Build outputs
- Generated: During build process
- Not committed: Ignored in .gitignore

## Key File Locations

**Entry Points:**
- Main process: `src/main/main.ts` - Electron app initialization and window creation
- Renderer: `src/renderer/main.tsx` - React root and providers
- App component: `src/renderer/App.tsx` - Routing and store initialization

**Configuration:**
- TypeScript: `tsconfig.json` (base), `tsconfig.main.json` (main process)
- Vite: `vite.config.ts` - Electron plugins, path aliases, build config
- Vitest: `vitest.config.ts` (renderer), `vitest.config.main.ts` (main)
- Package: `package.json` - Scripts, dependencies, build config

**Core Logic:**
- Store initialization: `src/renderer/stores/*.ts` - Zustand stores
- Service registration: `src/main/main.ts` lines 24-25 - Service instantiation
- IPC bridge: `src/main/preload.ts` - Window.reef API definition
- Router setup: `src/renderer/App.tsx` lines 52-57 - Route definitions

**Testing:**
- Setup: `tests/unit/renderer/setup.ts` - Mock initialization
- Fixtures: `tests/fixtures/` - Test data
- Mocks: `tests/mocks/` and `tests/unit/mocks/` - Mock implementations

## Naming Conventions

**Files:**
- Services: `camelCaseService.ts` (e.g., `gitService.ts`, `githubService.ts`)
- Pages: `PascalCaseView.tsx` or `PascalCase.tsx` (e.g., `RepositoryView.tsx`, `Dashboard.tsx`)
- Components: `PascalCase.tsx` (e.g., `CommitComposer.tsx`, `BranchPanel.tsx`)
- Stores: `camelCaseStore.ts` (e.g., `repositoryStore.ts`)
- Utils: `camelCase.ts` (e.g., `pathUtils.ts`)
- Tests: `filename.test.ts` or `filename.spec.ts`

**Directories:**
- Feature-based: `components/repository/`, `components/tabs/`, `components/github/`
- Process-based: `main/`, `renderer/`
- Function-based: `pages/`, `components/`, `stores/`, `services/`
- Layer-based: `pages/` (routes), `components/` (UI), `stores/` (state), `utils/` (helpers)

## Where to Add New Code

**New Feature (e.g., new Git operation):**
- Backend: Add handler to `src/main/services/gitService.ts` (or create new service)
- Bridge: Add method to `ReefAPI` interface in `src/main/preload.ts`
- Frontend: Add action to `repositoryStore.ts`, create component if needed
- Tests: Add unit test in `tests/unit/main/services/gitService.test.ts` and integration test

**New Component/UI Feature:**
- Component file: `src/renderer/components/{feature}/ComponentName.tsx`
- If uses data: Add store methods to appropriate store in `src/renderer/stores/`
- Styling: Use Tailwind classes inline or add to `src/renderer/styles/globals.css` for global styles
- Tests: `tests/unit/renderer/components/{feature}/ComponentName.test.tsx`

**New Page/Route:**
- Page file: `src/renderer/pages/PageName.tsx`
- Add route in `src/renderer/App.tsx` Routes section
- Add store methods as needed
- Add navigation link in `src/renderer/components/Sidebar.tsx`

**New Store/State:**
- File: `src/renderer/stores/newFeatureStore.ts` using Zustand pattern
- Pattern: Follow existing stores (devtools middleware, persistence integration)
- Usage: Import with `useNewFeatureStore()` in components

**Utilities:**
- File: `src/renderer/utils/utilityName.ts` (renderer) or `src/main/utils/` (main)
- Export functions for reuse
- Include unit tests in `tests/unit/` with matching structure

**Shared Types:**
- File: `src/shared/types/featureName.ts`
- Export interfaces used across main/renderer boundary
- Reference in preload for IPC methods

**New Main Process Service:**
1. Create `src/main/services/newService.ts`
2. Implement service class with constructor calling `registerHandlers()`
3. Use `ipcMain.handle('channel-name', ...)` for each operation
4. Instantiate in `src/main/main.ts`
5. Add methods to `ReefAPI` in `src/main/preload.ts`
6. Add unit test in `tests/unit/main/services/newService.test.ts`

## Special Directories

**`src/main/services/` (V1 and V2):**
- Purpose: Two versions of some services for A/B testing or phased rollout
- Files: `contextExtractorService.ts` and `contextExtractorServiceV2.ts`, `diagramGeneratorService.ts` and `diagramGeneratorServiceV2.ts`
- Note: Both registered at startup for experimentation
- Status: V2 services are newer implementations

**`templates/`:**
- Purpose: Application templates (not explored in detail)
- Status: Present but role unclear from analysis

**`memory/`:**
- Purpose: Memory/context for Claude development (not code)
- Status: Project-specific reference material

**`specs/`:**
- Purpose: Specification documents for features
- Status: Used for planning and documentation

**`.planning/codebase/`:**
- Purpose: Codebase analysis documents (this directory)
- Status: Generated by analysis tools

---

*Structure analysis: 2026-02-21*
