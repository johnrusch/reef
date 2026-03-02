/**
 * Static Analyzer Service
 *
 * Uses ts-morph to extract deterministic TypeScript structure from codebases.
 * This provides the factual foundation for AI-enriched C4 diagrams.
 *
 * Performance optimizations:
 * - skipFileDependencyResolution: Avoids loading node_modules
 * - forgetNodesCreatedInBlock: Releases memory in loops
 * - Selective file loading: Only src/**\/*.{ts,tsx} patterns
 */

import { Project, SourceFile } from 'ts-morph';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  AnalysisResult,
  AnalysisOptions,
  ProjectStructure,
  ClassInfo,
  InterfaceInfo,
  ImportInfo,
  FunctionInfo,
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
} from './types/analysisTypes';

export class StaticAnalyzerService {
  /**
   * Analyzes a TypeScript project and extracts its structure
   */
  async analyzeProject(repoPath: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      // Initialize ts-morph Project with performance optimizations
      const project = new Project({
        tsConfigFilePath: join(repoPath, 'tsconfig.json'),
        skipFileDependencyResolution: true, // Critical: Don't load node_modules
      });

      // Add source files selectively based on patterns
      const includePatterns = options.includePatterns || ['src/**/*.{ts,tsx}'];

      // Add files matching include patterns with error handling
      for (const pattern of includePatterns) {
        try {
          const fullPattern = join(repoPath, pattern);
          project.addSourceFilesAtPaths(fullPattern);
        } catch (error) {
          console.warn(`Failed to add files for pattern ${pattern}:`, error);
          // Continue with other patterns
        }
      }

      // If tests should be included, add them
      if (options.includeTests) {
        try {
          project.addSourceFilesAtPaths(join(repoPath, 'tests/**/*.{ts,tsx}'));
        } catch (error) {
          console.warn('Failed to add test files:', error);
        }
      }

      // Get all source files and filter out invalid paths
      const allSourceFiles = project.getSourceFiles();
      const sourceFiles = allSourceFiles.filter(file => {
        const filePath = file.getFilePath();
        // Filter out files with invalid paths or extremely long names
        if (filePath.length > 500 || filePath.includes('===') || filePath.includes('ADDITIONAL CONTEXT')) {
          console.warn(`Skipping file with invalid path: ${filePath.substring(0, 100)}...`);
          return false;
        }
        return true;
      });
      const totalFiles = sourceFiles.length;

      // Apply max files limit if specified
      const filesToAnalyze = options.maxFiles
        ? sourceFiles.slice(0, options.maxFiles)
        : sourceFiles;

      // Extract structure
      const classes = this.extractClasses(filesToAnalyze);
      const interfaces = this.extractInterfaces(filesToAnalyze);
      const imports = this.extractImports(filesToAnalyze);
      const exports = this.extractExports(filesToAnalyze);
      const functions = this.extractFunctions(filesToAnalyze);

      const structure: ProjectStructure = {
        classes,
        interfaces,
        imports,
        exports,
        functions,
      };

      // Build dependency graph
      const dependencies = this.buildDependencyGraph(imports, classes, interfaces);

      // Detect technologies from package.json
      const technologies = await this.detectTechnologies(repoPath);

      // Extract project name from package.json
      const projectName = await this.getProjectName(repoPath);

      // Find entry points
      const entryPoints = this.findEntryPoints(filesToAnalyze);

      const duration = Date.now() - startTime;

      return {
        structure,
        dependencies,
        technologies,
        entryPoints,
        metadata: {
          projectName,
          filesAnalyzed: filesToAnalyze.length,
          totalFiles,
          timestamp: new Date().toISOString(),
          duration,
          analysisQuality: 'full-ast',
        },
      };
    } catch (error) {
      // Handle missing tsconfig.json or other errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        structure: {
          classes: [],
          interfaces: [],
          imports: [],
          exports: [],
          functions: [],
        },
        dependencies: {
          nodes: [],
          edges: [],
        },
        technologies: [],
        entryPoints: [],
        metadata: {
          projectName: 'Unknown Project',
          filesAnalyzed: 0,
          totalFiles: 0,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          analysisQuality: 'file-structure',
        },
        error: `Analysis failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Extracts all classes from source files
   */
  private extractClasses(sourceFiles: SourceFile[]): ClassInfo[] {
    const classes: ClassInfo[] = [];

    for (const sourceFile of sourceFiles) {
      const classDeclarations = sourceFile.getClasses();

      for (const classDecl of classDeclarations) {
        const name = classDecl.getName();
        if (!name) continue; // Skip anonymous classes

        const methods = classDecl
          .getMethods()
          .map((m) => m.getName());

        const properties = classDecl
          .getProperties()
          .map((p) => p.getName());

        const implementsNames = classDecl
          .getImplements()
          .map((impl) => impl.getText());

        const extendsClause = classDecl.getExtends();

        // Extract decorators and JSDoc BEFORE forgetDescendants
        const decorators = classDecl.getDecorators().map(d => d.getName());
        const jsDocs = classDecl.getJsDocs();
        const description = jsDocs[0]?.getDescription().trim() || undefined;

        classes.push({
          name,
          file: sourceFile.getFilePath(),
          methods,
          properties,
          implements: implementsNames,
          isExported: classDecl.isExported(),
          isAbstract: classDecl.isAbstract(),
          extends: extendsClause?.getText(),
          decorators,
          description,
        });
      }

      // Release memory after all data extracted
      sourceFile.forgetDescendants();
    }

    return classes;
  }

  /**
   * Extracts all interfaces from source files
   */
  private extractInterfaces(sourceFiles: SourceFile[]): InterfaceInfo[] {
    const interfaces: InterfaceInfo[] = [];

    for (const sourceFile of sourceFiles) {
      const interfaceDeclarations = sourceFile.getInterfaces();

      for (const interfaceDecl of interfaceDeclarations) {
        const name = interfaceDecl.getName();

        const properties = interfaceDecl.getProperties().map((prop) => ({
          name: prop.getName(),
          type: prop.getType().getText(),
          optional: prop.hasQuestionToken() || false,
        }));

        const extendsNames = interfaceDecl
          .getExtends()
          .map((ext) => ext.getText());

        interfaces.push({
          name,
          file: sourceFile.getFilePath(),
          properties,
          extends: extendsNames,
          isExported: interfaceDecl.isExported(),
        });
      }

      // Release memory after all data extracted
      sourceFile.forgetDescendants();
    }

    return interfaces;
  }

  /**
   * Extracts all import declarations from source files
   */
  private extractImports(sourceFiles: SourceFile[]): ImportInfo[] {
    const imports: ImportInfo[] = [];

    for (const sourceFile of sourceFiles) {
      const importDeclarations = sourceFile.getImportDeclarations();

      for (const importDecl of importDeclarations) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        const defaultImport = importDecl.getDefaultImport()?.getText();
        const namespaceImport = importDecl.getNamespaceImport()?.getText();
        const namedImports = importDecl
          .getNamedImports()
          .map((named) => named.getName());

        imports.push({
          moduleSpecifier,
          file: sourceFile.getFilePath(),
          namedImports,
          defaultImport,
          namespaceImport,
          isTypeOnly: importDecl.isTypeOnly(),
        });
      }

      // Release memory after all data extracted
      sourceFile.forgetDescendants();
    }

    return imports;
  }

  /**
   * Extracts all exported symbols from source files
   */
  private extractExports(sourceFiles: SourceFile[]): string[] {
    const exports: string[] = [];

    for (const sourceFile of sourceFiles) {
      // Get exported declarations
      const exportedDeclarations = sourceFile.getExportedDeclarations();

      for (const [name] of exportedDeclarations) {
        exports.push(name);
      }

      // Release memory after all data extracted
      sourceFile.forgetDescendants();
    }

    return [...new Set(exports)]; // Deduplicate
  }

  /**
   * Extracts all exported functions from source files
   */
  private extractFunctions(sourceFiles: SourceFile[]): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      const functionDeclarations = sourceFile.getFunctions();

      for (const funcDecl of functionDeclarations) {
        const name = funcDecl.getName();
        if (!name) continue; // Skip anonymous functions

        // Only include exported functions
        if (!funcDecl.isExported()) continue;

        const returnType = funcDecl.getReturnType().getText();
        const isAsync = funcDecl.isAsync();
        const jsDocs = funcDecl.getJsDocs();
        const jsDocDescription = jsDocs[0]?.getDescription().trim() || undefined;

        const isSignificant = this.classifyFunctionSignificance(name, filePath);

        functions.push({
          name,
          file: filePath,
          returnType,
          isAsync,
          isExported: true,
          isSignificant,
          jsDocDescription,
        });
      }

      // Release memory after all data extracted
      sourceFile.forgetDescendants();
    }

    return functions;
  }

  /**
   * Classifies whether a function is architecturally significant
   */
  private classifyFunctionSignificance(name: string, filePath: string): boolean {
    // React hooks: start with "use" + uppercase letter
    if (/^use[A-Z]/.test(name)) return true;
    // Handler patterns
    if (/Handler$|Controller$|Route$|Middleware$/.test(name)) return true;
    // File location: files in significant directories
    if (/\/(services|routes|api|controllers|hooks|middleware)\//i.test(filePath)) return true;
    // Default: not significant
    return false;
  }

  /**
   * Builds dependency graph from imports and declarations
   */
  private buildDependencyGraph(
    imports: ImportInfo[],
    classes: ClassInfo[],
    interfaces: InterfaceInfo[]
  ): DependencyGraph {
    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];

    // Create nodes for classes
    for (const cls of classes) {
      nodes.push({
        file: cls.file,
        type: 'class',
        name: cls.name,
      });
    }

    // Create nodes for interfaces
    for (const iface of interfaces) {
      nodes.push({
        file: iface.file,
        type: 'interface',
        name: iface.name,
      });
    }

    // Create edges from imports
    for (const importInfo of imports) {
      // Determine import type
      let importType: 'default' | 'named' | 'namespace';
      if (importInfo.namespaceImport) {
        importType = 'namespace';
      } else if (importInfo.defaultImport) {
        importType = 'default';
      } else {
        importType = 'named';
      }

      // Collect all imported symbols
      const symbols: string[] = [];
      if (importInfo.defaultImport) symbols.push(importInfo.defaultImport);
      if (importInfo.namespaceImport) symbols.push(importInfo.namespaceImport);
      symbols.push(...importInfo.namedImports);

      // Only create edges for local imports (relative paths)
      if (importInfo.moduleSpecifier.startsWith('.') || importInfo.moduleSpecifier.startsWith('@/')) {
        edges.push({
          from: importInfo.file,
          to: importInfo.moduleSpecifier,
          importType,
          symbols,
        });
      }
    }

    return {
      nodes,
      edges,
    };
  }

  /**
   * Detects technologies from package.json dependencies
   */
  private async detectTechnologies(repoPath: string): Promise<string[]> {
    try {
      const packageJsonPath = join(repoPath, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      const technologies: Set<string> = new Set();

      // Check dependencies and devDependencies
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Map of package names to technology names
      const techMapping: Record<string, string> = {
        'react': 'React',
        'react-dom': 'React',
        'vue': 'Vue',
        'angular': 'Angular',
        'electron': 'Electron',
        'express': 'Express',
        'fastify': 'Fastify',
        'next': 'Next.js',
        'nuxt': 'Nuxt',
        'vite': 'Vite',
        'webpack': 'Webpack',
        'typescript': 'TypeScript',
        'zustand': 'Zustand',
        'redux': 'Redux',
        'mobx': 'MobX',
        'tailwindcss': 'Tailwind CSS',
        'postgres': 'PostgreSQL',
        'mongodb': 'MongoDB',
        'mysql': 'MySQL',
        'prisma': 'Prisma',
        'graphql': 'GraphQL',
        'apollo': 'Apollo',
        'jest': 'Jest',
        'vitest': 'Vitest',
        'playwright': 'Playwright',
      };

      for (const [pkg, tech] of Object.entries(techMapping)) {
        if (allDeps[pkg]) {
          technologies.add(tech);
        }
      }

      return Array.from(technologies).sort();
    } catch (error) {
      // If package.json doesn't exist or can't be read, return empty array
      return [];
    }
  }

  /**
   * Gets project name from package.json
   */
  private async getProjectName(repoPath: string): Promise<string> {
    try {
      const packageJsonPath = join(repoPath, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      // Use package.json name field, fallback to directory name
      if (packageJson.name) {
        return packageJson.name;
      }

      // Fallback: use the directory name
      return repoPath.split('/').pop() || 'Unknown Project';
    } catch (error) {
      // If package.json doesn't exist or can't be read, use directory name
      return repoPath.split('/').pop() || 'Unknown Project';
    }
  }

  /**
   * Finds entry point files (main.ts, App.tsx, index.ts patterns)
   */
  private findEntryPoints(sourceFiles: SourceFile[]): string[] {
    const entryPoints: string[] = [];

    const entryPointPatterns = [
      /main\.tsx?$/,
      /index\.tsx?$/,
      /App\.tsx$/,
      /app\.tsx?$/,
      /server\.ts$/,
    ];

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();

      for (const pattern of entryPointPatterns) {
        if (pattern.test(filePath)) {
          entryPoints.push(filePath);
          break; // Only add once per file
        }
      }
    }

    return entryPoints;
  }
}
