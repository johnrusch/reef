/**
 * C4 Analyzer Service
 *
 * Orchestrates the complete C4 diagram generation pipeline:
 * 1. Static Analysis: Extract deterministic code structure with ts-morph
 * 2. AI Enrichment: Add architectural insights with Claude API
 * 3. PlantUML Generation: Generate C4-PlantUML syntax
 * 4. Caching: Store results with level-aware TTL
 *
 * This is the main entry point for C4 diagram generation.
 */

import { app } from 'electron';
import { join } from 'path';
import { StaticAnalyzerService } from './staticAnalyzerService';
import { AIEnricherService } from './aiEnricherService';
import { C4PlantUMLGenerator } from './c4PlantUMLGenerator';
import { C4CacheService } from './c4CacheService';
import type { C4Level } from './types/c4Types';
import type { DiagramResult } from '../../../shared/types/diagram';

export class C4AnalyzerService {
  private staticAnalyzer: StaticAnalyzerService;
  private aiEnricher: AIEnricherService;
  private generator: C4PlantUMLGenerator;
  private cache: C4CacheService;

  constructor(apiKey: string) {
    this.staticAnalyzer = new StaticAnalyzerService();
    this.aiEnricher = new AIEnricherService(apiKey);
    this.generator = new C4PlantUMLGenerator();

    // Use app.getPath for cache database location
    const cachePath = join(app.getPath('userData'), 'c4-cache.db');
    this.cache = new C4CacheService(cachePath);
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
      // Check cache first
      const cached = await this.cache.getCachedDiagram(repoPath, level, elementId);

      if (cached) {
        console.log(`[C4 Analyzer] Cache hit for ${level} diagram`);
        return {
          success: true,
          diagram: cached,
          tokensUsed: {
            input: 0,
            output: 0,
          },
        };
      }

      console.log(`[C4 Analyzer] Cache miss - generating ${level} diagram`);

      // Phase 1: Static Analysis
      console.log(`[C4 Analyzer] Phase 1: Static analysis`);
      const staticData = await this.staticAnalyzer.analyzeProject(repoPath);

      if (staticData.error) {
        return {
          success: false,
          error: `Static analysis failed: ${staticData.error}`,
        };
      }

      // Phase 2: AI Enrichment
      console.log(`[C4 Analyzer] Phase 2: AI enrichment`);
      let enrichedData: string;

      try {
        enrichedData = await this.aiEnricher.enrichArchitecture(staticData, level, elementId);
      } catch (error) {
        return {
          success: false,
          error: `AI enrichment failed: ${error instanceof Error ? error.message : String(error)}`,
        };
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

      // Cache the result
      await this.cache.setCachedDiagram(repoPath, level, plantUML, elementId);

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
    enrichedData: string,
    staticData: any,
    elementId?: string
  ): string {
    switch (level) {
      case 'context':
        return this.generator.generateContextDiagram(enrichedData, staticData);
      case 'container':
        return this.generator.generateContainerDiagram(enrichedData, staticData);
      case 'component':
        if (!elementId) {
          throw new Error('Component diagram requires elementId (container name)');
        }
        return this.generator.generateComponentDiagram(enrichedData, staticData, elementId);
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
   * Clears cached diagrams for a repository
   */
  clearRepositoryCache(repoPath: string): void {
    this.cache.clearCache(repoPath);
    console.log(`[C4 Analyzer] Cleared cache for ${repoPath}`);
  }

  /**
   * Clears expired cache entries across all repositories
   */
  clearExpiredCache(): void {
    this.cache.clearExpiredEntries();
    console.log('[C4 Analyzer] Cleared expired cache entries');
  }

  /**
   * Closes cache database connection
   */
  close(): void {
    this.cache.close();
  }
}
