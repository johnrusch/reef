# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reef is an Electron-based multi-repository GitHub desktop client built with React, TypeScript, and Vite. It enables developers to manage multiple GitHub repositories simultaneously through a unified interface.

## Development Commands

### Essential Commands
- `npm run dev` - Start development with hot reload (runs both main and renderer processes)
- `npm run build` - Build for production (builds main, renderer, then Electron)
- `npm run start` - Start the built application
- `npm run lint` - Run ESLint on .ts and .tsx files
- `npm run typecheck` - Run TypeScript type checking without emitting files

### Testing Commands
- `npm test` - Run all tests (unit, integration, and E2E)
- `npm run test:unit` - Run unit tests only (fast feedback)
- `npm run test:integration` - Run integration tests
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:watch` - Run tests in watch mode for development
- `npm run test:coverage` - Generate coverage report

### Testing Framework Details
The project uses a comprehensive testing framework setup:

#### Test Structure
- `tests/unit/` - Unit tests for components and services
  - `tests/unit/main/` - Electron main process tests (Node.js environment)
  - `tests/unit/renderer/` - React component tests (jsdom environment)
- `tests/integration/` - Integration tests for APIs and IPC communication
- `tests/e2e/` - End-to-end tests using Playwright
- `tests/fixtures/` - Test data and repository fixtures
- `tests/mocks/` - Mock implementations for external dependencies
- `tests/utils/` - Testing utilities and helpers

#### Testing Tools
- **Vitest**: Primary test runner for unit and integration tests
- **@testing-library/react**: React component testing utilities
- **Playwright**: End-to-end testing framework
- **MSW (Mock Service Worker)**: API mocking for GitHub integration
- **c8**: Code coverage reporting

#### Coverage Requirements
- Overall coverage: 80% minimum (statements, branches, functions, lines)
- Critical services: 85-90% coverage requirement
- Utilities and helpers: 90% coverage requirement
- Coverage reports generated in HTML, JSON, and LCOV formats

#### Pre-commit Testing
- Husky pre-commit hooks run unit tests automatically
- ESLint and TypeScript type checking before each commit
- Full test suite runs on pre-push to main/develop branches

### Build Commands
- `npm run build:main` - Build Electron main process only
- `npm run build:renderer` - Build React renderer process only
- `npm run build:electron` - Package with electron-builder

### Development Process Commands
- `npm run dev:main` - Watch and compile main process TypeScript
- `npm run dev:renderer` - Start Vite dev server for renderer

## Architecture

### Process Architecture
The application follows Electron's multi-process architecture:
- **Main Process** (`src/main/`): Manages application lifecycle, native APIs, and IPC communication
- **Renderer Process** (`src/renderer/`): React application for the UI
- **Preload Script** (`src/main/preload.ts`): Bridge between main and renderer with context isolation

### Key Services
- **GitService** (`src/main/services/gitService.ts`): Handles Git operations using simple-git
- **GitHubService** (`src/main/services/githubService.ts`): GitHub API integration using Octokit

### State Management
- **Zustand stores** in `src/renderer/stores/`:
  - `repositoryStore.ts`: Repository management and selection
  - `workspaceStore.ts`: Workspace organization and persistence

### IPC Communication Pattern
The app uses Electron's IPC for main-renderer communication through the preload script with context isolation enabled for security.

### Path Aliases
TypeScript path aliases configured in both `tsconfig.json` and `vite.config.ts`:
- `@/` → `./src/`
- `@main/` → `./src/main/`
- `@renderer/` → `./src/renderer/`
- `@shared/` → `./src/shared/`

## Technology Stack
- **Electron 28** for cross-platform desktop app
- **React 18** with TypeScript for UI
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Zustand** for state management
- **simple-git** for Git operations
- **Octokit** for GitHub API
- **React Query** for data fetching
- **Radix UI** for accessible UI components
- **Vitest** for unit and integration testing
- **@testing-library/react** for React component testing
- **Playwright** for end-to-end testing

## Build Configuration
- Output directory: `dist-electron/` for packaged apps
- Main process output: `dist/main/`
- Renderer output: `dist/renderer/`
- Preload output: `dist/preload/`
- Dev server runs on port 3000

## Key Features to Maintain
- Multi-repository management with workspace grouping
- Batch Git operations across repositories
- Real-time repository status indicators
- GitHub integration with secure token storage (electron-store)
- Cross-repository search capabilities
- Dark theme interface optimized for developers