# Phase 17: Storage Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 17-storage-foundation
**Areas discussed:** Folder structure, Atomic write strategy, Chokidar exclusion, .gitattributes generation

---

## Folder Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Flat per-level | All files at root: .reef/context.puml, .reef/context.svg, etc. | ✓ |
| Nested per-level | Subdirectory per level: .reef/context/diagram.puml, etc. | |
| Flat with prefix | Level prefix on generic names: .reef/context-diagram.puml | |

**User's choice:** Flat per-level
**Notes:** Initial choice for 4 fixed top-level levels.

---

### Manifest File

| Option | Description | Selected |
|--------|-------------|----------|
| Per-file only | schemaVersion in each .meta.json, no root manifest | ✓ |
| Root manifest + per-file | reef.json at root + per-file .meta.json | |

**User's choice:** Per-file only

---

### Schema Version Mismatch

| Option | Description | Selected |
|--------|-------------|----------|
| Ignore and regenerate | Treat unrecognized schema as missing, queue regeneration | ✓ |
| Warn and skip | Show warning toast, don't overwrite | |
| You decide | Claude's discretion | |

**User's choice:** Ignore and regenerate

---

### Directory Creation Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy on first write | Directory created only when first artifact is written | ✓ |
| Eager on repo add | Create .reef/ immediately on repo add | |

**User's choice:** Lazy on first write

---

### Write Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Per-level independent | Each level's files written independently | ✓ |
| All-or-nothing batch | Write all levels together | |

**User's choice:** Per-level independent

---

### Source of Truth Revision (User-Initiated)

User raised concern about sub-diagram scalability and stated `.reef/` should be the source of truth, not SQLite.

| Option | Description | Selected |
|--------|-------------|----------|
| Nested by parent element | Sub-diagrams in .reef/component/{containerId}/, .reef/code/{componentId}/ | ✓ |
| Flat with ID prefix | All files flat with element ID prefix | |
| Level directories for all | Every level gets a directory with index naming | |

**User's choice:** Nested by parent element

---

### SQLite Role Going Forward

| Option | Description | Selected |
|--------|-------------|----------|
| Cache/index only | SQLite becomes read cache, .reef/ authoritative | |
| Eliminated eventually | .reef/ replaces SQLite; dual-write for v1.4, .reef/ wins | ✓ |
| Parallel with .reef/ priority | Both coexist long-term | |

**User's choice:** Eliminated eventually

---

### Phase 17 Scope for Sub-Diagrams

| Option | Description | Selected |
|--------|-------------|----------|
| Full contract now | Define complete folder structure including nested sub-diagram dirs | ✓ |
| Top-level now, expand later | Define only context/container flat files | |

**User's choice:** Full contract now

---

## Atomic Write Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Temp-then-rename | Write to .tmp, then fs.rename(). Windows EPERM: delete first then rename | ✓ |
| Direct overwrite | writeFileSync directly to final path | |
| You decide | Claude's discretion | |

**User's choice:** Temp-then-rename

---

### Per-File vs Grouped Rename

| Option | Description | Selected |
|--------|-------------|----------|
| Individual renames | Write+rename each file independently | ✓ |
| Grouped rename | Write all .tmp then rename all | |

**User's choice:** Individual renames

---

### Error Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Log warning, no toast | Console.warn, no user notification | |
| Toast notification | Warning toast shown to user | |
| You decide | Claude's discretion | ✓ |

**User's choice:** You decide (Claude's discretion)

---

## Chokidar Exclusion

| Option | Description | Selected |
|--------|-------------|----------|
| Extend ignored predicate | Add \.reef to existing regex in FileWatcherService | ✓ |
| Separate .reef/ check | Dedicated path.includes('.reef') check | |
| You decide | Claude's discretion | |

**User's choice:** Extend ignored predicate

---

### .tmp File Exclusion

| Option | Description | Selected |
|--------|-------------|----------|
| .reef/ exclusion covers it | Directory-level exclusion handles .tmp files automatically | ✓ |
| Explicit .tmp exclusion too | Add \.tmp$ pattern as defense-in-depth | |

**User's choice:** .reef/ exclusion covers it

---

## .gitattributes Generation

### Timing

| Option | Description | Selected |
|--------|-------------|----------|
| On first .reef/ write | Created alongside first level's files, idempotent | ✓ |
| Separately before any write | Created during .reef/ directory initialization | |
| You decide | Claude's discretion | |

**User's choice:** On first .reef/ write

---

### Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Both .svg and .puml | Mark both as binary to prevent merge conflicts | ✓ |
| Only .svg | Mark only .svg as binary | |

**User's choice:** Both .svg and .puml

---

## Claude's Discretion

- Error visibility for .reef/ write failures (log warning vs toast)

## Deferred Ideas

- Full SQLite elimination — future milestone
- Conflict resolution guidance for .reef/ merge conflicts (TEAM-02)
- Per-branch .reef/ variants (ADV-02)
