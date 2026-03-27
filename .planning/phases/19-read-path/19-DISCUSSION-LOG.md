# Phase 19: Read Path - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 19-read-path
**Areas discussed:** Detection & import flow, SVG loading strategy, Partial .reef/ handling, Generation prompt UX

---

## Detection & Import Flow

| Option | Description | Selected |
|--------|-------------|----------|
| On repo add | Check for .reef/ during AddRepositoryModal flow, before the generation prompt. Single check point, clean flow. | ✓ |
| On first diagram view | Check when VisualMapTab loads for the repo. Simpler but user sees the generation prompt first. | |
| Both | Check on repo add AND on diagram view as fallback. More robust but two code paths. | |

**User's choice:** On repo add (Recommended)
**Notes:** Single detection point during the modal flow.

| Option | Description | Selected |
|--------|-------------|----------|
| Import into SQLite on add | Read .reef/ SVGs and metadata, write to SQLite during repo add. Existing getSvg fast path works unchanged. | ✓ |
| Read from .reef/ on demand | Read directly from .reef/ files when viewer needs them. Requires new read path. | |
| You decide | Claude picks approach. | |

**User's choice:** Import into SQLite on add (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Async background | Close modal immediately, import in background. Diagrams appear as loaded. | ✓ |
| Blocking with spinner | Show loading state while importing. User sees diagrams ready when modal closes. | |
| You decide | Claude picks. | |

**User's choice:** Async background (Recommended)

---

## SVG Loading Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, populate LRU | After SQLite import, push SVGs into 15-entry LRU cache. First view truly instant. | ✓ |
| No, let viewer load from SQLite | Just write to SQLite. VisualMapTab getSvg() populates LRU on first view. | |
| You decide | Claude picks. | |

**User's choice:** Yes, populate LRU (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Import SVG + PUML + metadata | Full import — store .puml, SVG, and metadata. Enables regeneration from stored source. | ✓ |
| SVG only | Only import rendered SVG. Simpler but .puml stays in .reef/ only. | |
| You decide | Claude picks based on Phase 20 needs. | |

**User's choice:** Import SVG + PUML + metadata (Recommended)

---

## Partial .reef/ Handling

| Option | Description | Selected |
|--------|-------------|----------|
| SVG required, meta optional | Level importable if it has .svg. Missing .meta.json acceptable. | ✓ |
| SVG + meta both required | Only import levels with both .svg and .meta.json. | |
| All three required | Only import if .puml, .svg, AND .meta.json all exist. | |

**User's choice:** SVG required, meta optional (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-queue missing levels | After importing available levels, auto-enqueue generation for missing levels. | ✓ |
| Prompt user about missing levels | Show message asking whether to generate missing levels. | |
| Do nothing for missing levels | Only import what exists. User triggers generation manually. | |

**User's choice:** Auto-queue missing levels (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| You decide | Claude uses existing sidebar patterns and diagram state system. | |
| Distinct imported indicator | Add visual distinction showing level was loaded from .reef/. | |
| No distinction needed | Imported levels look identical to freshly generated ones. | ✓ |

**User's choice:** No distinction needed

---

## Generation Prompt UX

| Option | Description | Selected |
|--------|-------------|----------|
| Skip prompt, show toast | No generation prompt. Toast: "Loaded diagrams from .reef/". Silent but not invisible. | ✓ |
| Skip prompt silently | Just close modal, no toast. Cleanest but user might wonder. | |
| Modified prompt | Different prompt: "Found existing diagrams. Load or regenerate?" | |

**User's choice:** Skip prompt, show toast (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + auto-queue | Toast acknowledging partial load + auto-queues missing levels. | ✓ |
| Show generation prompt for missing only | Import available, show prompt for missing levels. | |
| You decide | Claude picks. | |

**User's choice:** Toast + auto-queue (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Fall through to normal prompt | Treat as if .reef/ doesn't exist. Show standard generation prompt. | ✓ |
| Toast + normal prompt | Show toast about invalid .reef/ then show generation prompt. | |
| You decide | Claude picks. | |

**User's choice:** Fall through to normal prompt (Recommended)

---

## Claude's Discretion

- Read method implementation details (how to scan .reef/ directory structure)
- IPC channel design for the import flow
- Error handling granularity during import
- Toast notification wording and timing

## Deferred Ideas

None — discussion stayed within phase scope
