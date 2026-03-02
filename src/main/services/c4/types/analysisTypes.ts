/**
 * Static Analysis Type Definitions
 *
 * Types for TypeScript/JavaScript code structure extraction using ts-morph.
 * These types represent the deterministic structure extracted from code,
 * before AI enrichment with architectural insights.
 */

/**
 * Information about an exported function
 */
export interface FunctionInfo {
  /** Function name */
  readonly name: string;
  /** Absolute file path */
  readonly file: string;
  /** Return type text */
  readonly returnType: string;
  /** Whether the function is async */
  readonly isAsync: boolean;
  /** Whether the function is exported */
  readonly isExported: boolean;
  /** Whether the function is architecturally significant */
  readonly isSignificant: boolean;
  /** JSDoc description if present */
  readonly jsDocDescription?: string;
}

/**
 * Group of related components (for C4 component grouping)
 */
export interface ComponentGroup {
  /** Raw directory/module name */
  readonly rawName: string;
  /** Human-readable label */
  readonly label: string;
  /** Files in this group */
  readonly files: readonly string[];
  /** Number of classes in this group */
  readonly classCount: number;
  /** Number of functions in this group */
  readonly functionCount: number;
}

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
  /** Decorator names applied to this class */
  readonly decorators: readonly string[];
  /** First JSDoc description if present */
  readonly description?: string;
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
  /** All exported functions found in the project */
  readonly functions: readonly FunctionInfo[];
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
    /** Quality level of analysis performed */
    readonly analysisQuality: 'full-ast' | 'js-ast' | 'file-structure';
    /** Warning message if analysis quality was degraded */
    readonly analysisWarning?: string;
    /** Whether results are partial (e.g., due to maxFiles limit) */
    readonly partialResults?: boolean;
  };
  /** Error message if analysis failed */
  readonly error?: string;
  /** Component groups for C4 diagram generation */
  readonly componentGroups?: readonly ComponentGroup[];
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
