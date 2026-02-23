/**
 * Static Analysis Type Definitions
 *
 * Types for TypeScript/JavaScript code structure extraction using ts-morph.
 * These types represent the deterministic structure extracted from code,
 * before AI enrichment with architectural insights.
 */

/**
 * Information about a TypeScript class
 */
export interface ClassInfo {
  /** Class name */
  readonly name: string;
  /** Absolute file path */
  readonly file: string;
  /** Method names (instance and static) */
  readonly methods: readonly string[];
  /** Property names */
  readonly properties: readonly string[];
  /** Implemented interface names */
  readonly implements: readonly string[];
  /** Whether the class is exported */
  readonly isExported: boolean;
  /** Whether the class is abstract */
  readonly isAbstract?: boolean;
  /** Parent class name if extends another class */
  readonly extends?: string;
}

/**
 * Information about a TypeScript interface
 */
export interface InterfaceInfo {
  /** Interface name */
  readonly name: string;
  /** Absolute file path */
  readonly file: string;
  /** Property names and their types */
  readonly properties: readonly {
    name: string;
    type: string;
    optional: boolean;
  }[];
  /** Extended interface names */
  readonly extends: readonly string[];
  /** Whether the interface is exported */
  readonly isExported: boolean;
}

/**
 * Information about an import statement
 */
export interface ImportInfo {
  /** Module specifier (e.g., './service', 'react', '@/types') */
  readonly moduleSpecifier: string;
  /** File containing the import */
  readonly file: string;
  /** Named imports (e.g., ['useState', 'useEffect']) */
  readonly namedImports: readonly string[];
  /** Default import name if present */
  readonly defaultImport?: string;
  /** Namespace import name if present (e.g., 'import * as React') */
  readonly namespaceImport?: string;
  /** Whether this is a type-only import */
  readonly isTypeOnly: boolean;
}

/**
 * Project structure extracted from source code
 */
export interface ProjectStructure {
  /** All classes found in the project */
  readonly classes: readonly ClassInfo[];
  /** All interfaces found in the project */
  readonly interfaces: readonly InterfaceInfo[];
  /** All import statements */
  readonly imports: readonly ImportInfo[];
  /** All exported symbols (names only) */
  readonly exports: readonly string[];
}

/**
 * Node in the dependency graph
 */
export interface DependencyNode {
  /** File path */
  readonly file: string;
  /** Node type (e.g., 'class', 'interface', 'function', 'component') */
  readonly type: string;
  /** Symbol name */
  readonly name: string;
}

/**
 * Edge in the dependency graph
 */
export interface DependencyEdge {
  /** Source file */
  readonly from: string;
  /** Target file */
  readonly to: string;
  /** Import type (e.g., 'default', 'named', 'namespace') */
  readonly importType: 'default' | 'named' | 'namespace';
  /** Imported symbols */
  readonly symbols: readonly string[];
}

/**
 * Dependency graph representing file-to-file relationships
 */
export interface DependencyGraph {
  /** All nodes in the graph */
  readonly nodes: readonly DependencyNode[];
  /** All edges (dependencies) in the graph */
  readonly edges: readonly DependencyEdge[];
}

/**
 * Complete analysis result for a project
 */
export interface AnalysisResult {
  /** Extracted code structure */
  readonly structure: ProjectStructure;
  /** Dependency graph */
  readonly dependencies: DependencyGraph;
  /** Detected technologies from package.json and imports */
  readonly technologies: readonly string[];
  /** Entry point files (e.g., main.ts, App.tsx) */
  readonly entryPoints: readonly string[];
  /** Analysis metadata */
  readonly metadata: {
    /** Project name from package.json */
    readonly projectName: string;
    /** Number of files analyzed */
    readonly filesAnalyzed: number;
    /** Total number of files in project (excluding node_modules) */
    readonly totalFiles: number;
    /** Analysis timestamp */
    readonly timestamp: string;
    /** Analysis duration in milliseconds */
    readonly duration?: number;
  };
  /** Error message if analysis failed */
  readonly error?: string;
}

/**
 * Options for static analysis
 */
export interface AnalysisOptions {
  /** Include test files in analysis */
  readonly includeTests?: boolean;
  /** Maximum number of files to analyze (for performance) */
  readonly maxFiles?: number;
  /** File patterns to include (glob) */
  readonly includePatterns?: readonly string[];
  /** File patterns to exclude (glob) */
  readonly excludePatterns?: readonly string[];
}
