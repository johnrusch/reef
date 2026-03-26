# Feature Research

**Domain:** Repo-stored C4 diagram artifacts for a desktop Git client
**Researched:** 2026-03-26
**Confidence:** HIGH

## Context

This is a SUBSEQUENT MILESTONE research pass for v1.4 "Repo-Stored Diagrams." All prior features
(C4 generation pipeline, SQLite persistent storage, change tracking, amber highlighting, diff navigation,
C4HierarchyTree sidebar, background generation queue) are shipped in v1.0–v1.3.

This research focuses exclusively on what is needed to store diagram artifacts in a `.reef/` folder
within each repository so diagrams are shared, version-controlled, and render instantly.

**Existing pipeline to build on:**
- Three-phase generation: Static Analysis → AI Enrichment → PlantUML Generation → SVG render
- SQLite storage with `diagram_storage` table: `diagram_content` (PlantUML source) + `svg_content` (rendered SVG)
- `C4StorageService` singleton for all reads/writes
- `generationQueueService` for background async generation with IPC progress events
- `chokidar` file watching for change detection
- `C4AnalyzerService` coordinates the full generation pipeline

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Read existing `.reef/` on repo import | If diagrams exist in the repo, the app must use them — regenerating on every import is a jarring experience, wastes AI spend, and contradicts the "shared diagrams" value | MEDIUM | Check for `.reef/` presence before enqueuing generation. If found, load from files into SQLite. Requires new IPC handler: `c4-reef:import`. |
| Write `.reef/` after generation | Generated diagrams must be persisted to the repo folder, not only to the app's private SQLite DB. Without this, diagrams can't be shared via git | MEDIUM | After successful generation of all 4 levels, write PlantUML source + JSON metadata + SVG to `.reef/`. Wire into existing `generationQueueService` completion path. |
| Instant SVG display from stored files | Team members who clone a repo with `.reef/` present expect the diagram to open instantly — no PlantUML rendering, no AI call | LOW | On import, read SVG files from `.reef/` and populate `svg_content` in SQLite. The existing two-tier cache (LRU + SQLite) then serves them at <100ms. |
| Manual "Regenerate and Save" | After code changes, the user needs an explicit action to refresh diagrams and write updated files back to `.reef/`. Automatic background regeneration is explicitly out of scope (per PROJECT.md) | LOW | Add a "Regenerate and Save" button in the toolbar. Reuse existing `c4-generation:enqueue` IPC path, then trigger `.reef/` write on completion. |
| Consistent diagrams across team | The primary stated goal: commit `.reef/` to the repo so all team members see the same diagram | LOW (UX clarity) | This is mostly a documentation/onboarding concern — the technical work is write + read. The UI should show a "Save to Repo" affordance that makes the action explicit. |
| Graceful fallback when `.reef/` absent | First-time users (or repos without `.reef/`) must still work normally — show the "Generate All Diagrams" prompt exactly as in v1.3 | LOW | Keep existing code path. Only diverge when `.reef/` is detected at import time. |
| `.reef/` folder structure is stable and predictable | Team members and CI tools that inspect `.reef/` files must be able to rely on a stable layout: `context.puml`, `context.svg`, `metadata.json` — not opaque binary blobs | LOW | Define the folder layout once and treat it as a public contract. Use flat per-level naming (`context.puml`, `container.puml`, etc.) plus a single `metadata.json`. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI metadata preserved in `.reef/` | Storing the AI enrichment data (model used, prompt version, token cost, generation timestamp) alongside diagrams lets teams track diagram freshness and cost. No other tool does this transparently | LOW | `metadata.json` already has a natural home for this. Map from `diagram_storage` columns: `model_used`, `prompt_version`, `tokens_used`, `generation_cost`, `updated_at`. |
| Stale-on-import detection | When a repo is imported with `.reef/` data, compare the stored `generated_at` timestamp against the repo's most recent commit date. If code has changed since diagrams were generated, show a "Diagrams may be outdated" warning with a "Regenerate and Save" CTA | MEDIUM | Requires `git log --format="%ai" -1` via `simple-git` to get the last commit date. Compare against `metadata.json:generated_at`. Flag as stale in UI using existing `DiagramState` enum. |
| `.gitattributes` recommendation | SVG files are XML-based text, but generated SVGs from PlantUML include embedded metadata that makes diffs noisy. Recommend (or auto-write) `.gitattributes` entries that mark `.reef/*.svg` as `binary` or `linguist-generated=true` to reduce PR noise | LOW | Auto-append to `.gitattributes` on first "Save to Repo." Non-destructive: only add lines if they don't already exist. |
| Import without overwriting newer local data | If the app already has a `fresh` diagram in SQLite (generated more recently than what's in `.reef/`), don't overwrite local data on import. Let the user decide which to keep | MEDIUM | Compare `diagram_storage.updated_at` vs `metadata.json.generated_at`. If local is newer, prompt user: "Local diagrams are newer than repo — keep local or load from `.reef/`?" |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automatic `.reef/` sync on every file save | "Keep the repo diagrams always current" | Silent AI costs with no user control over spending. Already explicitly out of scope in PROJECT.md. File saves trigger chokidar events which already mark diagrams as stale | Show stale indicator (already built). Let user trigger "Regenerate and Save" explicitly. |
| Conflict-resolved merge of `.reef/` files | "What happens when two devs generate diagrams concurrently and both push?" | SVG and PlantUML files do not merge meaningfully — git will produce a conflict on auto-generated XML. Automated conflict resolution introduces silent data corruption risk | Treat `.reef/` files as last-writer-wins. Document in the commit message convention: "chore: regenerate reef diagrams." Teams pick one person to maintain diagrams like they would any generated asset. |
| Per-branch `.reef/` storage | "Feature branch A has different architecture than main" | Requires branch-aware import logic, multiplies folder complexity, and creates confusion about which diagram is canonical | The `.reef/` folder tracks the current branch's HEAD by definition. Branch-specific diagrams are addressed by committing to that branch. No special handling needed. |
| Diagram version history in-app | "Let me browse how the architecture changed over git history" | High complexity. Requires reading git object store (not just worktree), parsing historical `.reef/` folder contents, and threading through the existing viewer. Enormous scope | Existing git clients (including Reef's own diff view) already provide file history for `.reef/*.puml`. The diagram-as-text value is that `git log -- .reef/context.puml` works for free. |
| Encrypt `.reef/` contents | "Our architecture is sensitive" | Encrypted files cannot be diffed or reviewed in PRs, defeating the point of repo storage. Electron's `safeStorage` is per-machine, not shareable | Use repo-level access controls (private repositories). Encryption of architecture diagrams is security theater for most teams. |
| Binary format for SVG to prevent diffs | "SVG diffs are noisy in PRs" | Binary SVGs cannot be inspected, diffed for sanity, or recovered if corrupted | Use `.gitattributes linguist-generated=true` to collapse diffs in GitHub PR UI without making files binary. Noisy diffs are a cosmetic problem, not a data problem. |

---

## Feature Dependencies

```
[Read .reef/ on import]
    └──requires──> [Define .reef/ folder structure and file naming]
    └──requires──> [IPC handler: c4-reef:import]
    └──enables──> [Instant SVG display from stored files]
    └──enables──> [Stale-on-import detection]

[Write .reef/ after generation]
    └──requires──> [Define .reef/ folder structure and file naming]
    └──requires──> [Hook into generationQueueService completion]
    └──enables──> [Consistent diagrams across team]
    └──enables──> [Manual Regenerate and Save]

[Manual Regenerate and Save]
    └──requires──> [Write .reef/ after generation]
    └──requires──> [Existing c4-generation:enqueue IPC path]
    └──enhances──> [Stale-on-import detection] (resolves stale state)

[Stale-on-import detection]
    └──requires──> [Read .reef/ on import]
    └──requires──> [simple-git: git log --format="%ai" -1]
    └──enhances──> [Manual Regenerate and Save] (triggers CTA)

[.gitattributes recommendation]
    └──requires──> [Write .reef/ after generation]
    └──enhances──> [Consistent diagrams across team] (reduces PR noise)

[Import without overwriting newer local data]
    └──requires──> [Read .reef/ on import]
    └──requires──> [metadata.json:generated_at comparison against SQLite updated_at]
    └──conflicts with──> [Simple always-overwrite import logic] (adds a decision branch)
```

### Dependency Notes

- **Folder structure definition must come first.** Every other feature reads or writes to `.reef/`. Define the schema once — file names, JSON fields, encoding — and treat it as stable. Changing it later breaks any repo that already has `.reef/` committed.
- **Read path unblocks instant display.** Once import reads SVGs into SQLite, the existing two-tier cache serves them instantly. No changes to the renderer or viewer are needed.
- **Write path hooks into existing completion events.** `generationQueueService` broadcasts `c4-generation:complete` with `repoPath` and `completedLevels`. The write-to-reef step should be a listener on this event, keeping concerns separated.
- **Stale detection is independent and additive.** Can be added after read/write paths are stable. Uses `simple-git` which is already a dependency.
- **`.gitattributes` write is cosmetic but high-signal.** Teams that don't know to do this will get noisy PRs. Auto-writing it on first "Save to Repo" is a professional touch with low implementation cost.

---

## MVP Definition

### Launch With (v1.4)

Minimum features to deliver "diagrams are shared, version-controlled, and render instantly."

- [ ] **Define `.reef/` folder structure** — flat per-level files with single `metadata.json`. This is the contract everything else depends on.
- [ ] **Read `.reef/` on repo import** — check for `.reef/` existence at import time; if found, parse files and load into SQLite (diagram_content + svg_content). Skip generation queue. Show diagrams immediately.
- [ ] **Write `.reef/` after generation** — on `c4-generation:complete`, write all generated levels to `.reef/`. Create folder if absent.
- [ ] **Manual "Regenerate and Save" button** — toolbar button that triggers `c4-generation:enqueue` and then writes `.reef/` on completion. Replaces the current "Regenerate" button or sits alongside it.
- [ ] **Graceful fallback when `.reef/` absent** — existing "Generate All Diagrams" first-visit flow unchanged.

### Add After Validation (v1.4.x)

Features to add once core read/write loop is working and tested.

- [ ] **Stale-on-import detection** — compare `metadata.json:generated_at` vs last commit date via `simple-git`. Show warning badge + CTA if stale.
- [ ] **Auto-write `.gitattributes`** — append `linguist-generated=true` for `.reef/*.svg` and `.reef/*.puml` on first "Save to Repo."
- [ ] **Import conflict resolution** — if local SQLite data is newer than `.reef/`, prompt the user instead of silently overwriting.

### Future Consideration (v2+)

Features to defer until repo-stored diagrams are adopted and stable.

- [ ] **`.reef/` change propagation via chokidar** — watch `.reef/` folder for changes (e.g., external editor or CI pipeline updated diagrams). Auto-import updated files into SQLite.
- [ ] **Diagram freshness badge in sidebar** — show age of stored diagrams (e.g., "Generated 3 weeks ago") in the C4HierarchyTree.
- [ ] **CI/CD export hook** — document or provide a CLI path for generating and committing `.reef/` in GitHub Actions / GitLab CI.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Define `.reef/` folder structure | HIGH | LOW | P1 |
| Read `.reef/` on repo import | HIGH | MEDIUM | P1 |
| Write `.reef/` after generation | HIGH | MEDIUM | P1 |
| Manual "Regenerate and Save" | HIGH | LOW | P1 |
| Graceful fallback when `.reef/` absent | HIGH | LOW | P1 |
| Stale-on-import detection | MEDIUM | MEDIUM | P2 |
| Auto-write `.gitattributes` | LOW | LOW | P2 |
| Import conflict resolution (local vs repo) | MEDIUM | MEDIUM | P2 |
| `.reef/` chokidar watching | LOW | MEDIUM | P3 |
| Diagram freshness badge | LOW | LOW | P3 |
| CI/CD export documentation | MEDIUM | LOW | P3 |

**Priority key:**
- P1: Required for v1.4 launch — core read/write loop for repo-stored diagrams
- P2: Polishes the experience — add once core is working and tested
- P3: Expands the surface — defer until adoption is validated

---

## `.reef/` Folder Structure Recommendation

Based on patterns from Structurizr DSL (text source next to code), PlantUML CI workflows (`.puml` + rendered `.svg`), and the existing SQLite schema:

```
{repo-root}/
  .reef/
    context.puml         # PlantUML source for Context level
    context.svg          # Pre-rendered SVG for Context level
    container.puml       # PlantUML source for Container level
    container.svg        # Pre-rendered SVG for Container level
    component.puml       # PlantUML source for Component level (top-level only)
    component.svg        # Pre-rendered SVG for Component level (top-level only)
    code.puml            # PlantUML source for Code level (top-level only)
    code.svg             # Pre-rendered SVG for Code level (top-level only)
    metadata.json        # Generation metadata (see schema below)
```

**`metadata.json` schema:**

```json
{
  "reef_version": "1.4",
  "generated_at": "2026-03-26T12:00:00Z",
  "repo_path": "/absolute/path/to/repo",
  "levels": {
    "context":   { "model_used": "claude-haiku-4", "prompt_version": "1.2", "tokens_used": 1200, "generation_cost": 0.0003 },
    "container": { "model_used": "claude-haiku-4", "prompt_version": "1.2", "tokens_used": 2100, "generation_cost": 0.0005 },
    "component": { "model_used": "claude-haiku-4", "prompt_version": "1.2", "tokens_used": 1800, "generation_cost": 0.0004 },
    "code":      { "model_used": "claude-haiku-4", "prompt_version": "1.2", "tokens_used": 900,  "generation_cost": 0.0002 }
  }
}
```

**Why this structure:**
- Flat layout (not nested by level) keeps git history per-file meaningful: `git log -- .reef/context.puml`
- `.puml` extension is the established PlantUML convention recognized by GitHub syntax highlighting
- `metadata.json` is a single source for all generation provenance — one file to inspect, one file to parse
- `reef_version` field allows future format migrations without silent breakage
- Excludes component/code drill-down diagrams (those are repo-specific sub-element diagrams): the top 4 levels are sufficient for sharing; drill-down is generated on-demand

**Rationale for excluding drill-down component/code diagrams from `.reef/`:**
The existing SQLite schema stores component and code diagrams keyed by `element_id` (e.g., `component:GitService`). Storing these in `.reef/` would require either a sub-folder per element or a naming scheme like `component__GitService.puml`. This multiplies file count unpredictably across repos and complicates the read path. The four top-level diagrams (Context, Container, top-level Component, top-level Code) cover the shareable architecture overview. Drill-down diagrams remain local-only in SQLite.

---

## Implementation Dependencies on Existing Pipeline

| Needed For | Existing Hook | Change Required |
|------------|---------------|-----------------|
| Write `.reef/` after generation | `c4-generation:complete` IPC broadcast in `generationQueueService.ts` | Add listener that calls new `ReefFileService.write(repoPath, levels)` |
| Read `.reef/` on import | `repositoryStore.ts` `addRepository()` action | Before calling `c4-generation:enqueue`, check `fs.existsSync(path.join(repoPath, '.reef'))`. If true, call `c4-reef:import` IPC instead. |
| Manual Regenerate and Save | Existing toolbar "Regenerate" button + `c4-generation:enqueue` | Either repurpose existing button or add second button. On completion, trigger `.reef/` write. |
| SVG instant display | `C4StorageService.storeSvg()` and `getSvg()` already exist | No changes — import path writes SVGs to SQLite, cache serves them. |
| Stale detection | `gitService.ts` already wraps `simple-git` | Add `getLastCommitDate(repoPath): Promise<Date>` method |

---

## Competitor Feature Analysis

| Feature | Structurizr | Swark (VS Code) | GitDiagram | Reef v1.4 Approach |
|---------|-------------|-----------------|-----------|-------------------|
| Diagram storage location | External SaaS or self-hosted server | Generates on-demand, no persistence | Generates on-demand, no persistence | `.reef/` folder in repo — works offline, no server |
| Team sharing | Workspace sync via API | No sharing | No sharing | Git commit of `.reef/` — inherits team's existing git workflow |
| Re-use existing diagrams | Yes (workspace is persistent) | No (regenerates each time) | No (regenerates each time) | Yes — reads `.reef/` on import, skips generation |
| On-demand refresh | Manual "Publish" action | Explicit generation action | Explicit generation action | Manual "Regenerate and Save" button |
| Metadata/provenance | Workspace revision history | None | None | `metadata.json` with model, version, cost, timestamp |
| SVG pre-render | Yes (server renders) | No | No | Yes — SVGs stored in `.reef/` + SQLite, served at <100ms |

**Key differentiator preserved:** Reef stores everything locally in the repo itself (no SaaS account, no server, no token required for reading). Teams can share diagrams via their existing git infrastructure without new tooling.

---

## Sources

- [Structurizr DSL — Repository patterns](https://docs.structurizr.com/dsl) — MEDIUM confidence (official docs, describes per-repo workspace.dsl pattern)
- [PlantUML SVG metadata embedding](https://plantuml.com/svg) — HIGH confidence (official PlantUML docs)
- [PlantUML -checkmetadata for incremental processing](https://plantuml.com/command-line) — HIGH confidence (official PlantUML CLI reference)
- [Version Control Your Diagrams — Automated PlantUML + GitHub Actions](https://msicc.net/version-control-your-diagrams-automated-plantuml-rendering-github-actions) — MEDIUM confidence (community patterns, establishes `.puml` + `.svg` file pair convention)
- [.gitattributes for SVG merge strategies](https://git-scm.com/book/en/v2/Customizing-Git-Git-Attributes) — HIGH confidence (official git docs)
- [Swark — VS Code AI architecture diagrams](https://github.com/swark-io/swark) — MEDIUM confidence (shows on-demand-only approach as alternative pattern)
- [Nodinite C4 import/draft/active state pattern](https://docs.nodinite.com/Documentation/RepositoryModel?doc=/C4+Diagrams/Getting+Started/Creating+Your+First+C4+Diagram) — MEDIUM confidence (establishes import + state transition pattern)
- C4 model official site (c4model.com) — HIGH confidence (guides on what 4 levels to share as architecture documentation)
- Reef v1.0–v1.3 codebase audit: `c4StorageService.ts`, `generationQueueService.ts`, `c4StorageHandlers.ts`, PROJECT.md — HIGH confidence (direct code read)

---
*Feature research for: Repo-stored C4 diagram artifacts (v1.4 — `.reef/` folder)*
*Researched: 2026-03-26*
*Context: v1.0–v1.3 shipped. Goal: write and read diagram artifacts from a `.reef/` folder so teams can share diagrams via git without AI regeneration costs on every clone.*
