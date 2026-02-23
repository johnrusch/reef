## Pre-existing TypeScript Errors (discovered during 01-05)

**Issue:** DiagramSettings type mismatch between renderer and preload
**Location:** src/renderer/components/DiagramSettings/DiagramSettings.tsx:58
**Details:** DiagramType includes C4 types ('c4-context', etc.) but preload interface only knows about old types ('component', 'class', 'sequence')
**Impact:** Type checking fails but build succeeds
**Scope:** Out of scope for 01-05 (pre-existing)
**Discovery date:** 2026-02-23
