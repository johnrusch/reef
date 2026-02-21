# Codebase Concerns

**Analysis Date:** 2026-02-21

## Tech Debt

### V1/V2 Service Duplication

**Issue:** Multiple service versions exist without deprecation of V1, creating maintenance burden and confusion about which implementation to use.

**Files:**
- `src/main/services/contextExtractorService.ts` (old)
- `src/main/services/contextExtractorServiceV2.ts` (new, 649 lines)
- `src/main/services/diagramGeneratorService.ts` (old)
- `src/main/services/diagramGeneratorServiceV2.ts` (new, 456 lines)

**Impact:**
- Code duplication increases maintenance surface area
- Renderer components must know about V2 versions explicitly
- No clear migration path or deprecation timeline
- Both versions are imported but unclear which is active in main process

**Fix approach:**
- Audit which version (V1 or V2) is actually used by the application
- Deprecate and remove unused version
- Create unified interface to abstract version concerns from consumers
- Add deprecation warnings if V1 is still needed temporarily

### Weak TypeScript Typing in Props and States

**Issue:** Widespread use of `any` type in component props and store state undermines type safety and IDE support.

**Files:**
- `src/renderer/components/tabs/CommitWorkflowTab.tsx:10-13` - `repository: any`, `gitStatus: any`, `branches: any[]`
- `src/renderer/stores/repositoryStore.ts:6-10` - `gitStatus: any | null`, `commits: any[]`
- `src/main/preload.ts:52-78` - Preload API methods return/accept `any[]`
- `src/renderer/components/repository/BranchDropdown.tsx:16` - `remotes?: any[]`
- `src/renderer/components/repository/DiffViewer.tsx:33` - `lines: any[]`

**Impact:**
- Type checking failures go undetected
- Refactoring is risky and error-prone
- IDE autocomplete and documentation unavailable
- Potential runtime errors from incorrect shape assumptions

**Fix approach:**
- Define proper TypeScript interfaces for all data structures (Repository, GitStatus, Commit, Branch types)
- Create shared types file in `src/shared/types/` for types used across main/renderer
- Replace `any` with specific types progressively, starting with critical data structures
- Enable stricter TypeScript settings (`noImplicitAny: true`)

### Casting Away Type Safety

**Issue:** Frequent use of `as` type casts bypasses TypeScript safety, especially in error handling and enum conversions.

**Files:**
- `src/renderer/stores/workspaceStore.ts:58` - `(error as Error).message`
- `src/renderer/components/tabs/VisualMapTab.tsx:122,137-138` - `focusArea as 'api'...`
- `src/renderer/components/repository/DiffViewer.tsx:178` - `line.type as 'add' | 'remove'`
- `src/renderer/components/DiagramSettings/DiagramSettings.tsx:124,164,179` - Multiple `as` casts on enum types

**Impact:**
- Type casts silence real type mismatches
- Runtime errors can occur despite appearing type-safe
- Difficult to find true type issues in codebase

**Fix approach:**
- Use type guards instead of `as` casts: `error instanceof Error` rather than `error as Error`
- Create type-safe conversion functions for enum-like conversions
- Validate and transform data at system boundaries (IPC, API responses)
- Audit all existing casts and replace with proper typing

## Known Bugs

### TODO: Missing Error Notification for Line Revert

**Issue:** Line revert failures in diff viewer silently fail without user feedback.

**Files:** `src/renderer/components/tabs/CommitWorkflowTab.tsx:60`

**Symptoms:** User attempts to revert lines in diff viewer, operation fails silently with only console.error output.

**Trigger:** Click revert button on diff lines when backend operation throws an error.

**Workaround:** Check browser console for error details; currently no user-facing notification.

**Fix approach:** Implement toast/notification component and display errors to user when line revert fails.

## Security Considerations

### API Key Storage Vulnerability

**Issue:** API key stored in `electron-store` with encryption fallback to plaintext if unavailable, plus fallback to environment variable without encryption.

**Files:** `src/main/services/diagramGeneratorServiceV2.ts:39-51`

**Risk:**
- If encryption unavailable on system, API key stored in plaintext in `~/.config/Reef/`
- Plaintext fallback to environment variable could leak to child processes or logs
- No key rotation or expiration mechanism
- Store is persisted to disk indefinitely

**Current mitigation:**
- Attempts to use `safeStorage.decryptString()` on Electron main process
- Falls back to `process.env.ANTHROPIC_API_KEY` if store unavailable

