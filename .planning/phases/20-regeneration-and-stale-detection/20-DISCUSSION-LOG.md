# Phase 20: Regeneration and Stale Detection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 20-regeneration-and-stale-detection
**Areas discussed:** Stale detection trigger, Regenerate-and-save flow, Stale indicator UX, Post-regeneration feedback

---

## Stale Detection Trigger

### When to check staleness

| Option | Description | Selected |
|--------|-------------|----------|
| On file change events | When chokidar detects file changes, compare current source hash against stored .meta.json sourceHash. Real-time awareness. | ✓ |
| On diagram view (lazy) | Only check staleness when user navigates to a diagram. Lower overhead. | |
| Both — file change + view | File changes set lightweight 'dirty' flag, diagram view does full hash comparison. | |

**User's choice:** On file change events (Recommended)
**Notes:** None

### Staleness granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Per-level staleness | Each C4 level has its own sourceHash. More precise indicators. | ✓ |
| Whole-repo staleness | Any file change marks all levels as stale. Simpler but less precise. | |

**User's choice:** Per-level staleness (Recommended)
**Notes:** None

### Hash comparison method

| Option | Description | Selected |
|--------|-------------|----------|
| Recompute hash on change | Recompute sourceHash for affected levels and compare against stored .meta.json. Definitive. | ✓ |
| Timestamp-based approximation | Compare generatedAt timestamp against file modification times. Simpler but false-positives. | |
| You decide | Claude picks the best approach. | |

**User's choice:** Recompute hash on change (Recommended)
**Notes:** None

### Debounce strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, debounce 2-3 seconds | Wait for file changes to settle before recomputing hashes. | ✓ |
| No debounce | Check immediately on each file change. | |
| You decide | Claude picks an appropriate strategy. | |

**User's choice:** Yes, debounce 2-3 seconds (Recommended)
**Notes:** None

---

## Regenerate-and-Save Flow

### Regeneration scope

| Option | Description | Selected |
|--------|-------------|----------|
| All stale levels | Regenerate every level marked stale in one click. | ✓ |
| Current level only | Only regenerate the level currently being viewed. | |
| User chooses each time | Dialog asks which scope. | |

**User's choice:** All stale levels (Recommended)
**Notes:** None

### Confirmation dialog

| Option | Description | Selected |
|--------|-------------|----------|
| Keep confirmation | Regeneration triggers AI API calls (costs money). Quick confirmation appropriate. | ✓ |
| Remove confirmation | One-click regenerate. Faster but no guardrail. | |
| You decide | Claude picks based on cost/UX tradeoff. | |

**User's choice:** Keep confirmation (Recommended)
**Notes:** None

### Save behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-write to .reef/ | Phase 18 write-through already handles this. No new code needed. | ✓ |
| Explicit save step | User must click 'Save to .reef/' after regeneration. | |

**User's choice:** Auto-write to .reef/ (Recommended)
**Notes:** None

### Skip fresh levels

| Option | Description | Selected |
|--------|-------------|----------|
| Skip fresh levels | Only regenerate levels whose sourceHash doesn't match. Saves API costs. | ✓ |
| Regenerate all levels | Force-regenerate everything. | |
| You decide | Claude picks. | |

**User's choice:** Skip fresh levels (Recommended)
**Notes:** None

---

## Stale Indicator UX

### Indicator placement

| Option | Description | Selected |
|--------|-------------|----------|
| Diagram overlay badge only | StalenessBadge (yellow 'Outdated') on diagram viewer. Existing component. | ✓ |
| Badge + sidebar tree markers | Yellow dot next to stale levels in C4HierarchyTree sidebar. | |
| Badge + sidebar + toolbar icon | Maximum visibility — three places. Could feel noisy. | |

**User's choice:** Diagram overlay badge only (Recommended)
**Notes:** None

### Badge click behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Direct regeneration | Clicking badge opens confirmation dialog, then regenerates stale levels. | ✓ |
| Scroll to Regenerate button | Badge click highlights the toolbar button. | |
| You decide | Claude picks. | |

**User's choice:** Direct regeneration (Recommended)
**Notes:** None

### Badge detail level

| Option | Description | Selected |
|--------|-------------|----------|
| Just 'Outdated' | Simple, clean. Existing badge text. | ✓ |
| 'Outdated (2 levels)' | Shows count of stale levels. | |
| List stale level names | 'Outdated: Context, Container'. | |

**User's choice:** Just 'Outdated' (Recommended)
**Notes:** None

---

## Post-Regeneration Feedback

### Completion feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + auto-refresh viewer | Toast: 'Regenerated N levels — .reef/ updated'. Viewer refreshes. Badge disappears. | ✓ |
| Toast only, manual refresh | Toast notification but manual navigate to see update. | |
| You decide | Claude picks. | |

**User's choice:** Toast + auto-refresh viewer (Recommended)
**Notes:** None

### In-progress feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Badge changes to 'Regenerating...' | Existing StalenessBadge isRegenerating state with spinning icon. | ✓ |
| Progress per level | Show which level is currently regenerating. | |
| You decide | Claude picks. | |

**User's choice:** Badge changes to 'Regenerating...' (Recommended)
**Notes:** None

### Failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Toast error + badge stays | Error toast for failed levels. Badge remains for failed levels. Non-blocking. | ✓ |
| Rollback all on any failure | Revert all to previous state on any failure. | |
| You decide | Claude picks. | |

**User's choice:** Toast error + badge stays (Recommended)
**Notes:** None

---

## Claude's Discretion

- Exact debounce timing within the 2-3 second range
- How to map file change events to affected C4 levels
- Whether to reuse ChangeTrackingService or build simpler file-to-level mapping

## Deferred Ideas

None — discussion stayed within phase scope
