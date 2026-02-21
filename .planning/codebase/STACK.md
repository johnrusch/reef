# Technology Stack

**Analysis Date:** 2026-02-21

## Languages

**Primary:**
- TypeScript 5.3.3 - Used for all main and renderer processes, provides type safety across Electron app
- JavaScript - Configuration files, build scripts

**Secondary:**
- HTML/CSS - Electron UI structure and styling via Tailwind

## Runtime

**Environment:**
- Node.js 18+ (minimum, tested against 18 and 20 in CI)
- Electron 38.1.2 - Cross-platform desktop application framework

**Package Manager:**
- npm 9+ (implied by Node 18+)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.2.0 - UI framework for renderer process
- Electron 38.1.2 - Desktop application framework with main and renderer process architecture

**Build & Dev:**
- Vite 6.3.6 - Fast build tool and dev server for renderer process (runs on port 3000)
- electron-builder 24.9.1 - Package Electron apps for production distribution
- vite-plugin-electron 0.15.5 - Vite integration for Electron main process
- vite-plugin-electron-renderer 0.14.5 - Vite plugin for Electron renderer optimization
- TypeScript 5.3.3 - Type checking and compilation

**Testing:**
- Vitest 3.2.4 - Unit and integration test runner (jsdom for renderer, node for main)
- @testing-library/react 16.3.0 - React component testing utilities
- @testing-library/jest-dom 6.8.0 - DOM matchers for assertions
- @testing-library/user-event 14.6.1 - User interaction simulation
- Playwright 1.55.0 - End-to-end testing framework (targets Electron and Desktop Chrome)
- c8 10.1.3 - Code coverage reporting (text, html, json, lcov formats)
- jsdom 26.1.0 - DOM implementation for Vitest renderer tests
- @types/node 20.11.5 - Node.js type definitions

**Styling:**
- Tailwind CSS 3.4.1 - Utility-first CSS framework
- autoprefixer 10.4.16 - PostCSS plugin for vendor prefixes
- postcss 8.4.33 - CSS transformation tool
- class-variance-authority 0.7.0 - Type-safe component variant management
- tailwind-merge 2.2.0 - Merge Tailwind classes intelligently

**State Management:**
- Zustand 4.4.7 - Lightweight React state management (stores in `src/renderer/stores/`)
- @tanstack/react-query 5.17.19 - Server state synchronization and caching
- electron-store 8.1.0 - Persistent data storage for main and renderer processes

**UI Components:**
- Radix UI 1.x:
  - @radix-ui/react-dialog 1.1.14
  - @radix-ui/react-dropdown-menu 2.0.6
  - @radix-ui/react-tabs 1.0.4
- lucide-react 0.312.0 - Icon library
- react-resizable-panels 3.0.4 - Resizable panel UI component
- react-router-dom 6.21.2 - Client-side routing

**Utilities:**
- clsx 2.1.0 - Conditional className utility
- axios 1.6.5 - HTTP client (for API requests)
- date-fns 3.3.1 - Date manipulation library
- better-sqlite3 11.10.0 - Synchronous SQLite database for caching

**AI Integration:**
- @anthropic-ai/sdk 0.59.0 - Anthropic Claude API for diagram generation and context extraction
- tiktoken 1.0.22 - Token counting for Claude API usage tracking

**Git Integration:**
- simple-git 3.22.0 - Git operations wrapper
- @octokit/rest 20.0.2 - GitHub API client

**Diagram Generation:**
- node-plantuml 0.9.0 - PlantUML integration
- plantuml-encoder 1.4.0 - PlantUML diagram encoding

**Build & Testing Support:**
- concurrently 8.2.2 - Run multiple npm scripts concurrently
- @vitejs/plugin-react 4.2.1 - React Fast Refresh support
- MSW 2.11.3 - Mock Service Worker for API mocking in tests

**Linting & Type Checking:**
- ESLint 8.56.0 - JavaScript linting with TypeScript support
- @typescript-eslint/parser 6.19.0 - TypeScript parser for ESLint
- @typescript-eslint/eslint-plugin 6.19.0 - TypeScript ESLint rules
- eslint-plugin-react 7.33.2 - React-specific ESLint rules
- eslint-plugin-react-hooks 4.6.0 - React Hooks validation

## Configuration

**Environment:**
- Configured via `electron-store` in main process
- GitHub token stored securely in electron-store (persisted in user data directory)
- Token scopes: `repo`, `user:email`, `workflow`

**Build:**
- `vite.config.ts` - Vite configuration for main, preload, and renderer builds
- `vitest.config.ts` - Renderer and integration test configuration (jsdom environment, 80% coverage threshold)
- `vitest.config.main.ts` - Main process test configuration (Node environment, 80% coverage threshold)
- `playwright.config.ts` - E2E test configuration with multi-OS matrix (Linux, macOS, Windows)
- `coverage.config.js` - c8 coverage configuration with per-file thresholds and watermarks
- `tsconfig.json` - Base TypeScript config (ES2022 target, strict mode enabled)
- `tailwind.config.js` - Tailwind CSS with HSL color variables
- `postcss.config.js` - PostCSS with Tailwind and autoprefixer plugins
- `.eslintrc.json` - ESLint rules for browser, ES2021, and Node environments

**Path Aliases (both tsconfig and vite):**
- `@/` → `./src/`
- `@main/` → `./src/main/`
- `@renderer/` → `./src/renderer/`
- `@shared/` → `./src/shared/`

## Platform Requirements

**Development:**
- Node.js 18+ (macOS, Linux, Windows)
- npm 9+
- TypeScript knowledge for type-safe development
- Playwright dependencies for E2E tests (on test systems)

**Production:**
- macOS 10.14+: Intel or Apple Silicon
- Windows 10+
- Linux (AppImage format)

**Build Outputs:**
- `dist/main/` - Compiled main process (CommonJS)
- `dist/preload/` - Preload script (CommonJS)
- `dist/renderer/` - React app bundle (ESM)
- `dist-electron/` - Packaged electron apps (platform-specific)

## CI/CD Pipeline

**Environment:**
- Node.js 18 (primary), 20 (matrix testing)
- GitHub Actions runners: ubuntu-latest, macos-latest, windows-latest

**Build Artifacts:**
- Coverage reports (lcov, JSON, HTML formats) uploaded to Codecov
- E2E test results and videos on failure
- Performance benchmarks on main branch pushes

---

*Stack analysis: 2026-02-21*