**Recommendations:**
- Always require encryption; error if unavailable rather than fallback to plaintext
- Implement API key rotation with expiration
- Clear sensitive data from memory after use
- Add warning if running on system without encryption support
- Consider using OAuth flow instead of storing long-lived API keys

### PlantUML Server URL in localStorage

**Issue:** PlantUML server URL stored in localStorage (not secure storage) alongside secure configuration in Electron store.

**Files:**
- `src/renderer/components/DiagramSettings/DiagramSettings.tsx:48,61,63`
- `src/renderer/components/PlantUMLRenderer.tsx:69,162`
- `src/renderer/components/tabs/VisualMapTab.tsx:202`

**Risk:**
- While PlantUML URL not strictly secret, inconsistent storage creates confusion about what's secure
- Mixes secure and insecure storage patterns
- localStorage is vulnerable to XSS attacks

**Current mitigation:** Uses localStorage as fallback when secure storage unavailable.

**Recommendations:**
- Move all configuration to Electron store with encryption
- Remove localStorage usage from sensitive configuration
- Use `ipcRenderer.invoke()` to fetch server URL from main process

### Missing CORS/CSP Headers for External API Calls

**Issue:** PlantUML server calls from renderer process have no visible CORS handling or security headers.

**Files:** `src/renderer/components/PlantUMLRenderer.tsx` (fetches from external server)

**Risk:**
- External PlantUML server compromise could execute arbitrary code in renderer
- No Content Security Policy visible in preload script
- Preload script exposes broad IPC access without rate limiting

**Current mitigation:** Basic HTML entity escaping in DiffViewer.

**Recommendations:**
- Proxy external API calls through main process
- Implement Content Security Policy in electron app
- Add request signing/validation for external calls
- Validate all responses before rendering

### Preload Script Context Isolation Not Fully Utilized

**Issue:** Preload script exposes entire `window.reef` API without granular permission model.

**Files:** `src/main/preload.ts:82-163`

**Risk:**
- Any component can call any IPC method (e.g., stageFiles, commit, push)
- No permission checks at preload layer
- Could allow malicious code injection to perform Git operations

**Current mitigation:** Context isolation enabled in `src/main/main.ts:37`.

**Recommendations:**
- Implement permission middleware for sensitive IPC handlers
- Add audit logging for Git operations
- Consider role-based access to IPC methods
- Validate all IPC parameters strictly

## Performance Bottlenecks

### Large Service Files with Complex Logic

**Issue:** Core services exceed 600+ lines with mixed concerns, making performance optimization difficult.

**Files:**
- `src/main/services/contextExtractorServiceV2.ts` (649 lines)
- `src/renderer/components/tabs/VisualMapTab.tsx` (571 lines)
- `src/main/services/diagramGeneratorServiceV2.ts` (456 lines)
- `src/renderer/components/DiagramSettings/DiagramSettings.tsx` (373 lines)

**Cause:**
- Multiple responsibilities in single file (extraction, formatting, caching, API calls)
- Complex state management and side effects in components
- No clear separation of concerns

**Improvement path:**
- Extract file pattern matching logic into separate `FilePatternService`
- Move context extraction formatting into `ContextFormatter` utility
- Split diagram generation into `DiagramPromptBuilder` + `DiagramResponseParser`
- Create custom hooks to isolate diagram UI logic
- Consider worker threads for CPU-intensive context extraction

### Uncleared Intervals and Timeouts

**Issue:** Long-running intervals and timeouts could accumulate and cause memory leaks if components unmount.

**Files:**
- `src/main/services/rateLimiterService.ts:32` - `setInterval(() => this.processQueue(), 1000)` (no cleanup)
- `src/main/services/cacheService.ts:378` - `setInterval(() => { ... }, 60000)` (no cleanup)
- `src/renderer/pages/RepositoryView.tsx:51` - `setInterval` in component (no useEffect cleanup)
- `src/main/services/githubService.ts:267` - `this.pollingInterval = setInterval(...)` (stored but may not be cleared on shutdown)

**Cause:** Services created once and persist for app lifetime, but intervals never cleared.

**Impact:**
- Memory accumulation in long-running sessions
- CPU usage from accumulated callbacks
- Stale data polling after component unmount

**Improvement path:**
- Add lifecycle management to services with `destroy()` or `cleanup()` methods
- Call cleanup in app shutdown handlers
- Use `useEffect` cleanup functions in components (already done in some places)
- Store interval IDs and clear them properly
- Consider using `AbortController` for async operations instead of timeouts

