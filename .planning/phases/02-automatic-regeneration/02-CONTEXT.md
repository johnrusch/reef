# Phase 2: Automatic Regeneration - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Diagrams automatically stay current with codebase changes through intelligent cache invalidation. Users see when diagrams are stale and can regenerate with a single click. System reuses cached diagrams when unchanged to avoid unnecessary API costs.

</domain>

<decisions>
## Implementation Decisions

### Staleness indicator
- Yellow warning badge overlaid on diagram corner (inline badge approach)
- Badge includes refresh icon — attention-grabbing but not alarming
- Mark diagram stale immediately when relevant files are saved (no debounce)
- Simple "outdated" message — no file count or details

### Regeneration UX
- Click the stale badge to trigger regeneration — badge becomes a button
- Separate "Force Regenerate" button always visible in toolbar for manual regeneration anytime
- No confirmation dialog — single click regenerates immediately
- Spinner displayed on badge/button during regeneration while keeping old diagram visible

### Change detection
- Watch source code files only: .ts, .tsx, .js, .jsx
- Level-specific file awareness:
  - Code level: any source file change
  - Component level: structural changes within containers
  - Container level: high-level structure changes (new files/folders, imports)
  - Context level: only top-level structure changes (new dependencies, major rewrites)
- Use Electron's native file watcher (chokidar/fs.watch) via main process
- Persist last generation timestamp across app restarts — compare to file mtimes on startup

### Cache strategy
- Smart level mapping for invalidation:
  - Code changes invalidate Code level
  - Structural changes invalidate higher levels appropriately
  - Avoid cascade invalidation when unnecessary
- No time-based TTL — cache valid until files change
- Use existing electron-store mechanism from Phase 1
- Add "Clear Cache" option in settings/help menu for troubleshooting

### Claude's Discretion
- Exact badge positioning on diagram
- Specific file patterns per C4 level
- Debounce timing for file watcher events
- Error state handling for failed regeneration

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for file watching and caching patterns typical in Electron apps.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-automatic-regeneration*
*Context gathered: 2026-02-23*
