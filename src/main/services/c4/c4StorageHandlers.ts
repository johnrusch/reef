import { ipcMain, BrowserWindow } from 'electron';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { C4StorageService } from './c4StorageService';
import { MigrationService } from './migrationService';
import { svgLruCache } from '../plantUmlService';
import { ReefStorageService } from '../reef/reefStorageService';
import { computeSourceHash } from '../reef/sourceHashService';
import { getAnalyzedFilePaths, clearAnalyzedFilePaths } from './c4AnalyzerService';
import { extractElementIds } from './generationQueueService';
import { REEF_SCHEMA_VERSION, FLAT_LEVELS, REEF_DIR } from '../reef/reefStorageTypes';
import { importReefArtifacts } from '../reef/reefImportService';
import type { ReefMetaJson, FlatLevel, NestedLevel } from '../reef/reefStorageTypes';
import type { DiagramState, StoredDiagram } from '../../../shared/types/diagramState';
import type { C4Level } from './types/c4Types';

// Singleton instance
let storageService: C4StorageService | null = null;

export const getStorageService = (): C4StorageService => {
  if (!storageService) {
    storageService = new C4StorageService();
  }
  return storageService;
};

// ReefStorageService singleton (for .reef/ file writes)
let reefStorage: ReefStorageService | null = null;
const getReefStorage = (): ReefStorageService => {
  if (!reefStorage) { reefStorage = new ReefStorageService(); }
  return reefStorage;
};

/**
 * Write .reef/ artifacts (.puml, .svg, .meta.json) for a given diagram level.
 *
 * Retrieves puml from SQLite, computes sourceHash from analyzed file paths,
 * and writes files atomically via ReefStorageService.
 *
 * Non-fatal: errors are caught internally and do not propagate to callers (D-10).
 * Callers should use the returned promise only to detect completion, not errors.
 */
export async function writeReefArtifacts(
  repoPath: string,
  level: string,
  svg: string,
  elementId?: string
): Promise<void> {
  try {
    // Retrieve puml from SQLite (stored earlier by store-diagram handler)
    const diagram = getStorageService().getDiagram(repoPath, level as C4Level, elementId);
    if (!diagram?.diagramContent) {
      // No puml available — skip .reef/ write (edge case: SVG stored without prior diagram)
      return;
    }

    const puml = diagram.diagramContent;

    // Compute source hash from analyzed file paths (D-03, D-04)
    const filePaths = getAnalyzedFilePaths(repoPath, level, elementId);
    const sourceHash = filePaths ? await computeSourceHash(filePaths) : undefined;

    // Clean up cached file paths after consumption
    clearAnalyzedFilePaths(repoPath, level, elementId);

    // Build metadata
    const meta: ReefMetaJson = {
      schemaVersion: REEF_SCHEMA_VERSION,
      level: level as ReefMetaJson['level'],
      generatedAt: new Date().toISOString(),
      modelUsed: diagram.modelUsed,
      promptVersion: diagram.promptVersion,
      sourceHash,
    };

    // Write to .reef/ — per-level incremental (D-01)
    const isFlatLevel = (FLAT_LEVELS as readonly string[]).includes(level);
    if (isFlatLevel) {
      await getReefStorage().writeLevelFiles(repoPath, level as FlatLevel, puml, svg, meta);
    } else if (elementId) {
      await getReefStorage().writeSubDiagramFiles(repoPath, level as NestedLevel, elementId, puml, svg, meta);
    }
    // If nested level but no elementId, skip — cannot determine subdirectory
  } catch (err) {
    // D-10: .reef/ write failure is non-fatal — log and continue
    console.warn(`[c4StorageHandlers] .reef/ write failed for ${level} (non-fatal):`, err);
  }
}

/**
 * Register all C4 storage IPC handlers
 * Called during app initialization in main.ts
 */
