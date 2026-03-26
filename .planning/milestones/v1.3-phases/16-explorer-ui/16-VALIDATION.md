---
phase: 16
slug: explorer-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 16 — Validation Strategy

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
| 16-01-01 | 01 | 0 | NAV-01 | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 0 | NAV-03 | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 16-01-03 | 01 | 0 | GEN-01 | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 16-01-04 | 01 | 0 | GEN-02 | unit | `npm run test:unit` | ✅ needs update | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/renderer/components/DiagramViewer/C4HierarchyTree.test.tsx` — stubs for NAV-01 (all 4 levels rendered) and NAV-03 (active node highlighting)
- [ ] `tests/unit/renderer/components/tabs/VisualMapTab.gen01.test.tsx` — stubs for GEN-01 (all-4-levels generation on single click)
- [ ] Update `tests/unit/renderer/components/DiagramViewer/DiagramControls.test.tsx` — update for GEN-02 (two-button toolbar)

*Existing `NavigationDrillDown.test.tsx` and `DiagramBreadcrumbs` tests cover NAV-02 breadcrumb logic — no new test file needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar tree visually collapses/expands | NAV-01 | CSS layout verification | Toggle sidebar collapse button, verify tree hides/shows |
| Breadcrumb bar shows correct hierarchy path | NAV-02 | End-to-end navigation flow | Drill down through levels, verify breadcrumb updates |
| Sidebar auto-highlights on drill-down click | NAV-03 | Requires diagram element click interaction | Click diagram element, verify sidebar node highlights |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
