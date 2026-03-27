/**
 * C4 Analyzer Service
 *
 * Orchestrates the complete C4 diagram generation pipeline:
 * 1. Static Analysis: Extract deterministic code structure with ts-morph
 * 2. AI Enrichment: Add architectural insights with Claude API
 * 3. PlantUML Generation: Generate C4-PlantUML syntax
 * 4. Storage: Persist results with v1.1 C4StorageService
 *
 * This is the main entry point for C4 diagram generation.
 */

import { StaticAnalyzerService } from './staticAnalyzerService';
import { AIEnricherService } from './aiEnricherService';
import { C4PlantUMLGenerator } from './c4PlantUMLGenerator';
import { getStorageService } from './c4StorageHandlers';
import { ElementIdRegistry, sanitizeId, deriveContainerPath } from './elementIdRegistry';
import type { C4Level } from './types/c4Types';
import type { DiagramResult } from '../../../shared/types/diagram';
import type { AnalysisResult } from './types/analysisTypes';
import type { StoredDiagram } from '../../../shared/types/diagramState';
import type { EnrichedArchitecture } from './types/enrichmentTypes';

// Module-level cache of analyzed file paths per generation run.
// Keyed by "repoPath:level:elementId" — consumed by store-svg handler for source hash.
const analyzedFilePathsCache = new Map<string, string[]>();

export function getAnalyzedFilePaths(repoPath: string, level: string, elementId?: string): string[] | undefined {
  const key = [repoPath, level, elementId ?? ''].join(':');
  return analyzedFilePathsCache.get(key);
}

export function clearAnalyzedFilePaths(repoPath: string, level: string, elementId?: string): void {
  const key = [repoPath, level, elementId ?? ''].join(':');
  analyzedFilePathsCache.delete(key);
}

export class C4AnalyzerService {
  private staticAnalyzer: StaticAnalyzerService;
  private aiEnricher: AIEnricherService;
  private generator: C4PlantUMLGenerator;
  private registry: ElementIdRegistry;

  constructor(apiKey: string) {
    this.staticAnalyzer = new StaticAnalyzerService();
    this.aiEnricher = new AIEnricherService(apiKey);
    this.generator = new C4PlantUMLGenerator();
    this.registry = new ElementIdRegistry();
  }