### Diff Parsing in useMemo with Large Files

**Issue:** Diff parsing happens in `useMemo` without file size limits, could freeze UI for large diffs.

**Files:** `src/renderer/components/repository/DiffViewer.tsx:38-120`

**Cause:** Complex line-by-line parsing logic runs on render without chunking.

**Improvement path:**
- Add file size pre-check and virtual scrolling for large diffs
- Move parsing to worker thread for diffs > 1MB
- Implement lazy parsing: parse visible lines first
- Add progress indicator while parsing

## Fragile Areas

### Git Status Object Polymorphism

**Issue:** Git status object structure varies between different callers and contexts, code must handle multiple shapes.

**Files:**
- `src/renderer/components/tabs/VisualMapTab.tsx:65-77` - Handles both `status.files` array and individual `status.modified/created/not_added` arrays
- `src/renderer/components/tabs/CommitWorkflowTab.tsx:65-76` - Transforms status assuming specific structure

**Why fragile:**
- Git service may return different structures depending on command used
- No type definition for GitStatus shape
- Defensive code scattered across components suggests interface instability

**Safe modification:**
- Always transform Git output to consistent shape in Git service
- Define `GitStatus` interface with normalized structure
- Add tests validating Git service returns expected shape
- Update all consumers to expect single structure

### PlantUML Server URL Fallback Chain

**Issue:** URL resolution chain: secure storage → localStorage → hardcoded default, with no clear priority.

**Files:** `src/renderer/components/PlantUMLRenderer.tsx:68-69`

**Why fragile:**
- Multiple sources of truth for same configuration
- Hardcoded fallback hides real configuration issues
- localStorage fallback should never be used

**Safe modification:**
- Fetch all configuration from main process via IPC
- Remove localStorage usage entirely
- Return explicit error if no server configured
- Add validation that server URL is reachable before use

### Branch and Commit Data Shape Assumptions

**Issue:** Components assume branch/commit objects have specific properties without validation.

**Files:**
- `src/renderer/components/repository/BranchDropdown.tsx:16` - `remotes?: any[]` - structure unknown
- `src/renderer/stores/repositoryStore.ts:9` - `commits: any[]` - could fail if shape changes

**Why fragile:** Changes to Git service output will break multiple components silently.

**Safe modification:**
- Define `Branch` and `Commit` TypeScript interfaces
- Add runtime validation in Git service using Zod or similar
- Add tests validating branch/commit object shape
- Create factory functions to safely construct these objects

**Test coverage gaps:**
- No tests for git status transformations
- Branch/commit parsing untested
- Diff viewer parsing edge cases not covered

## Scaling Limits

### Rate Limiter Queue Unbounded

**Issue:** Rate limiter queue can grow without bound, limited only by `maxQueueSize: 100`.

**Files:** `src/main/services/rateLimiterService.ts:18-21`

**Current capacity:** 100 queued requests maximum

**Limit:** If requests queue faster than processing, queue fills and new requests rejected after 100 items.

**Scaling path:**
- Implement priority queue with different limits per priority level
- Add metrics/monitoring for queue size
- Implement backpressure: reject requests if queue threshold exceeded
- Consider adaptive rate limiting based on system load

### Cache Database Unbounded Growth

**Issue:** Diagram cache stores all generations indefinitely with `DEFAULT_CACHE_DAYS = 7` but no actual cleanup enforcement visible.

**Files:** `src/main/services/cacheService.ts:35,378`

**Current capacity:** Limited by disk space only

**Limit:** Cache database could grow very large over months of use without cleanup.

**Scaling path:**
- Implement actual cache cleanup on schedule (currently `DEFAULT_CACHE_DAYS` defined but not enforced)
- Add cache size monitoring
- Implement LRU (Least Recently Used) eviction when size threshold exceeded
- Add cache statistics UI showing size and age

### Repository Status Polling

**Issue:** GitHub service polls workflow runs with no backoff or adaptive intervals.

**Files:** `src/main/services/githubService.ts:267`

**Current capacity:** Polls at fixed interval, limited by GitHub API rate limits

**Limit:** Could hit GitHub API rate limits with multiple repositories or high polling frequency.

**Scaling path:**
- Implement exponential backoff with jitter
- Use GitHub webhooks instead of polling
- Cache response and extend polling interval during stale periods
- Add monitoring and alerting for rate limit exhaustion

## Dependencies at Risk

### Anthropic SDK Usage Without Validation

**Issue:** Anthropic API responses not validated, could break if response format changes.

