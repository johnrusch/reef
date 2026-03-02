# Deferred Items — Phase 12 AI Enrichment Pipeline

## Environment Issue: better-sqlite3 Native Module Version Mismatch

**Discovered during:** Plan 12-02 Task 2 verification
**Scope:** Pre-existing issue, not caused by Plan 12-02 changes

**Issue:**
`better-sqlite3` was compiled against NODE_MODULE_VERSION 139 but the test Node.js version requires NODE_MODULE_VERSION 127.

```
Error: The module '.../better-sqlite3/build/Release/better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 139. This version of Node.js requires
NODE_MODULE_VERSION 127.
```

**Impact:**
- All C4AnalyzerService integration tests in `tests/integration/c4Generation.test.ts` fail
- All C4CacheService tests fail
- C4StorageService unit tests fail
- Total: ~83 test failures (pre-existing, not introduced by Phase 12)

**Fix needed:**
```bash
npm rebuild better-sqlite3
# or
npm install better-sqlite3 --build-from-source
```

**Status:** Deferred — requires matching Node.js version for native module rebuild
