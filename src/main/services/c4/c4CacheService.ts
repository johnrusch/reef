/**
 * C4 Cache Service
 *
 * Level-aware caching for C4 diagrams with smart invalidation.
 * Cache TTL varies by abstraction level based on change frequency:
 * - Context: 7 days (system boundaries rarely change)
 * - Container: 3 days (deployment architecture changes occasionally)
 * - Component: 1 day (component structure changes with refactoring)
 * - Code: 6 hours (implementation changes frequently)
 *
 * Uses SQLite for persistence via better-sqlite3.
 */

import Database from 'better-sqlite3';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import type { C4Level } from './types/c4Types';

export class C4CacheService {
  private db: Database.Database;

  // Cache TTL constants (in milliseconds)
  readonly CONTEXT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  readonly CONTAINER_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days
  readonly COMPONENT_TTL = 24 * 60 * 60 * 1000; // 1 day
  readonly CODE_TTL = 6 * 60 * 60 * 1000; // 6 hours

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize SQLite database schema
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS c4_cache (
        key TEXT PRIMARY KEY,
        diagram TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        level TEXT NOT NULL
      )
    `);

    // Create index on timestamp for cleanup queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_timestamp ON c4_cache(timestamp)
    `);
  }

  /**
   * Gets cached diagram if available and fresh
   */
  async getCachedDiagram(
    repoPath: string,
    level: C4Level,
    elementId?: string
  ): Promise<string | null> {
    const key = this.generateCacheKey(repoPath, level, elementId);

    const stmt = this.db.prepare('SELECT diagram, timestamp FROM c4_cache WHERE key = ?');
    const entry = stmt.get(key) as { diagram: string; timestamp: number } | undefined;

    if (!entry) {
      return null;
    }

    // Check if cache is stale
    const isStale = await this.isCacheStale(repoPath, level, entry.timestamp);

    if (isStale) {
      // Delete stale entry
      this.db.prepare('DELETE FROM c4_cache WHERE key = ?').run(key);
      return null;
    }

    return entry.diagram;
  }

  /**
   * Checks if cache is stale based on file modification times
   */
  async isCacheStale(repoPath: string, level: C4Level, cacheTimestamp: number): Promise<boolean> {
    try {
      // Get relevant file patterns for this level
      const patterns = this.getRelevantFilePatterns(level);

      // Check if any relevant files have been modified since cache timestamp
      for (const pattern of patterns) {
        const hasModified = await this.hasModifiedFiles(repoPath, pattern, cacheTimestamp);
        if (hasModified) {
          return true;
        }
      }

      // Also check TTL
      const ttl = this.getTTLForLevel(level);
      const age = Date.now() - cacheTimestamp;

      return age > ttl;
    } catch (error) {
      // If we can't determine staleness, consider cache stale for safety
      console.error('Error checking cache staleness:', error);
      return true;
    }
  }

  /**
   * Sets cached diagram
   */
  async setCachedDiagram(
    repoPath: string,
    level: C4Level,
    diagram: string,
    elementId?: string
  ): Promise<void> {
    const key = this.generateCacheKey(repoPath, level, elementId);
    const timestamp = Date.now();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO c4_cache (key, diagram, timestamp, level)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(key, diagram, timestamp, level);
  }

  /**
   * Clears all cached diagrams for a repository
   */
  clearCache(repoPath: string): void {
    const keyPrefix = `${repoPath}:`;
    this.db.prepare('DELETE FROM c4_cache WHERE key LIKE ?').run(`${keyPrefix}%`);
  }

  /**
   * Clears expired cache entries
   */
  clearExpiredEntries(): void {
    const now = Date.now();

    // Clear entries older than their respective TTLs
    const stmt = this.db.prepare(`
      DELETE FROM c4_cache
      WHERE (level = 'context' AND timestamp < ?) OR
            (level = 'container' AND timestamp < ?) OR
            (level = 'component' AND timestamp < ?) OR
            (level = 'code' AND timestamp < ?)
    `);

    stmt.run(
      now - this.CONTEXT_TTL,
      now - this.CONTAINER_TTL,
      now - this.COMPONENT_TTL,
      now - this.CODE_TTL
    );
  }

  /**
   * Closes database connection
   */
  close(): void {
    this.db.close();
  }

  // ========== Private Helper Methods ==========

  /**
   * Generates unique cache key
   */
  private generateCacheKey(repoPath: string, level: C4Level, elementId?: string): string {
    const normalizedPath = repoPath.replace(/\\/g, '/');
    const elementPart = elementId ? `:${elementId}` : '';
    return `${normalizedPath}:${level}${elementPart}`;
  }

  /**
   * Gets TTL for a specific level
   */
  private getTTLForLevel(level: C4Level): number {
    const ttlMap: Record<C4Level, number> = {
      context: this.CONTEXT_TTL,
      container: this.CONTAINER_TTL,
      component: this.COMPONENT_TTL,
      code: this.CODE_TTL,
    };

    return ttlMap[level];
  }

  /**
   * Gets relevant file patterns for cache invalidation
   */
  private getRelevantFilePatterns(level: C4Level): string[] {
    const patterns: Record<C4Level, string[]> = {
      context: ['package.json', 'tsconfig.json', 'src/**/main.*'],
      container: ['package.json', 'src/main', 'src/renderer'],
      component: ['src/**/*.ts', 'src/**/*.tsx'],
      code: ['src/**/*.ts', 'src/**/*.tsx'],
    };

    return patterns[level];
  }

  /**
   * Checks if any files matching pattern have been modified since timestamp
   */
  private async hasModifiedFiles(
    repoPath: string,
    pattern: string,
    timestamp: number
  ): Promise<boolean> {
    try {
      // Handle simple file patterns (package.json, tsconfig.json)
      if (!pattern.includes('*')) {
        const filePath = join(repoPath, pattern);
        try {
          const stats = await stat(filePath);
          return stats.mtimeMs > timestamp;
        } catch {
          // File doesn't exist, not modified
          return false;
        }
      }

      // Handle directory patterns (src/main, src/renderer)
      if (!pattern.includes('*')) {
        const dirPath = join(repoPath, pattern);
        return await this.checkDirectoryModified(dirPath, timestamp);
      }

      // Handle glob patterns (src/**/*.ts)
      // For simplicity, check the src directory recursively
      const basePath = pattern.split('*')[0];
      const dirPath = join(repoPath, basePath);
      return await this.checkDirectoryModified(dirPath, timestamp);
    } catch (error) {
      // If we can't check, assume modified for safety
      console.error(`Error checking pattern ${pattern}:`, error);
      return true;
    }
  }

  /**
   * Recursively checks if directory or its contents have been modified
   */
  private async checkDirectoryModified(dirPath: string, timestamp: number): Promise<boolean> {
    try {
      const dirStats = await stat(dirPath);

      // Check directory itself
      if (dirStats.mtimeMs > timestamp) {
        return true;
      }

      // Check directory contents
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip node_modules and hidden directories
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const modified = await this.checkDirectoryModified(fullPath, timestamp);
          if (modified) return true;
        } else {
          const stats = await stat(fullPath);
          if (stats.mtimeMs > timestamp) {
            return true;
          }
        }
      }

      return false;
    } catch {
      // Directory doesn't exist or can't be read
      return false;
    }
  }
}
