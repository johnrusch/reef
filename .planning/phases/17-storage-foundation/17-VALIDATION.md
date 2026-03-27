---
phase: 17
slug: storage-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | STOR-01 | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | STOR-02 | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 17-01-03 | 01 | 1 | STOR-03 | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 17-01-04 | 01 | 1 | STOR-04 | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/main/services/reefStorageService.test.ts` — stubs for STOR-01, STOR-02
- [ ] `tests/unit/main/services/fileWatcherService.test.ts` — stubs for STOR-03
- [ ] `tests/unit/main/services/gitattributesWriter.test.ts` — stubs for STOR-04

*Existing vitest infrastructure covers framework needs — no new installs required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chokidar exclusion prevents stale-diagram state | STOR-03 | Requires running Electron app with file watcher active | 1. Start dev app 2. Write file to `.reef/` 3. Verify no stale indicator appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
