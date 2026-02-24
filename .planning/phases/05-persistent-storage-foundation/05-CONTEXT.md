# Phase 5: Persistent Storage Foundation - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Make diagrams survive app restarts without regeneration. Remove TTL expiration from v1.0, establish persistence, track diagram state, and migrate existing cached diagrams. This phase covers storage infrastructure — auto-generation prompts and change detection are separate phases.

</domain>

<decisions>
## Implementation Decisions

### State Display
- Badge icons in diagram header: checkmark (fresh), clock (stale), spinner (generating), warning (error)
- Single badge location — diagram header only, not on level tabs or sidebar
- "Never generated" shows centered prompt card with "Generate C4 Diagram" button
- State icons are clickable with contextual actions:
  - Stale icon → offers "Regenerate"
  - Error icon → shows error details
  - Fresh icon → tooltip "Up to date"

### Migration Behavior
- Silent migration on first v1.1 launch — no UI unless failure
- Failed diagram migrations → mark as "never generated" (user regenerates on demand)
- Delete v1.0 cache immediately after successful migration
- Expired TTL diagrams → migrate anyway, mark as "stale" in new system

### Error Recovery
- Load failures show error state with retry: error icon badge + "Failed to load" message + Retry/Regenerate buttons
- Database corruption → reset and notify: create fresh database, one-time toast "Diagram storage was reset. Diagrams will need to be regenerated."
- Settings includes "Clear All Stored Diagrams" button with confirmation
- Error messages are user-friendly only: "Could not load diagram. Try regenerating." — no technical details visible

### Storage Location
- App data folder (platform-standard): ~/Library/Application Support on Mac, %APPDATA% on Windows
- Single SQLite database for all repos (not per-repo)
- Settings displays storage path and size: "Storage: ~/Library/.../reef (45 MB)"
- When repo is removed from Reef → keep diagrams in storage (no data loss, available if re-added)

### Claude's Discretion
- Exact badge icon designs (within icon library constraints)
- SQLite schema structure
- WAL mode implementation details
- Internal state machine transitions

</decisions>

<specifics>
## Specific Ideas

- State icons should follow existing Reef icon style
- Prompt card for "never generated" should feel inviting, not like an error
- Storage size display helps users understand disk usage

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-persistent-storage-foundation*
*Context gathered: 2026-02-24*
