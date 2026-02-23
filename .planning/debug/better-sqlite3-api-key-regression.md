---
status: diagnosed
trigger: "Investigate the blocker regression with better-sqlite3 module version mismatch and API key re-prompt."
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - better-sqlite3 compiled for wrong Node version; investigating API key issue
test: check electron-store persistence and C4CacheService instantiation timing
expecting: API key decryption fails silently OR store not persisted OR timing issue
next_action: examine service initialization order and store persistence

## Symptoms

expected: Cache invalidation works without re-prompting for API key
actual:
  1. Application asks for Anthropic API key again (should be stored)
  2. Error: The module 'better-sqlite3/build/Release/better_sqlite3.node' was compiled against NODE_MODULE_VERSION 127 but current Node.js requires NODE_MODULE_VERSION 139
errors: NODE_MODULE_VERSION mismatch (127 vs 139)
reproduction: Modify source file, trigger cache invalidation
started: Recent regression (UAT Test 8)

## Eliminated

## Evidence

- timestamp: 2026-02-23T00:01:00Z
  checked: Current Node.js version and Electron version
  found: System Node.js v22.22.0 (NODE_MODULE_VERSION 127), Electron 38.8.2 (NODE_MODULE_VERSION 139)
  implication: Version mismatch - better-sqlite3 was compiled for system Node (127) but Electron requires 139

- timestamp: 2026-02-23T00:02:00Z
  checked: package.json dependencies
  found: electron@38.8.2, better-sqlite3@11.10.0, electron-store@8.1.0
  implication: All packages present, better-sqlite3 needs Electron rebuild

- timestamp: 2026-02-23T00:03:00Z
  checked: diagramGeneratorServiceV2.ts API key storage mechanism
  found: Uses electron-store to store encrypted API key at 'anthropicApiKey', reads on init (line 40-52)
  implication: API key should persist between sessions via electron-store

- timestamp: 2026-02-23T00:04:00Z
  checked: c4CacheService.ts better-sqlite3 usage
  found: Instantiates Database from 'better-sqlite3' (line 14, 29)
  implication: This is where the NODE_MODULE_VERSION error occurs

- timestamp: 2026-02-23T00:05:00Z
  checked: better-sqlite3 binary details
  found: Binary exists at node_modules/better-sqlite3/build/Release/better_sqlite3.node (Mach-O arm64)
  implication: Binary was compiled but for wrong Node version (system Node, not Electron's Node)

- timestamp: 2026-02-23T00:06:00Z
  checked: electron-store persistence in ~/Library/Application Support/reef/
  found: config.json exists with anthropicApiKey (encrypted), no diagram-settings.json exists
  implication: API key IS stored persistently - re-prompt issue is NOT storage related

- timestamp: 2026-02-23T00:07:00Z
  checked: C4CacheService instantiation in c4AnalyzerService.ts
  found: Instantiates with cachePath = app.getPath('userData')/c4-cache.db (line 35-36)
  implication: C4CacheService is created during service initialization, which tries to load better-sqlite3

## Eliminated

- hypothesis: API key storage is not persisting
  evidence: Found encrypted API key in config.json at ~/Library/Application Support/reef/config.json
  timestamp: 2026-02-23T00:06:00Z

- hypothesis: electron-store is misconfigured
  evidence: Store is working correctly - config.json has expected structure and anthropicApiKey field
  timestamp: 2026-02-23T00:06:00Z

## Resolution

root_cause: |
  TWO RELATED ISSUES causing cascading failure:

  PRIMARY: better-sqlite3 NODE_MODULE_VERSION mismatch
  - better-sqlite3 native module compiled for system Node.js v22.22.0 (NODE_MODULE_VERSION 127)
  - Electron 38.8.2 uses its own Node.js runtime (NODE_MODULE_VERSION 139)
  - C4AnalyzerService constructor (line 36) instantiates C4CacheService with cachePath
  - C4CacheService constructor (line 29) calls `new Database(cachePath)` which loads better_sqlite3.node
  - This throws NODE_MODULE_VERSION mismatch error during service initialization
  - Package.json has NO postinstall script to rebuild native modules for Electron (line 28 only has update-plantuml.js)

  SECONDARY: API key re-prompt (CONSEQUENCE of primary issue)
  - diagramGeneratorServiceV2 constructor (line 40-51) tries to read encrypted API key from store
  - If decryption fails (line 46-48), error is caught and logged, but initialization continues
  - When C4AnalyzerService initialization fails due to better-sqlite3 error, service may not fully initialize
  - Service re-initialization on subsequent diagram generation attempts re-prompts for API key
  - API key IS stored correctly (verified in config.json) but service initialization failure causes re-prompt

affected_artifacts:
  - node_modules/better-sqlite3/build/Release/better_sqlite3.node (wrong ABI version)
  - src/main/services/c4/c4AnalyzerService.ts (fails at line 36)
  - src/main/services/c4/c4CacheService.ts (fails at line 29)
  - package.json (missing electron-rebuild in postinstall)

missing_to_fix:
  - electron-rebuild package (not installed, verified via npm list)
  - postinstall script modification to run: electron-rebuild -f -w better-sqlite3
  - OR add electron-builder's electron-rebuild integration
  - Need to run rebuild after adding script to recompile for Electron's Node version

fix:
verification:
files_changed: []
