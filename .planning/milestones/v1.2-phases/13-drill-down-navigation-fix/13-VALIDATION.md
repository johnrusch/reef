---
phase: 13
slug: drill-down-navigation-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-03
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 1.x (existing) |
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
| 13-01-01 | 01 | 0 | NAV-01 | unit | `npm run test:unit -- --run elementIdRegistry` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 0 | NAV-02 | unit | `npm run test:unit -- --run c4PlantUMLGenerator` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 0 | NAV-03 | unit | `npm run test:unit -- --run elementIdRegistry` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 0 | NAV-04 | unit | `npm run test:unit -- --run PlantUMLRenderer` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/main/services/elementIdRegistry.test.ts` — stubs for NAV-01, NAV-02, NAV-03
- [ ] `tests/unit/renderer/components/DiagramViewer/NavigationDrillDown.test.tsx` — stubs for NAV-04 click handler behavior
- [ ] Extend `tests/unit/main/c4PlantUMLGenerator.enrichment.test.ts` — add NAV-02 `deriveContainerPath` test cases

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual amber highlighting correct after regeneration | NAV-03 | Requires visual SVG rendering comparison | 1. Generate diagram 2. Modify repo 3. Regenerate 4. Verify amber elements match |
| Click navigation works across PlantUML JAR versions | NAV-04 | Requires testing with different JAR binaries | 1. Replace PlantUML JAR 2. Generate diagram 3. Click element 4. Verify drill-down |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
