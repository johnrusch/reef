/**
 * File Watcher Service
 *
 * Monitors repository source files for changes and determines diagram staleness.
 * Uses chokidar for efficient file watching with level-specific patterns.
 *
 * Features:
 * - Level-specific file pattern watching (context/container/component/code)
 * - Debounced change detection (100ms stabilityThreshold)
 * - IPC event emission for stale diagrams
 * - Startup staleness checks via generation timestamp comparison
 */

import chokidar, { FSWatcher } from 'chokidar';
import { BrowserWindow } from 'electron';
import { stat } from 'fs/promises';
import { join } from 'path';
import type { C4Level } from './c4/types/c4Types';
import { C4CacheService } from './c4/c4CacheService';

export class FileWatcherService {
  private watchers: Map<string, FSWatcher> = new Map();
  private cacheService: C4CacheService;

  constructor(cacheService: C4CacheService) {
    this.cacheService = cacheService;
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
      const lastGenTimestamp = this.cacheService.getLastGenerationTimestamp(repoPath, level);

      // Never generated
      if (lastGenTimestamp === 0) {
        return false;
      }

      // Check if any watched files are newer than generation timestamp
      const isStale = await this.isDiagramStale(repoPath, level, lastGenTimestamp);

      if (isStale) {
        // Emit staleness event
        this.emitStaleEvent(repoPath, level, 'startup-check');
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
      const lastGenTimestamp = this.cacheService.getLastGenerationTimestamp(repoPath, level);

      // If never generated, no need to mark stale
      if (lastGenTimestamp === 0) {
        return;
      }

      // Check if changed file is newer than last generation
      const fileStat = await stat(changedPath);

      if (fileStat.mtimeMs > lastGenTimestamp) {
        console.log(`File change detected: ${changedPath} for ${repoPath}:${level}`);
        this.emitStaleEvent(repoPath, level, changedPath);
      }
    } catch (error) {
      // File might have been deleted or inaccessible, that's okay
      console.error(`Error handling file change for ${changedPath}:`, error);
    }
  }

  /**
   * Emit IPC event to renderer indicating diagram is stale
   */
  private emitStaleEvent(repoPath: string, level: C4Level, changedPath: string): void {
    try {
      const windows = BrowserWindow.getAllWindows();

      for (const window of windows) {
        window.webContents.send('diagram:stale', {
          repoPath,
          level,
          changedPath,
          timestamp: Date.now(),
        });
      }

      console.log(`Emitted diagram:stale event for ${repoPath}:${level}`);
    } catch (error) {
      console.error('Error emitting stale event:', error);
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

      // Check if any pattern matches files newer than generation timestamp
      for (const pattern of patterns) {
        // Simple file check (package.json, tsconfig.json)
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

      // For glob patterns, use the cache service's existing staleness check
      const isStale = await this.cacheService.isCacheStale(repoPath, level, generationTimestamp);
      return isStale;
    } catch (error) {
      console.error(`Error checking staleness for ${repoPath}:${level}:`, error);
      // Default to stale for safety
      return true;
    }
  }
}

// Export singleton instance
// Note: This will be properly initialized in main.ts with the cache service
let fileWatcherServiceInstance: FileWatcherService | null = null;

export function initializeFileWatcherService(cacheService: C4CacheService): FileWatcherService {
  if (!fileWatcherServiceInstance) {
    fileWatcherServiceInstance = new FileWatcherService(cacheService);
  }
  return fileWatcherServiceInstance;
}

export function getFileWatcherService(): FileWatcherService {
  if (!fileWatcherServiceInstance) {
    throw new Error('FileWatcherService not initialized. Call initializeFileWatcherService first.');
  }
  return fileWatcherServiceInstance;
}
