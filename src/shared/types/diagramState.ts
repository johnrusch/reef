/**
 * Diagram State Type Definitions
 *
 * Type system for v1.1 persistent storage and state management.
 * Replaces v1.0 TTL-based cache with state-tracking persistence.
 */

import type { C4Level } from '../../main/services/c4/types/c4Types';

/**
 * Diagram lifecycle states
 */
export type DiagramState =
  | 'never_generated'  // Diagram has never been generated for this repo/level
  | 'generating'       // Diagram generation in progress
  | 'fresh'            // Diagram is up-to-date with current code
  | 'stale'            // Code has changed since diagram was generated
  | 'error';           // Last generation attempt failed

/**
 * Diagram state entry for UI state management
 */
export interface DiagramStateEntry {
  /** Repository path (normalized to forward slashes) */
  repoPath: string;
  /** C4 abstraction level */
  level: C4Level;
  /** Optional element ID for drill-down diagrams */
  elementId?: string;
  /** Current state of the diagram */
  state: DiagramState;
  /** Error message if state is 'error' */
  errorMessage?: string;
  /** When this state entry was created */
  createdAt: string;
  /** When this state entry was last updated */
  updatedAt: string;
}

/**
 * Stored diagram record in SQLite database
 */
export interface StoredDiagram {
  /** Autoincrement primary key */
  id?: number;
  /** Repository path (normalized to forward slashes) */
  repoPath: string;
  /** C4 abstraction level */
  level: C4Level;
  /** Optional element ID for drill-down diagrams */
  elementId?: string;
  /** Mermaid diagram content */
  diagramContent: string;
  /** Optional metadata JSON string */
  diagramMetadata?: string;
  /** Current state of the diagram */
  state: DiagramState;
  /** Error message if state is 'error' */
  errorMessage?: string;
  /** AI model used for generation (e.g., "claude-opus-4") */
  modelUsed: string;
  /** Prompt version identifier for cache invalidation */
  promptVersion: string;
  /** Number of tokens used during generation */
  tokensUsed?: number;
  /** Cost of generation in USD */
  generationCost?: number;
  /** When diagram was first created (ISO timestamp) */
  createdAt: string;
  /** When diagram was last updated (ISO timestamp) */
  updatedAt: string;
}