  /**
   * Generates C4 diagram for a repository at specified level
   * Implements three-phase pipeline with caching
   */
  async generateC4Diagram(
    repoPath: string,
    level: C4Level,
    elementId?: string
  ): Promise<DiagramResult> {
    try {
      // Check persistent storage first
      const cached = getStorageService().getDiagram(repoPath, level, elementId);

      if (cached && cached.diagramContent) {
        console.log(`[C4 Analyzer] Storage hit for ${level} diagram`);

        // Populate registry on cache hit so drill-down clicks resolve paths.
        // Only needed for container level (produces IDs used in component drill-down).
        if (level === 'container') {
          try {
            const staticData = await this.staticAnalyzer.analyzeProject(repoPath);
            if (!staticData.error) {
              this.populateRegistryFromStatic(staticData);
            }
          } catch (err) {
            console.warn('[C4 Analyzer] Registry population on cache hit failed:', err);
          }
        }

        return {
          success: true,
          diagram: cached.diagramContent,
          tokensUsed: {
            input: 0,
            output: 0,
          },
        };
      }

      console.log(`[C4 Analyzer] Storage miss - generating ${level} diagram`);

      // Phase 1: Static Analysis
      console.log(`[C4 Analyzer] Phase 1: Static analysis`);
      const staticData = await this.staticAnalyzer.analyzeProject(repoPath);

      if (staticData.error) {
        return {
          success: false,
          error: `Static analysis failed: ${staticData.error}`,
        };
      }

      // Extract unique file paths from static analysis for source hash computation (D-03, D-04)
      const filePathSet = new Set<string>();
      for (const cls of staticData.structure.classes) { filePathSet.add(cls.file); }
      for (const iface of staticData.structure.interfaces) { filePathSet.add(iface.file); }
      for (const fn of staticData.structure.functions) { filePathSet.add(fn.file); }

      const cacheKey = [repoPath, level, elementId ?? ''].join(':');
      analyzedFilePathsCache.set(cacheKey, Array.from(filePathSet));

      // Phase 2: AI Enrichment
      console.log(`[C4 Analyzer] Phase 2: AI enrichment`);
      let enrichedData: EnrichedArchitecture | null = null;

      try {
        enrichedData = await this.aiEnricher.enrichArchitecture(staticData, level, elementId);
      } catch (error) {
        console.warn(`[C4 Analyzer] AI enrichment failed, using static analysis only: ${error instanceof Error ? error.message : String(error)}`);
        // Continue with enrichedData = null — generator will use static fallback
      }

      // Phase 3: PlantUML Generation
      console.log(`[C4 Analyzer] Phase 3: PlantUML generation`);
      let plantUML: string;

      try {
        plantUML = this.generatePlantUML(level, enrichedData, staticData, elementId);
      } catch (error) {
        return {
          success: false,
          error: `PlantUML generation failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      // Persist the result to v1.1 storage
      const storedDiagram: StoredDiagram = {
        repoPath,
        level,
        elementId,
        diagramContent: plantUML,
        state: 'fresh',
        modelUsed: 'haiku', // TODO: Pass from options
        promptVersion: '1.0',
        tokensUsed: undefined,
        generationCost: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      getStorageService().storeDiagram(storedDiagram);

      console.log(`[C4 Analyzer] Successfully generated ${level} diagram`);

      return {
        success: true,
        diagram: plantUML,
        tokensUsed: {
          input: 0, // Token tracking handled by aiEnricher logs
          output: 0,
        },
        coverage: {
          analyzedFiles: staticData.metadata.filesAnalyzed,
          totalFiles: staticData.metadata.totalFiles,
          percentage: Math.round(
            (staticData.metadata.filesAnalyzed / staticData.metadata.totalFiles) * 100
          ),
        },
      };
    } catch (error) {
      console.error('[C4 Analyzer] Unexpected error:', error);

      return {
        success: false,
        error: `C4 diagram generation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Generates PlantUML code based on level
   */
  private generatePlantUML(
    level: C4Level,
    enrichedData: EnrichedArchitecture | null,
    staticData: AnalysisResult,
    elementId?: string
  ): string {
    // Import level-specific types for proper casting
    type EnrichedContextLevel = import('./types/enrichmentTypes').EnrichedContextLevel;
    type EnrichedContainerLevel = import('./types/enrichmentTypes').EnrichedContainerLevel;
    type EnrichedComponentLevel = import('./types/enrichmentTypes').EnrichedComponentLevel;

    switch (level) {
      case 'context':
        return this.generator.generateContextDiagram(enrichedData as EnrichedContextLevel | null, staticData);
      case 'container':
        return this.generator.generateContainerDiagram(
          enrichedData as EnrichedContainerLevel | null,
          staticData,
          this.registry  // Pass registry for population during generation
        );
      case 'component': {
        if (!elementId) {
          throw new Error('Component diagram requires elementId (container name)');
        }
        // Resolve containerPath from registry (populated during container generation).
        // Falls back to dynamic derivation for cold-start or unknown IDs.
        const containerPath = this.registry.getContainerPath(elementId)
          ?? deriveContainerPath(elementId, staticData);
        return this.generator.generateComponentDiagram(
          enrichedData as EnrichedComponentLevel | null,
          staticData,
          elementId,
          containerPath
        );
      }
      case 'code':
        if (!elementId) {
          throw new Error('Code diagram requires elementId (component name)');
        }
        return this.generator.generateCodeDiagram(enrichedData, staticData, elementId);
      default:
        throw new Error(`Unknown C4 level: ${level}`);
    }
  }

  /**
   * Populates the registry from static analysis data.
   * Used on cache-hit paths so drill-down clicks can resolve container paths
   * without re-running full container diagram generation.
   */
  private populateRegistryFromStatic(staticData: AnalysisResult): void {
    const containers = new Set<string>();
    for (const ep of staticData.entryPoints) {
      const parts = ep.split('/');
      const srcIdx = parts.indexOf('src');
      if (srcIdx >= 0 && srcIdx + 1 < parts.length) {
        const dirName = parts[srcIdx + 1];
        // Construct human-readable name (capitalize first letter)
        const humanName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
        const containerPath = parts.slice(0, srcIdx + 2).join('/');
        const sanitized = sanitizeId(humanName);
        if (!containers.has(sanitized)) {
          containers.add(sanitized);
          this.registry.register(sanitized, humanName, containerPath, 'container');
        }
      }
    }
  }

  /**
   * Clears stored diagrams and registry for a repository
   */
  clearRepositoryCache(repoPath: string): void {
    getStorageService().deleteDiagramsForRepo(repoPath);
    this.registry.clear();
    console.log(`[C4 Analyzer] Cleared diagrams and registry for ${repoPath}`);
  }

  /**
   * Gets available containers from a repository's static analysis
   * These are the deployable units that can be used for Component-level diagrams
   */
  async getAvailableContainers(repoPath: string): Promise<string[]> {
    try {
      const staticData = await this.staticAnalyzer.analyzeProject(repoPath);

      if (staticData.error) {
        console.error('[C4 Analyzer] Failed to analyze project:', staticData.error);
        return [];
      }

      // Containers are typically identified by:
      // 1. Entry points (main process, renderer, preload)
      // 2. Top-level directories in src/
      const containers = new Set<string>();

      // Add entry points as containers
      staticData.entryPoints.forEach(entryPoint => {
        // Extract container name from path (e.g., src/main/main.ts -> main)
        const parts = entryPoint.split('/');
        const srcIndex = parts.indexOf('src');
        if (srcIndex >= 0 && srcIndex + 1 < parts.length) {
          containers.add(parts[srcIndex + 1]);
        }
      });

      // If no containers found from entry points, infer from directory structure
      if (containers.size === 0 && staticData.structure.classes.length > 0) {
        staticData.structure.classes.forEach(cls => {
          const parts = cls.file.split('/');
          const srcIndex = parts.indexOf('src');
          if (srcIndex >= 0 && srcIndex + 1 < parts.length) {
            containers.add(parts[srcIndex + 1]);
          }
        });
      }

      return Array.from(containers).sort();
    } catch (error) {
      console.error('[C4 Analyzer] Error getting available containers:', error);
      return [];
    }
  }

  /**
   * Gets available components from a repository's static analysis
   * These are the logical groupings that can be used for Code-level diagrams
   */
  async getAvailableComponents(repoPath: string): Promise<string[]> {
    try {
      const staticData = await this.staticAnalyzer.analyzeProject(repoPath);

      if (staticData.error) {
        console.error('[C4 Analyzer] Failed to analyze project:', staticData.error);
        return [];
      }

      // Components are typically service classes, controllers, or major classes
      const components = staticData.structure.classes
        .filter(cls => {
          // Include classes that are:
          // 1. Exported (public API)
          // 2. Named like services, controllers, managers, handlers
          return (
            cls.isExported &&
            (cls.name.endsWith('Service') ||
              cls.name.endsWith('Controller') ||
              cls.name.endsWith('Manager') ||
              cls.name.endsWith('Handler') ||
              cls.name.endsWith('Store') ||
              cls.name.endsWith('Repository'))
          );
        })
        .map(cls => cls.name)
        .sort();

      return components;
    } catch (error) {
      console.error('[C4 Analyzer] Error getting available components:', error);
      return [];
    }
  }

  /**
   * No-op: storage lifecycle managed by cleanupC4Storage() singleton in main.ts.
   * Calling .close() on the shared singleton would close the connection and break
   * all subsequent storage operations — singleton lifecycle is managed at app shutdown.
   */
  close(): void {
    // No-op: storage lifecycle managed by cleanupC4Storage() singleton in main.ts
  }
}