**Files:** `src/main/services/diagramGeneratorServiceV2.ts:195-220`

**Risk:**
- Code assumes specific response structure without checks
- Throws error `'Unexpected response type from Claude API'` but only checks if `content` property exists
- No schema validation for diagram output
- PlantUML validation happens but response format assumptions could break

**Migration plan:**
- Add Zod schema to validate Claude API responses
- Validate response before processing
- Add version-specific handling if Claude API version changes
- Test with different response formats

### simple-git Dependency

**Issue:** Git command abstraction may not handle all git configurations or edge cases.

**Files:** `src/main/services/gitService.ts`

**Risk:** Custom git configurations, SSH keys, GPG signing could fail silently or with unclear errors.

**Current mitigation:** Basic error wrapping with `throw new Error('Git command failed: ...')`

**Recommendations:**
- Add test cases for common Git configurations
- Log raw git errors for debugging
- Consider handling specific git error codes differently
- Document Git prerequisites for user setup

### Electron Version Pinned

**Issue:** Electron 28 is fairly recent, security updates may have issues.

**Files:** `package.json` (not read for secrets)

**Risk:** Must stay current with security patches; could have compatibility issues with Node.js breaking changes.

**Recommendations:**
- Regular security audits of Electron
- Monitor Electron release notes for breaking changes
- Have upgrade path planned for major versions

## Missing Critical Features

### No Offline Mode

**Issue:** Application requires network connectivity for GitHub API and PlantUML server calls, no graceful offline handling.

**Files:** Multiple IPC handlers assume network availability

**Blocks:** Cannot use repository management features without internet.

### No Progress Indicators for Long Operations

**Issue:** Diagram generation and context extraction could take 30+ seconds with no progress feedback.

**Files:** `src/renderer/components/tabs/VisualMapTab.tsx:159-177`

**Blocks:** Users think app is frozen during diagram generation.

**Approach:** Implement progress reporting through IPC, show progress UI while generating.

### No Application-Level Logging

**Issue:** Errors only logged to console; no persistent log file for debugging user issues.

**Files:** Various `console.error()` calls throughout codebase

**Blocks:** Cannot diagnose user issues from logs; troubleshooting requires reproducing issues.

**Approach:** Implement structured logging to file with configurable verbosity levels.

## Test Coverage Gaps

### Git Service Untested

**Issue:** No test file found for `src/main/services/gitService.ts` core functionality.

**Files:** `src/main/services/gitService.ts` (321 lines, untested)

**What's not tested:**
- Repository status parsing (working_dir/index status codes)
- Branch creation/deletion
- Push/pull operations
- Commit message handling
- Error scenarios from git operations

**Risk:** Regressions in git operations go undetected; edge cases like merge conflicts unknown.

**Priority:** High - Git operations are core functionality

### Context Extraction Untested

**Issue:** Complex context extraction logic not covered by tests.

**Files:** `src/main/services/contextExtractorServiceV2.ts` (649 lines, untested)

**What's not tested:**
- File pattern matching for different repository types
- Token counting accuracy
- File priority scoring
- Context extraction for edge cases (monorepos, nested projects)

**Risk:** Diagram generation quality issues from bad context extraction hidden until runtime.

**Priority:** High - Core to diagram accuracy

### IPC Message Shape Untested

**Issue:** No validation that IPC messages match expected shapes across main/renderer boundary.

**Files:** All IPC handlers in services

**What's not tested:**
- Invalid parameter types
- Missing required fields
- Boundary conditions (empty arrays, null values)

**Risk:** Silent failures or crashes when renderer sends unexpected data.

**Priority:** Medium - Type safety would help

### Integration Between Services Untested

**Issue:** No tests validating services work together (e.g., cache + diagram generation + rate limiter).

**Files:** Multiple services called together in `diagramGeneratorServiceV2.ts`

**What's not tested:**
- Rate limiting delays diagram generation correctly
- Cache invalidation when settings change
- Token counter integrated with rate limiter

**Priority:** Medium

### Diff Viewer Edge Cases

**Issue:** Diff parsing code has defensive logic suggesting edge cases, but no tests cover them.

**Files:** `src/renderer/components/repository/DiffViewer.tsx:60-82`

**What's not tested:**
- Invalid hunk headers
- Missing line numbers
- Large diffs (1000+ hunks)
- Malformed diffs

**Risk:** Rendering crashes or incorrect diff display for unusual git outputs.

**Priority:** Medium

---

*Concerns audit: 2026-02-21*
