---
phase: 21
slug: cache-first-navigation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 21 — Validation Strategy

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
| 21-01-01 | 01 | 1 | NAV-01 | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | NAV-02 | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 21-02-01 | 02 | 2 | NAV-03 | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Navigation handler tests — stubs for NAV-01, NAV-02
- [ ] Generate All tests — stubs for NAV-03
- [ ] Shared test fixtures for diagram cache state

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual diagram renders correctly after navigation | NAV-01 | SVG rendering in Electron webview | Navigate to cached diagram, verify SVG displays |
| Breadcrumb/sidebar click shows correct level | NAV-02 | UI interaction flow | Click each breadcrumb level, verify correct diagram appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
