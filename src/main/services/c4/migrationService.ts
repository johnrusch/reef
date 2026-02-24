/**
 * Migration Service
 *
 * Handles one-time migration from v1.0 cache to v1.1 persistent storage.
 *
 * Key Features:
 * - Version detection via PRAGMA user_version
 * - Atomic migration with transaction
 * - TTL expiration detection (marks expired diagrams as stale)
 * - Migration lock to prevent concurrent migrations
 * - Silent migration with v1.0 cleanup
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import Store from 'electron-store';
import type { C4Level } from './types/c4Types';
import type { DiagramState } from '../../../shared/types/diagramState';

export class MigrationService {
  private static readonly V1_0_VERSION = 0; // v1.0 had no user_version set

  // V1.0 TTL constants (for determining staleness during migration)
  private static readonly CONTEXT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static readonly CONTAINER_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days
  private static readonly COMPONENT_TTL = 24 * 60 * 60 * 1000; // 1 day
  private static readonly CODE_TTL = 6 * 60 * 60 * 1000; // 6 hours

  private migrationStore: Store;

  constructor() {
    this.migrationStore = new Store({ name: 'migration-state' });
  }

  /**
   * Detect database version
   */
  detectVersion(db: Database.Database): number {
    const result = db.pragma('user_version', { simple: true }) as number;
    return result;
  }

  /**
   * Check if migration is needed
   */
  needsMigration(): boolean {
    // Check if migration already completed
    const migrationCompleted = this.migrationStore.get('v1_1_migration_completed', false) as boolean;
    if (migrationCompleted) {
      return false;
    }

    // Check if v1.0 cache database exists
    const userDataPath = app.getPath('userData');
    const v1CachePath = path.join(userDataPath, 'cache', 'diagram_cache.db');

    return fs.existsSync(v1CachePath);
  }

  /**
   * Migrate from v1.0 to v1.1
   */
  migrate(v1StorageService: any): void {
    // Check migration lock
    const migrationInProgress = this.migrationStore.get('v1_1_migration_in_progress', false) as boolean;
    if (migrationInProgress) {
      throw new Error('Migration already in progress in another instance');
    }

    // Set migration lock
    this.migrationStore.set('v1_1_migration_in_progress', true);

    try {
      const userDataPath = app.getPath('userData');
      const v1CachePath = path.join(userDataPath, 'cache', 'diagram_cache.db');

      // Open v1.0 database as readonly
      const v1Db = new Database(v1CachePath, { readonly: true });

      // Detect version
      const version = this.detectVersion(v1Db);
      if (version !== MigrationService.V1_0_VERSION) {
        console.warn(`Unexpected v1.0 database version: ${version}`);
      }

      // Get all diagrams from v1.0 cache
      const v1Diagrams = v1Db.prepare('SELECT * FROM diagram_cache').all() as any[];

      console.log(`Migrating ${v1Diagrams.length} diagrams from v1.0 to v1.1...`);

      // Migrate each diagram
      let migratedCount = 0;
      let failedCount = 0;

      for (const v1Diagram of v1Diagrams) {
        try {
          // Extract level from diagram_type (e.g., "c4_context" -> "context")
          const level = this.extractLevelFromDiagramType(v1Diagram.diagram_type);

          // Determine if diagram would have expired in v1.0
          const isExpired = this.isV1DiagramExpired(v1Diagram, level);
          const state: DiagramState = isExpired ? 'stale' : 'fresh';

          // Store in v1.1 storage
          v1StorageService.storeDiagram({
            repoPath: v1Diagram.repo_path,
            level,
            elementId: undefined, // v1.0 didn't track element_id
            diagramContent: v1Diagram.diagram_content,
            diagramMetadata: v1Diagram.diagram_metadata,
            state,
            errorMessage: undefined,
            modelUsed: v1Diagram.model_used,
            promptVersion: v1Diagram.prompt_version,
            tokensUsed: v1Diagram.tokens_used,
            generationCost: v1Diagram.generation_cost,
            createdAt: v1Diagram.created_at,
          });

          migratedCount++;
        } catch (error) {
          console.warn(`Failed to migrate diagram for ${v1Diagram.repo_path}: ${error}`);
          failedCount++;
        }
      }

      console.log(`Migration complete: ${migratedCount} migrated, ${failedCount} failed`);

      // Close v1.0 database
      v1Db.close();

      // Mark migration as completed
      this.migrationStore.set('v1_1_migration_completed', true);
    } finally {
      // Clear migration lock
      this.migrationStore.set('v1_1_migration_in_progress', false);
    }
  }

  /**
   * Clean up v1.0 cache database after successful migration
   */
  cleanupV1Cache(): void {
    const userDataPath = app.getPath('userData');
    const v1CachePath = path.join(userDataPath, 'cache', 'diagram_cache.db');

    if (fs.existsSync(v1CachePath)) {
      fs.unlinkSync(v1CachePath);
      console.log('Deleted v1.0 cache database');
    }

    // Delete WAL files if present
    const walPath = `${v1CachePath}-wal`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
      console.log('Deleted v1.0 WAL file');
    }

    const shmPath = `${v1CachePath}-shm`;
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
      console.log('Deleted v1.0 SHM file');
    }
  }

  /**
   * Extract C4Level from v1.0 diagram_type
   * v1.0 format: "c4_context", "c4_container", "c4_component", "c4_code"
   */
  extractLevelFromDiagramType(diagramType: string): C4Level {
    // Handle various v1.0 formats
    if (diagramType.includes('context')) {
      return 'context';
    } else if (diagramType.includes('container')) {
      return 'container';
    } else if (diagramType.includes('component')) {
      return 'component';
    } else if (diagramType.includes('code')) {
      return 'code';
    }

    // Default to context if unknown
    console.warn(`Unknown diagram type: ${diagramType}, defaulting to context`);
    return 'context';
  }

  /**
   * Check if v1.0 diagram would have expired based on TTL
   */
  private isV1DiagramExpired(v1Diagram: any, level: C4Level): boolean {
    const createdAt = new Date(v1Diagram.created_at).getTime();
    const now = Date.now();
    const age = now - createdAt;

    const ttlMap: Record<C4Level, number> = {
      context: MigrationService.CONTEXT_TTL,
      container: MigrationService.CONTAINER_TTL,
      component: MigrationService.COMPONENT_TTL,
      code: MigrationService.CODE_TTL,
    };

    const ttl = ttlMap[level];
    return age > ttl;
  }

  /**
   * Get TTL for a specific level (for testing/debugging)
   */
  static getTTLForLevel(level: C4Level): number {
    const ttlMap: Record<C4Level, number> = {
      context: MigrationService.CONTEXT_TTL,
      container: MigrationService.CONTAINER_TTL,
      component: MigrationService.COMPONENT_TTL,
      code: MigrationService.CODE_TTL,
    };

    return ttlMap[level];
  }
}
