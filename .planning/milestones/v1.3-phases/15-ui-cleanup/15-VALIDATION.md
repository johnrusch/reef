---
phase: 15
slug: ui-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 0 | UICL-01 | unit | `npm run test:unit -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 0 | UICL-02 | unit | `npm run test:unit -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 0 | UICL-03 | unit | `npm run test:unit -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 15-01-04 | 01 | 0 | UICL-04 | unit | `npm run test:unit -- --reporter=verbose` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/renderer/components/tabs/VisualMapTab.test.tsx` — covers UICL-01 (no settings page rendered)
- [ ] `tests/unit/renderer/components/DiagramViewer/DiagramControls.test.tsx` — covers UICL-02 (no legacy type buttons)
- [ ] `tests/unit/renderer/components/DiagramViewer/DiagramViewer.uicl.test.tsx` — covers UICL-03 (no DiagramInfo rendered)
- [ ] `tests/unit/renderer/components/repository/RepositoryTabs.test.tsx` — covers UICL-04 (no Beta badge)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual appearance after removals | All | Visual regression not automatable with unit tests | Open app, navigate to Visual Map tab, verify no settings page, no legacy toolbar, no sidebar, no Beta badge |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
