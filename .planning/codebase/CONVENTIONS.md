# Coding Conventions

**Analysis Date:** 2026-02-21

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `CommitWorkflowTab.tsx`, `MainLayout.tsx`)
- Services and utilities: PascalCase with Service suffix (e.g., `GitService.ts`, `GitHubService.ts`)
- Stores: camelCase with Store suffix (e.g., `repositoryStore.ts`, `workspaceStore.ts`)
- Test files: match source file name with `.test.ts` or `.test.tsx` suffix (e.g., `GitService.test.ts`)

**Functions:**
- camelCase for all functions and methods
- Async functions follow same convention: `loadRepositories`, `refreshStatus`, `fetchRepositoryDetails`
- Handler functions prefixed with `handle` or `on`: `handleViewDiff`, `onStageFiles`, `onCommit`
- Private methods use underscore prefix convention: `_registerHandlers`, `_getGitInstance`

**Variables:**
- camelCase for local variables and constants: `selectedRepositories`, `isLoading`, `gitStatus`
- State variables often include leading descriptors: `isLoading`, `error`, `selectedDiffFile`
- Set/state update functions in Zustand stores use `set`, `get` convention from store creators

**Types:**
- PascalCase for interfaces: `RepositoryState`, `CommitWorkflowTabProps`, `RepositoryDetailState`, `TabPreferences`
- PascalCase for type aliases: `Repository`
- Append `Props` suffix to component prop interfaces: `CommitWorkflowTabProps`

## Code Style

**Formatting:**
- No explicit .prettierrc configured; ESLint used for linting
- TypeScript strict mode enabled (`"strict": true`)
- Unused variables and parameters flagged: `"noUnusedLocals": true`, `"noUnusedParameters": true`
- Unused parameters allowed with underscore prefix pattern: `argsIgnorePattern: "^_"` in ESLint

**Linting:**
- ESLint configured with TypeScript support via `@typescript-eslint/parser`
- React and React Hooks rules enabled
- Key rules:
  - `react/react-in-jsx-scope`: off (React 18+)
  - `react/prop-types`: off (TypeScript provides type safety)
  - `@typescript-eslint/explicit-module-boundary-types`: off
  - `@typescript-eslint/no-explicit-any`: warn (discouraged but allowed)
  - `@typescript-eslint/no-unused-vars`: warn with unused parameter exclusion

**Target & Compatibility:**
- ES2022 target in tsconfig
- Modern JavaScript features used throughout
- React 18.2.0 with TypeScript strict checking

## Import Organization

**Order:**
1. External framework/library imports (React, Zustand, Lucide icons)
2. Internal absolute imports using path aliases (`@renderer`, `@main`, `@shared`, `@`)
3. Relative imports from local files (rare, mostly avoided via aliases)

**Examples from codebase:**
```typescript
// CommitWorkflowTab.tsx - External libraries first
import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Then internal components via aliases
import { EnhancedChangesPanel } from '../repository/EnhancedChangesPanel';
import { CommitComposer } from '../repository/CommitComposer';

// Then icons
import { ChevronDown, ChevronUp } from 'lucide-react';
```

```typescript
// repositoryStore.ts - External first, then internal
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Repository } from './workspaceStore';
```

**Path Aliases:**
- `@/` → `./src/` (root source)
- `@main/` → `./src/main/` (Electron main process)
- `@renderer/` → `./src/renderer/` (React renderer)
- `@shared/` → `./src/shared/` (shared code)

Aliases configured in both `tsconfig.json` and `vite.config.ts` for consistency.

## Error Handling

**Patterns:**
- Try-catch blocks wrap async operations and external API calls
- Errors cast to `(error as Error)` for type safety in catch blocks
- Error messages are descriptive and contextual: `Failed to get repository status: ${(error as Error).message}`
- Console logging used for errors: `console.error('Failed to refresh status:', error)`
- IPC handlers throw new Error with context: `throw new Error(\`Git command failed: ${(error as Error).message}\`)`

