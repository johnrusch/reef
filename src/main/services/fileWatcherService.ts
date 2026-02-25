/**
 * File Watcher Service
 *
 * Monitors repository source files for changes and determines diagram staleness.
 * Uses chokidar for efficient file watching with level-specific patterns.
 *
 * Features:
 * - Level-specific file pattern watching (context/container/component/code)
 * - Debounced change detection (100ms stabilityThreshold)
 * - IPC event emission for stale diagrams via c4-storage:state-changed pipeline
 * - Startup staleness checks via generation timestamp comparison
 */

import chokidar, { FSWatcher } from 'chokidar';
import { BrowserWindow } from 'electron';
import { stat } from 'fs/promises';
import { join } from 'path';
import type { C4Level } from './c4/types/c4Types';
import { C4StorageService } from './c4/c4StorageService';
import type { DiagramState } from '../../shared/types/diagramState';

export class FileWatcherService {
  private watchers: Map<string, FSWatcher> = new Map();
  private storageService: C4StorageService;

  constructor(storageService: C4StorageService) {
    this.storageService = storageService;
  }

  /**
   * Start watching repository for file changes at specified C4 level
   */
  startWatching(repoPath: string, level: C4Level): void {
    const key = `${repoPath}:${level}`;

    // Don't start duplicate watchers
    if (this.watchers.has(key)) {
      console.log(`Already watching ${key}`);
      return;
    }

    try {
      const patterns = this.getFilePatterns(repoPath, level);

      const watcher = chokidar.watch(patterns, {
        persistent: true,
        ignoreInitial: true, // Mark stale on new changes only
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/dist-electron/**',
          '**/.cache/**',
          '**/build/**',
          '**/coverage/**',
        ],
        awaitWriteFinish: {
          stabilityThreshold: 100, // 100ms debounce
          pollInterval: 50,
        },
        depth: 10,
      });

      // Listen for file system events
      watcher.on('change', (path) => this.handleFileChange(repoPath, level, path));
      watcher.on('add', (path) => this.handleFileChange(repoPath, level, path));
      watcher.on('unlink', (path) => this.handleFileChange(repoPath, level, path));

      watcher.on('error', (error) => {
        console.error(`File watcher error for ${key}:`, error);
      });

      this.watchers.set(key, watcher);
      console.log(`Started watching ${key} with ${patterns.length} patterns`);
    } catch (error) {
      console.error(`Failed to start watching ${key}:`, error);
    }
  }

  /**
   * Stop watching repository at specified level
   */
  stopWatching(repoPath: string, level: C4Level): void {
    const key = `${repoPath}:${level}`;
    const watcher = this.watchers.get(key);

    if (watcher) {
      watcher.close().catch((error) => {
        console.error(`Error closing watcher ${key}:`, error);
      });
      this.watchers.delete(key);
      console.log(`Stopped watching ${key}`);
    }
  }

  /**
   * Stop all active watchers
   */
  stopAllWatchers(): void {
    console.log(`Stopping ${this.watchers.size} watchers`);

    for (const [key, watcher] of this.watchers.entries()) {
      watcher.close().catch((error) => {
        console.error(`Error closing watcher ${key}:`, error);
      });
    }

    this.watchers.clear();
  }

  /**
   * Check if diagram is stale on startup by comparing file mtimes to generation timestamp
   */
  async checkStalenessOnStartup(repoPath: string, level: C4Level): Promise<boolean> {
    try {
      const stored = this.storageService.getDiagram(repoPath, level);

      // Never generated — not stale
      if (!stored) {
        return false;
      }

      // Already stale in database
      if (stored.state === 'stale') {
        return true;
      }

      const lastGenTimestamp = stored.updatedAt
        ? new Date(stored.updatedAt).getTime()
        : 0;

      // Never generated
      if (lastGenTimestamp === 0) {
        return false;
      }

      // Check if any watched files are newer than generation timestamp
      const isStale = await this.isDiagramStale(repoPath, level, lastGenTimestamp);

      if (isStale) {
        // Update state in database
        this.storageService.updateState(repoPath, level, 'stale');

        // Emit state change through new pipeline
        this.emitStateChangedEvent(repoPath, level, 'stale');
      }

      return isStale;
    } catch (error) {
      console.error(`Error checking staleness on startup for ${repoPath}:${level}:`, error);
      return false;
    }
  }

  // ========== Private Helper Methods ==========

  /**
   * Handle file change events
   */
  private async handleFileChange(repoPath: string, level: C4Level, changedPath: string): Promise<void> {
    try {
      // Get the stored diagram to check its generation timestamp
      const stored = this.storageService.getDiagram(repoPath, level);

      // If never generated (no stored diagram), no need to mark stale
      if (!stored) {
        return;
      }

      // If already stale, no need to update again
      if (stored.state === 'stale') {
        return;
      }

      // Get the generation timestamp from the stored diagram's updated_at field
      const lastGenTimestamp = stored.updatedAt
        ? new Date(stored.updatedAt).getTime()
        : 0;

      if (lastGenTimestamp === 0) {
        return;
      }

      // Check if changed file is newer than last generation
      const fileStat = await stat(changedPath);

      if (fileStat.mtimeMs > lastGenTimestamp) {
        console.log(`File change detected: ${changedPath} for ${repoPath}:${level}`);

        // Update state to 'stale' in the database
        this.storageService.updateState(repoPath, level, 'stale');

        // Emit state-changed event through the new pipeline
        this.emitStateChangedEvent(repoPath, level, 'stale');
      }
    } catch (error) {
      // File might have been deleted or inaccessible
      console.error(`Error handling file change for ${changedPath}:`, error);
    }
  }

  /**
   * Emit c4-storage:state-changed IPC event to renderer
   * This flows through the new state management pipeline:
   * IPC event → VisualMapTab/DiagramViewer onStateChanged → Zustand store → DiagramStateBadge
   */
  private emitStateChangedEvent(repoPath: string, level: C4Level, state: DiagramState): void {
    try {
      const windows = BrowserWindow.getAllWindows();

      for (const window of windows) {
        window.webContents.send('c4-storage:state-changed', {
          repoPath,
          level,
          state,
          elementId: undefined,
          errorMessage: undefined,
        });
      }

      console.log(`Emitted c4-storage:state-changed (${state}) for ${repoPath}:${level}`);
    } catch (error) {
      console.error('Error emitting state changed event:', error);
    }
  }

  /**
   * Get level-specific file patterns for watching
   */
  private getFilePatterns(repoPath: string, level: C4Level): string[] {
    const patterns: Record<C4Level, string[]> = {
      // Context: System-level files (dependencies, config, entry points)
      context: [
        join(repoPath, 'package.json'),
        join(repoPath, 'tsconfig.json'),
        join(repoPath, 'src/**/main.*'),
      ],

      // Container: High-level structure (main process, renderer process)
      container: [
        join(repoPath, 'package.json'),
        join(repoPath, 'src/main/**/*'),
        join(repoPath, 'src/renderer/**/*'),
      ],

      // Component: All source files in src
      component: [
        join(repoPath, 'src/**/*.ts'),
        join(repoPath, 'src/**/*.tsx'),
        join(repoPath, 'src/**/*.js'),
        join(repoPath, 'src/**/*.jsx'),
      ],

      // Code: All source files (most granular)
      code: [
        join(repoPath, 'src/**/*.ts'),
        join(repoPath, 'src/**/*.tsx'),
        join(repoPath, 'src/**/*.js'),
        join(repoPath, 'src/**/*.jsx'),
      ],
    };

    return patterns[level];
  }

  /**
   * Check if diagram is stale by comparing file mtimes to generation timestamp
   */
  private async isDiagramStale(
    repoPath: string,
    level: C4Level,
    generationTimestamp: number
  ): Promise<boolean> {
    try {
      const patterns = this.getFilePatterns(repoPath, level);

      for (const pattern of patterns) {
        // Simple file check (non-glob patterns like package.json, tsconfig.json)
        if (!pattern.includes('*')) {
          try {
            const fileStat = await stat(pattern);
            if (fileStat.mtimeMs > generationTimestamp) {
              return true;
            }
          } catch {
            // File doesn't exist, continue
            continue;
          }
        }
      }

      // For glob patterns, we rely on the chokidar file watcher to detect changes
      // at runtime. The startup check only validates non-glob files.
      // This is acceptable because chokidar will catch glob-matched changes once watching starts.
      return false;
    } catch (error) {
      console.error(`Error checking staleness for ${repoPath}:${level}:`, error);
      // Default to stale for safety
      return true;
    }
  }
}

// Export singleton instance
// Note: This will be properly initialized in main.ts with the storage service
let fileWatcherServiceInstance: FileWatcherService | null = null;

export function initializeFileWatcherService(storageService: C4StorageService): FileWatcherService {
  if (!fileWatcherServiceInstance) {
    fileWatcherServiceInstance = new FileWatcherService(storageService);
  }
  return fileWatcherServiceInstance;
}

export function getFileWatcherService(): FileWatcherService {
  if (!fileWatcherServiceInstance) {
    throw new Error('FileWatcherService not initialized. Call initializeFileWatcherService first.');
  }
  return fileWatcherServiceInstance;
}
