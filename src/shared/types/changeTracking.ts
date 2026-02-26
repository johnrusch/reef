/**
 * Change Tracking Types
 *
 * Shared types for the ChangeTrackingService pipeline.
 * Used by both main process (change tracking) and renderer (state display).
 */

import type { C4Level } from '../../main/services/c4/types/c4Types';

/**
 * Represents a C4 element affected by one or more file changes.
 * Used to communicate which named elements are stale.
 */
export interface AffectedElement {
  /** The C4 abstraction level of this element */
  level: C4Level;
  /** Sanitized PlantUML ID, e.g. "Services" */
  elementId: string;
  /** Human-readable name, e.g. "Services" */
  elementName: string;
  /** true = file directly in this element; false = propagated from child element */
  isDirect: boolean;
}

/**
 * Payload describing accumulated file changes and their C4 element mappings.
 * Persisted to SQLite and optionally attached to IPC events.
 */
export interface ChangeTrackingPayload {
  /** Normalized file paths that changed */
  changedFiles: string[];
  /** All affected C4 elements (direct + propagated) */
  affectedElements: AffectedElement[];
  /** Count of direct elements per level, e.g. { container: 1, component: 3, code: 5 } */
  elementCounts: Record<string, number>;
}

/**
 * Extended IPC payload for the c4-storage:state-changed event.
 * Phase 7 adds changedFiles and affectedElements fields (optional for backwards compatibility).
 */
export interface StateChangedPayload {
  repoPath: string;
  level: C4Level;
  state: string;
  elementId?: string;
  errorMessage?: string;
  // Phase 7 additions (optional for backwards compatibility):
  changedFiles?: string[];
  affectedElements?: AffectedElement[];
}