export function registerC4StorageHandlers(): void {
  // Initialize storage and run migration if needed
  ipcMain.handle('c4-storage:initialize', async () => {
    const migration = new MigrationService();

    if (migration.needsMigration()) {
      try {
        // Pass the storage service to migrate method so it can store diagrams
        migration.migrate(getStorageService());
        migration.cleanupV1Cache();
      } catch (error) {
        console.error('Migration failed:', error);
        // Continue anyway - diagrams will be marked as never_generated
      }
    }

    return { initialized: true };
  });

  // Get diagram
  ipcMain.handle('c4-storage:get-diagram', async (_, repoPath: string, level: string, elementId?: string) => {
    return getStorageService().getDiagram(repoPath, level as C4Level, elementId);
  });

  // Store diagram
  ipcMain.handle('c4-storage:store-diagram', async (_, diagram: StoredDiagram) => {
    getStorageService().storeDiagram(diagram);
    return { success: true };
  });

  // Update state
  ipcMain.handle('c4-storage:update-state', async (_, repoPath: string, level: string, state: DiagramState, elementId?: string, errorMessage?: string) => {
    getStorageService().updateState(repoPath, level as C4Level, state, elementId, errorMessage);

    // Clear change tracking when diagram becomes fresh or starts regenerating
    if (state === 'fresh' || state === 'generating') {
      getStorageService().clearChangeTracking(repoPath, level as C4Level);
    }

    // Notify all windows of state change
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('c4-storage:state-changed', {
        repoPath,
        level,
        elementId,
        state,
        errorMessage,
      });
    });

    return { success: true };
  });

  // Get state
  ipcMain.handle('c4-storage:get-state', async (_, repoPath: string, level: string, elementId?: string) => {
    return getStorageService().getState(repoPath, level as C4Level, elementId);
  });

  // Get all states for repo
  ipcMain.handle('c4-storage:get-repo-states', async (_, repoPath: string) => {
    const diagrams = getStorageService().getAllDiagramsForRepo(repoPath);
    return diagrams.map(d => ({
      repoPath: d.repoPath,
      level: d.level,
      elementId: d.elementId,
      state: d.state,
      errorMessage: d.errorMessage,
    }));
  });

  // Get storage stats (for Settings display)
  ipcMain.handle('c4-storage:get-stats', async () => {
    return getStorageService().getStorageStats();
  });

  // Clear all diagrams (for Settings "Clear All" button)
  ipcMain.handle('c4-storage:clear-all', async () => {
    getStorageService().clearAllDiagrams();
    svgLruCache.invalidate(''); // Clear entire LRU (empty prefix matches all)
    return { success: true };
  });

  // Get change tracking data for a repo+level
  ipcMain.handle('c4-storage:get-change-tracking', async (_, repoPath: string, level: string) => {
    return getStorageService().getChangeTracking(repoPath, level as C4Level);
  });

  // Clear change tracking data (called when regenerating)
  ipcMain.handle('c4-storage:clear-change-tracking', async (_, repoPath: string, level: string) => {
    getStorageService().clearChangeTracking(repoPath, level as C4Level);
    return { success: true };
  });

  // Get cached SVG (LRU first, then SQLite) — PERF-01 + PERF-02
  ipcMain.handle('c4-storage:get-svg', async (_, repoPath: string, level: string, elementId?: string) => {
    const cacheKey = [repoPath, level, elementId ?? ''].join(':');

    // Check LRU hot cache first (PERF-02)
    const lruHit = svgLruCache.get(cacheKey);
    if (lruHit) return lruHit;

    // Fall back to SQLite (PERF-01)
    const svg = getStorageService().getSvg(repoPath, level as C4Level, elementId);
    if (svg) {
      // Promote to LRU for next access
      svgLruCache.set(cacheKey, svg);
    }
    return svg;
  });

  // Store rendered SVG (both SQLite and LRU) — PERF-01 + PERF-02
  ipcMain.handle('c4-storage:store-svg', async (_, repoPath: string, level: string, svg: string, elementId?: string) => {
    const cacheKey = [repoPath, level, elementId ?? ''].join(':');

    // SQLite-first (D-10): always write to SQLite + LRU
    getStorageService().storeSvg(repoPath, level as C4Level, svg, elementId);
    svgLruCache.set(cacheKey, svg);

    // .reef/-second (D-10): non-fatal write-through
    await writeReefArtifacts(repoPath, level, svg, elementId);

    return { success: true };
  });

  // Import .reef/ artifacts into SQLite + LRU cache (READ-01, READ-02)
  ipcMain.handle('reef-import:scan-and-import', async (_, repoPath: string) => {
    return importReefArtifacts(repoPath, getStorageService(), svgLruCache);
  });

  // Get element IDs from .reef/ .puml files for sidebar element tree (SIDE-03)
  ipcMain.handle('c4-storage:get-elements', async (_, repoPath: string, level: string, elementId?: string): Promise<Array<{id: string, name: string}>> => {
    try {
      let pumlPath: string;
      if (level === 'context' || level === 'container') {
        // Flat levels: .reef/{level}.puml
        pumlPath = join(repoPath, REEF_DIR, `${level}.puml`);
      } else {
        // Nested levels: .reef/{level}/{parentId}/diagram.puml
        if (!elementId) return [];
        pumlPath = join(repoPath, REEF_DIR, level, elementId, 'diagram.puml');
      }

      const pumlContent = await readFile(pumlPath, 'utf-8');

      // Determine which level's elements to extract:
      // If viewing context level, extract container elements from context.puml
      // If viewing container level, extract component elements from container.puml
      // extractElementIds only supports 'container' and 'component' as extraction targets
      let extractLevel: C4Level;
      if (level === 'context') {
        extractLevel = 'container';
      } else if (level === 'container') {
        extractLevel = 'component';
      } else {
        // component/code level .puml doesn't have child macros to extract
        return [];
      }

      const ids = extractElementIds(pumlContent, extractLevel);

      // Convert IDs to {id, name} pairs — name is the humanized ID
      return ids.map(id => ({
        id,
        name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      }));
    } catch (err: any) {
      // File doesn't exist or can't be read — return empty (not an error for the UI)
      if (err.code === 'ENOENT') return [];
      console.error(`Failed to extract elements for ${repoPath}/${level}:`, err);
      return [];
    }
  });
}

/**
 * Cleanup storage service
 * Called during app shutdown in main.ts
 */
export function cleanupC4Storage(): void {
  if (storageService) {
    storageService.close();
    storageService = null;
  }
}