**Example from GitService.ts:**
```typescript
ipcMain.handle('git-status', async (_, repoPath: string) => {
  try {
    const git = this.getGitInstance(repoPath);
    const status = await git.status();
    return {
      ahead: status.ahead,
      behind: status.behind,
      // ... property mapping
    };
  } catch (error) {
    throw new Error(`Failed to get repository status: ${(error as Error).message}`);
  }
});
```

**Path Security:**
- Path traversal validation on file operations
- Paths normalized and checked for `..` and absolute paths
- Resolved paths verified to be within repository bounds

## Logging

**Framework:** Console API (no centralized logging framework)

**Patterns:**
- `console.log()` for informational messages
- `console.error()` for errors during operations
- Minimal logging in production code, focused on failures
- App.tsx shows IPC event listening logged to console

**Examples:**
```typescript
console.error(`Failed to refresh repository ${id}:`, error);
console.error('Failed to fetch repository details:', error);
console.error('Failed to revert lines:', error);
console.log('Add repository triggered');
```

## Comments

**When to Comment:**
- Complex logic paths with conditional flows
- Security considerations (path traversal prevention)
- TODO items for future improvements
- Intent for non-obvious transformations

**Example from GitService.ts:**
```typescript
// Validate file path to prevent path traversal attacks
const normalizedFile = path.normalize(file);
if (normalizedFile.includes('..') || path.isAbsolute(normalizedFile)) {
  throw new Error('Invalid file name: path traversal attempt detected');
}

// For new/untracked files, show the entire file as additions
// Create a unified diff format for the new file
```

**JSDoc/TSDoc:**
- Minimal usage; TypeScript interfaces and types provide documentation
- Component prop interfaces serve as self-documenting API contracts
- No explicit JSDoc comments observed in production code

## Function Design

**Size:** Functions generally kept to single responsibility; methods in services vary from 10-30 lines

**Parameters:**
- Explicit parameter typing in all functions
- Optional parameters use `?:` notation: `options?: any`, `file?: string`
- Complex parameter objects extracted to interfaces

**Return Values:**
- Explicit return types required by TypeScript strict mode
- Promises used for async operations: `Promise<void>`, `Promise<string>`, `Promise<any>`
- Generic types used for collection returns: `Repository[]`, `TabPreferences`

**Example function signature:**
```typescript
async stageFiles(repoPath: string, files: string[]): Promise<void>
async getDiff(repoPath: string, file?: string): Promise<string>
async fetchRepositoryDetails(id: string): Promise<void>
```

## Module Design

**Exports:**
- Default exports used for single-purpose modules (e.g., components, services)
- Named exports used for utilities and types
- Class-based services use default export: `export default GitService`

**Example from repositoryStore.ts:**
```typescript
export const useRepositoryStore = create<RepositoryState>()(
  devtools(
    (set, get) => ({ ... }),
    { name: 'repository-storage' }
  )
);
```

**Barrel Files:**
- Not extensively used in current codebase
- Direct imports preferred over barrel exports for clarity

## Type System

**Any usage:**
- `@typescript-eslint/no-explicit-any`: warn (discouraged but permitted)
- `any` used in stores for flexible state: `detail: any | null`, `state?: any`
- Gradually typed as code matures; considered a warning, not error

**Generics:**
- Zustand store creation uses generics: `create<RepositoryState>()`
- React component props typed with generics: `React.FC<CommitWorkflowTabProps>`
- Collection typing: `Repository[]`, `Record<string, TabPreferences>`

## Component Patterns

**React Functional Components:**
- Functional components only; no class components
- Named exports for components: `export const CommitWorkflowTab`
- Destructured props in function signatures
- Component prop interfaces prefixed with component name + Props

**State Management:**
- Zustand stores for application state (repositories, workspaces)
- Local React state (`useState`) for component-specific UI state
- Zustand devtools integration for store debugging

**Hooks:**
- React hooks extensively used: `useEffect`, `useState`, `useRepositoryStore`
- Custom hooks from Zustand: `useRepositoryStore()`, `useWorkspaceStore()`

---

*Convention analysis: 2026-02-21*
