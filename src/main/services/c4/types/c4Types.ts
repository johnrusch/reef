/**
 * C4 Model Type Definitions
 *
 * Comprehensive type system for C4 architecture diagrams:
 * - Context: System landscape and external dependencies
 * - Container: High-level technology choices and deployable units
 * - Component: Logical groupings within containers
 * - Code: Implementation-level class diagrams
 */

/**
 * C4 abstraction levels following the C4 model
 */
export type C4Level = 'context' | 'container' | 'component' | 'code';

/**
 * Element types at each C4 level
 */
export type C4ElementType =
  // Context level
  | 'person'
  | 'system'
  | 'external_system'
  // Container level
  | 'container'
  | 'database'
  | 'queue'
  // Component level
  | 'component'
  // Code level
  | 'class'
  | 'interface';

/**
 * Base metadata for all C4 elements
 */
export interface C4ElementMetadata {
  /** Element name */
  readonly name: string;
  /** Element type */
  readonly type: C4ElementType;
  /** Human-readable description */
  readonly description?: string;
  /** Technology stack (e.g., "React", "Node.js", "PostgreSQL") */
  readonly technology?: string;
  /** Custom tags for filtering and grouping */
  readonly tags?: readonly string[];
}

/**
 * Hierarchical ID structure for drill-down navigation
 * Enables traversing from high-level systems down to code
 */
export interface C4ElementId {
  /** System identifier (context level) */
  readonly systemId?: string;
  /** Container identifier (container level) */
  readonly containerId?: string;
  /** Component identifier (component level) */
  readonly componentId?: string;
  /** Class/Interface identifier (code level) */
  readonly classId?: string;
}

/**
 * Relationship between C4 elements
 */
export interface C4Relationship {
  /** Source element ID */
  readonly from: string;
  /** Target element ID */
  readonly to: string;
  /** Relationship label (e.g., "uses", "extends", "calls") */
  readonly label: string;
  /** Technology used for the relationship (e.g., "HTTP/REST", "gRPC", "async") */
  readonly technology?: string;
  /** Additional description */
  readonly description?: string;
}

/**
 * Cache TTL constants for each C4 level
 * Based on update frequency research:
 * - Context: Rarely changes (system boundaries)
 * - Container: Changes with deployments
 * - Component: Changes with refactoring
 * - Code: Changes frequently with development
 */
export const C4_CACHE_TTL = {
  /** Context level: 7 days (system boundaries rarely change) */
  context: 7 * 24 * 60 * 60 * 1000,
  /** Container level: 3 days (deployment architecture changes occasionally) */
  container: 3 * 24 * 60 * 60 * 1000,
  /** Component level: 1 day (component structure changes with refactoring) */
  component: 24 * 60 * 60 * 1000,
  /** Code level: 6 hours (code changes frequently during development) */
  code: 6 * 60 * 60 * 1000,
} as const;

/**
 * C4 diagram type mapping
 */
export type C4DiagramType =
  | 'c4-context'
  | 'c4-container'
  | 'c4-component'
  | 'c4-code';

/**
 * Maps C4 diagram type to C4 level
 */
export function getDiagramLevel(diagramType: C4DiagramType): C4Level {
  const mapping: Record<C4DiagramType, C4Level> = {
    'c4-context': 'context',
    'c4-container': 'container',
    'c4-component': 'component',
    'c4-code': 'code',
  };
  return mapping[diagramType];
}

/**
 * Gets cache TTL for a given C4 level
 */
export function getCacheTTL(level: C4Level): number {
  return C4_CACHE_TTL[level];
}
