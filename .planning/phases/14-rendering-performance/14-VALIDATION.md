---
phase: 14
slug: rendering-performance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-03
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (renderer: jsdom, main: node) |
| **Config file** | `vitest.config.ts` (renderer), `vitest.config.main.ts` (main process) |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test:unit && npm run test:integration` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test:unit && npm run test:integration`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 0 | PERF-01 | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/storageService.test.ts` | ✅ (extend) | ⬜ pending |
| 14-01-02 | 01 | 0 | PERF-02 | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/plantUmlService.test.ts` | ✅ (extend) | ⬜ pending |
| 14-01-03 | 01 | 0 | PERF-01 | unit | `vitest run --config vitest.config.ts tests/unit/renderer/components/VisualMapTab.svg-cache.test.tsx` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | PERF-01 | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/storageService.test.ts` | ✅ (extend) | ⬜ pending |
| 14-02-02 | 02 | 1 | PERF-01 | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/storageService.test.ts` | ✅ (extend) | ⬜ pending |
| 14-02-03 | 02 | 1 | PERF-01 | unit | `vitest run --config vitest.config.ts tests/unit/renderer/components/` | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 1 | PERF-02 | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/plantUmlService.test.ts` | ❌ W0 | ⬜ pending |
| 14-03-02 | 03 | 1 | PERF-02 | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/plantUmlService.test.ts` | ❌ W0 | ⬜ pending |
| 14-03-03 | 03 | 1 | PERF-02 | unit | `vitest run --config vitest.config.main.ts tests/unit/main/services/plantUmlService.test.ts` | ❌ W0 | ⬜ pending |
| 14-04-01 | 04 | 2 | PERF-03 | unit (mock) | `vitest run --config vitest.config.main.ts tests/unit/main/services/plantUmlService.test.ts` | ❌ W0 | ⬜ pending |
| 14-04-02 | 04 | 2 | PERF-03 | unit | `vitest run --config vitest.config.main.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/main/services/storageService.test.ts` — extend with PERF-01 SVG column tests (getSvg, storeSvg, schema migration)
- [ ] `tests/unit/main/services/plantUmlService.test.ts` — extend with SvgLruCache unit tests (get/set, eviction, MRU promotion)
- [ ] `tests/unit/renderer/components/VisualMapTab.svg-cache.test.tsx` — PERF-01 renderer fast path (SVG cache check before Java)

*Existing infrastructure covers framework install — Vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sub-500ms SVG display on tab switch | PERF-01 | Timing depends on hardware/rendering | Open diagram, switch tabs, switch back — no loading spinner visible |
| No Java subprocess on cached diagram | PERF-01/PERF-02 | Need to observe process list | Monitor with `ps aux | grep java` while switching tabs |
| Nailgun JVM stays warm between renders | PERF-03 | Requires observing JVM process lifecycle | Enable Nailgun, generate 2 diagrams, check only 1 JVM process exists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
