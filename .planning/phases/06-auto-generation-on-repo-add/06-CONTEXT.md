# Phase 6: Auto-Generation on Repo Add - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Prompt users to generate C4 diagrams when adding repositories. Generation runs in background with progress tracking and notifications. This phase covers the prompt flow, background generation queue, progress UI, and completion/error notifications. It does NOT cover the generation logic itself (already exists from prior phases) or change detection (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Generation Prompt UX
- Modal dialog format — centered overlay, user must decide before continuing
- Cost estimate shown as a simple summary line (e.g., "Estimated: ~15k tokens (~$0.03)")
- Three action buttons: Generate Now, Skip, Always Generate for New Repos
- "Don't ask again" / skip variant: Claude's discretion on whether to include a checkbox

### Progress Experience
- Progress shown in a status bar at the bottom of the app
- Overall percentage indicator (not per-C4-level breakdown)
- Cancel button in status bar to stop generation in progress — cleans up partial results
- Multi-repo queue handling: Claude's discretion (queue vs parallel, status bar presentation)

### Completion Notifications
- Success: Toast notification (e.g., "Diagrams ready for repo-name"), auto-dismisses
- Failure: Error toast with retry button AND persistent error badge on repo in sidebar
- Toast quick-action to view diagrams: Claude's discretion
- Partial failure handling (some levels succeed, others fail): Claude's discretion

### Default Behavior & Preferences
- "Always generate" preference accessible as toggle in existing settings page
- Manual trigger for skipped repos: "Generate Now" button in diagram view empty state
- Default behavior before preference is set: Claude's discretion
- Retroactive generation for existing repos when preference enabled: Claude's discretion

### Claude's Discretion
- Modal close behavior after clicking "Generate Now" (immediate vs brief confirmation)
- Whether to include "Don't ask again" checkbox on Skip
- Multi-repo queue strategy (sequential vs parallel)
- Toast action linking to diagram view on success
- Partial failure handling strategy
- Default prompting behavior before user sets a preference
- Whether enabling "always generate" retroactively offers to generate for existing repos

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-auto-generation-on-repo-add*
*Context gathered: 2026-02-25*
