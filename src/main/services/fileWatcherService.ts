/**
 * File Watcher Service
 *
 * Monitors repository source files for changes and determines diagram staleness.
 * Uses chokidar for efficient file watching with level-specific directory paths.
 *
 * Features:
 * - Level-specific directory path watching (chokidar v4 compatible — no globs)
 * - Extension filtering in event handlers per C4 level
 * - Function predicate for ignored option (chokidar v4 anymatch uses exact string equality for strings)
 * - Debounced change detection (100ms stabilityThreshold)
 * - IPC event emission for stale diagrams via c4-storage:state-changed pipeline
 * - Startup staleness checks via recursive directory walk (no glob expansion)
 */

import chokidar, { FSWatcher } from 'chokidar';
import { BrowserWindow } from 'electron';
import { stat, readdir } from 'fs/promises';
import { join } from 'path';
import type { C4Level } from './c4/types/c4Types';
import { C4StorageService } from './c4/c4StorageService';
import type { DiagramState } from '../../shared/types/diagramState';
import { ChangeTrackingService } from './changeTrackingService';

export class FileWatcherService {
  private watchers: Map<string, FSWatcher> = new Map();
  private storageService: C4StorageService;
  private changeTrackingService: ChangeTrackingService | null;

  constructor(storageService: C4StorageService, changeTrackingService?: ChangeTrackingService) {
    this.storageService = storageService;
    this.changeTrackingService = changeTrackingService || null;
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
      const paths = this.getWatchPaths(repoPath, level);

      const watcher = chokidar.watch(paths, {
        persistent: true,
        ignoreInitial: true, // Mark stale on new changes only
        // CRITICAL: Must use a function predicate for chokidar v4.
        // Chokidar v4 bundles anymatch which uses exact string equality for string matchers,
        // NOT glob expansion. Glob strings like '**/node_modules/**' silently match nothing.
        ignored: (filePath: string) =>
          /node_modules|\.git[/\\]|[/\\]dist[/\\]|dist-electron|\.cache|[/\\]build[/\\]|[/\\]coverage[/\\]/.test(filePath),
        awaitWriteFinish: {
          stabilityThreshold: 100, // 100ms debounce
          pollInterval: 50,
        },
        depth: 10,
      });

      // Filter events by extension before processing
      const onFileEvent = (path: string) => {
        if (this.isRelevantFile(path, level)) {
          this.handleFileChange(repoPath, level, path);
        }
      };

      // Listen for file system events
      watcher.on('change', onFileEvent);
      watcher.on('add', onFileEvent);
      watcher.on('unlink', onFileEvent);

      watcher.on('error', (error) => {
        console.error(`File watcher error for ${key}:`, error);
      });

      this.watchers.set(key, watcher);
      console.log(`Started watching ${key} with ${paths.length} paths`);
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

      // SQLite CURRENT_TIMESTAMP is UTC but lacks timezone marker — append 'Z' so JS parses as UTC
      const lastGenTimestamp = stored.updatedAt
        ? new Date(stored.updatedAt + 'Z').getTime()
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
   * Get level-specific directory/file paths for chokidar v4 watching.
   * Returns concrete file paths and directory paths — NO glob patterns.
   * Chokidar v4 removed glob support; directories are watched recursively via depth option.
   */
  private getWatchPaths(repoPath: string, level: C4Level): string[] {
    const paths: Record<C4Level, string[]> = {
      // Context: System-level files (dependencies, config) and src directory for entry points
      context: [
        join(repoPath, 'package.json'),
        join(repoPath, 'tsconfig.json'),
        join(repoPath, 'src'), // directory - chokidar v4 recurses into it
      ],

      // Container: High-level structure (main process, renderer process directories)
      container: [
        join(repoPath, 'package.json'),
        join(repoPath, 'src', 'main'),
        join(repoPath, 'src', 'renderer'),
      ],

      // Component: All source files in src directory
      component: [
        join(repoPath, 'src'),
      ],

      // Code: All source files (most granular, same scope as component)
      code: [
        join(repoPath, 'src'),
      ],
    };

    return paths[level];
  }

  /**
   * Filter chokidar events by file extension per C4 level.
   * Replaces glob patterns with event-handler filtering (chokidar v4 compatible).
   */
  private isRelevantFile(filePath: string, level: C4Level): boolean {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';

    switch (level) {
      case 'context':
        // Context watches for main entry point and config files
        return filePath.endsWith('package.json') ||
               filePath.endsWith('tsconfig.json') ||
               /main\.[jt]sx?$/.test(filePath);
      case 'container':
        // Container watches all files in main/renderer directories
        return true;
      case 'component':
      case 'code':
        // Component and code watch TypeScript/JavaScript source files
        return ['ts', 'tsx', 'js', 'jsx'].includes(ext);
      default:
        return false;
    }
  }

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
      // SQLite CURRENT_TIMESTAMP is UTC but lacks timezone marker — append 'Z' so JS parses as UTC
      const lastGenTimestamp = stored.updatedAt
        ? new Date(stored.updatedAt + 'Z').getTime()
        : 0;

      if (lastGenTimestamp === 0) {
        return;
      }

      // Check if changed file is newer than last generation
      const fileStat = await stat(changedPath);

      if (fileStat.mtimeMs > lastGenTimestamp) {
        console.log(`File change detected: ${changedPath} for ${repoPath}:${level}`);

        if (this.changeTrackingService) {
          // Delegate to ChangeTrackingService for debounced, enriched processing
          this.changeTrackingService.recordChange(repoPath, level, changedPath);
        } else {
          // Fallback: direct state update (backwards compatibility)
          this.storageService.updateState(repoPath, level, 'stale');
          this.emitStateChangedEvent(repoPath, level, 'stale');
        }
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
   * Check if diagram is stale by comparing file mtimes to generation timestamp.
   * Walks watched directories recursively instead of relying on glob expansion.
   */
  private async isDiagramStale(
    repoPath: string,
    level: C4Level,
    generationTimestamp: number
  ): Promise<boolean> {
    try {
      const paths = this.getWatchPaths(repoPath, level);

      for (const watchPath of paths) {
        try {
          const pathStat = await stat(watchPath);

          if (pathStat.isFile()) {
            // Concrete file — check directly
            if (this.isRelevantFile(watchPath, level) && pathStat.mtimeMs > generationTimestamp) {
              return true;
            }
          } else if (pathStat.isDirectory()) {
            // Directory — walk recursively checking relevant files
            if (await this.hasNewerFiles(watchPath, level, generationTimestamp)) {
              return true;
            }
          }
        } catch {
          // Path doesn't exist, continue
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error(`Error checking staleness for ${repoPath}:${level}:`, error);
      return true; // Default to stale for safety
    }
  }

  /**
   * Recursively walk a directory looking for files newer than generationTimestamp.
   * Skips node_modules, .git, dist, dist-electron, .cache, build, coverage directories.
   */
  private async hasNewerFiles(
    dirPath: string,
    level: C4Level,
    generationTimestamp: number
  ): Promise<boolean> {
    const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-electron', '.cache', 'build', 'coverage']);

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (IGNORED_DIRS.has(entry.name)) continue;
          if (await this.hasNewerFiles(join(dirPath, entry.name), level, generationTimestamp)) {
            return true;
          }
        } else if (entry.isFile()) {
          const fullPath = join(dirPath, entry.name);
          if (this.isRelevantFile(fullPath, level)) {
            const fileStat = await stat(fullPath);
            if (fileStat.mtimeMs > generationTimestamp) {
              return true;
            }
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
// Note: This will be properly initialized in main.ts with the storage service
let fileWatcherServiceInstance: FileWatcherService | null = null;

export function initializeFileWatcherService(
  storageService: C4StorageService,
  changeTrackingService?: ChangeTrackingService
): FileWatcherService {
  if (!fileWatcherServiceInstance) {
    fileWatcherServiceInstance = new FileWatcherService(storageService, changeTrackingService);
  }
  return fileWatcherServiceInstance;
}

export function getFileWatcherService(): FileWatcherService {
  if (!fileWatcherServiceInstance) {
    throw new Error('FileWatcherService not initialized. Call initializeFileWatcherService first.');
  }
  return fileWatcherServiceInstance;
}
