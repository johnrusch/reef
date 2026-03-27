# Requirements: Reef C4 Architecture Diagrams

**Defined:** 2026-03-26
**Core Value:** Users can quickly grasp unfamiliar codebase architecture through AI-generated C4 diagrams that update as code changes

## v1.4 Requirements

Requirements for milestone v1.4 Repo-Stored Diagrams. Each maps to roadmap phases.

### Storage Foundation

- [ ] **STOR-01**: User can see a `.reef/` folder created in their repository with a defined structure (per-level `.puml`, `.svg`, `metadata.json`)
- [ ] **STOR-02**: `.reef/metadata.json` includes a `schemaVersion` field for forward compatibility
- [ ] **STOR-03**: File writes to `.reef/` do not trigger false stale-diagram events in the app (chokidar exclusion)
- [ ] **STOR-04**: `.reef/` folder includes auto-generated `.gitattributes` marking SVGs as binary to prevent merge conflicts

### Write Path

- [ ] **WRITE-01**: User can generate diagrams and have `.puml` source, rendered `.svg`, and metadata automatically written to `.reef/`
- [ ] **WRITE-02**: `metadata.json` includes a hash of the analyzed source code for precise staleness detection

### Read Path

- [ ] **READ-01**: User can add a repository that has an existing `.reef/` folder and see diagrams immediately without AI generation
- [ ] **READ-02**: User sees stored SVGs displayed instantly from `.reef/` (no PlantUML rendering step)
- [ ] **READ-03**: User can import a partial `.reef/` folder (e.g., only context level) and have missing levels queued for generation

### Regeneration

- [ ] **REGEN-01**: User can manually regenerate diagrams and have the updated results saved back to `.reef/`
- [ ] **REGEN-02**: User sees a stale indicator when `.reef/` diagram data is older than recent code changes

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Team Collaboration

- **TEAM-01**: User can configure whether `.reef/` is committed to git or added to `.gitignore`
- **TEAM-02**: User receives guidance on resolving `.reef/` merge conflicts

### Advanced Storage

- **ADV-01**: Drill-down component/code sub-diagrams stored in `.reef/` (currently SQLite-only)
- **ADV-02**: Per-branch diagram variants

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-resolving `.reef/` merge conflicts | SVGs don't merge meaningfully; last-writer-wins is correct |
| Per-branch `.reef/` storage | High complexity, unclear value for v1.4 |
| Automatic background regeneration of `.reef/` | Silent API costs, no user control over spending |
| Storing drill-down sub-diagrams in `.reef/` | Unpredictable file naming, multiplies file count; top-level C4 diagrams are what teams share |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STOR-01 | Phase 17 | Pending |
| STOR-02 | Phase 17 | Pending |
| STOR-03 | Phase 17 | Pending |
| STOR-04 | Phase 17 | Pending |
| WRITE-01 | Phase 18 | Pending |
| WRITE-02 | Phase 18 | Pending |
| READ-01 | Phase 19 | Pending |
| READ-02 | Phase 19 | Pending |
| READ-03 | Phase 19 | Pending |
| REGEN-01 | Phase 20 | Pending |
| REGEN-02 | Phase 20 | Pending |

**Coverage:**
- v1.4 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 — traceability completed after roadmap creation*
