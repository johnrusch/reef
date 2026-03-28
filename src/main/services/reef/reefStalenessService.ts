/**
 * ReefStalenessService
 *
 * Hash-based staleness detection for `.reef/` diagrams.
 * Per D-01/D-03: When source files change, debounce 2.5s, recompute sourceHash
 * for affected levels, compare against stored `.meta.json` sourceHash, and invoke
 * the onStale callback if the hash differs.
 *
 * Design decisions:
 * - D-03: Hash comparison against stored .meta.json sourceHash (not mtime)
 * - D-04: 2500ms debounce per "repoPath:level" key to prevent hash thrashing
 * - D-17/D-18: Uses analyzedFilePathsCache from c4AnalyzerService when available,
 *   falls back to getWatchPathFiles() discovery for fresh sessions
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { computeSourceHash } from './sourceHashService';
import { getAnalyzedFilePaths } from '../c4/c4AnalyzerService';
import type { ReefStorageService } from './reefStorageService';

/** Debounce delay in ms (per D-04: 2-3s range; we use 2500ms) */
const DEBOUNCE_MS = 2500;

/** Directories to skip during file discovery (same as FileWatcherService) */
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-electron',
  '.cache',
  'build',
  'coverage',
  '.reef',
]);

/** Extensions considered relevant for C4 analysis */
const RELEVANT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json']);

export class ReefStalenessService {
  private reefStorage: ReefStorageService;
  private onStale: (repoPath: string, level: string) => void;
  /** Pending debounce timers keyed by "repoPath:level" */
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    reefStorage: ReefStorageService,
    onStale: (repoPath: string, level: string) => void
  ) {
    this.reefStorage = reefStorage;
    this.onStale = onStale;
  }

  /**
   * Schedule a staleness check for the given repo + level.
   * Resets the debounce window each time it is called for the same key (per D-04).
   */
  scheduleCheck(repoPath: string, level: string): void {
    const key = `${repoPath}:${level}`;

    // Clear existing timer (debounce reset)
    const existing = this.timers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.timers.delete(key);
      // Fire-and-forget; errors are logged inside checkStaleness
      this.checkStaleness(repoPath, level).catch((err) => {
        console.warn(`[ReefStalenessService] checkStaleness error for ${key}:`, err);
      });
    }, DEBOUNCE_MS);

    this.timers.set(key, timer);
  }

  /**
   * Synchronously compare the current sourceHash against the stored .meta.json hash.
   *
   * Returns true if the level is stale and the onStale callback was invoked.
   * Returns false if:
   *   - meta is null (no .meta.json exists — nothing to compare)
   *   - meta.sourceHash is undefined (hash not recorded during generation)
   *   - hashes match (level is fresh)
   */
  async checkStaleness(repoPath: string, level: string): Promise<boolean> {
    // Per D-03: read stored meta
    const meta = await this.reefStorage.readMeta(repoPath, level, undefined);

    // If no meta or no stored hash — nothing to compare against
    if (!meta || meta.sourceHash === undefined) {
      return false;
    }

    // Per D-17/D-18: prefer cache-populated file list from last generation
    const filePaths = await this.getFilePaths(repoPath, level);

    const currentHash = await computeSourceHash(filePaths);

    if (currentHash !== meta.sourceHash) {
      this.onStale(repoPath, level);
      return true;
    }

    return false;
  }

  /**
   * Resolve the file list for a given repo + level.
   * First tries the analyzedFilePathsCache from c4AnalyzerService (D-17).
   * Falls back to getWatchPathFiles() for sessions without a prior generation.
   */
  private async getFilePaths(repoPath: string, level: string): Promise<string[]> {
    // Try the analyzer cache first (populated during generation)
    const cached = getAnalyzedFilePaths(repoPath, level);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Fall back to filesystem discovery
    return this.getWatchPathFiles(repoPath, level);
  }

  /**
   * Discover source files for a given level using the same directory scope
   * as FileWatcherService.getWatchPaths().
   *
   * For flat levels only (context, container); component/code levels typically
   * need the analyzer cache for accurate per-element hashing.
   */
  async getWatchPathFiles(repoPath: string, level: string): Promise<string[]> {
    const files: string[] = [];

    switch (level) {
      case 'context': {
        // Context: package.json, tsconfig.json, entry files in src/
        const directFiles = [
          join(repoPath, 'package.json'),
          join(repoPath, 'tsconfig.json'),
        ];
        for (const fp of directFiles) {
          if (await this.fileExists(fp)) {
            files.push(fp);
          }
        }
        // Main entry files in src/
        await this.collectFiles(join(repoPath, 'src'), files, (fp) =>
          /main\.[jt]sx?$/.test(fp)
        );
        break;
      }

      case 'container': {
        // Container: all source files in src/main/ and src/renderer/ plus package.json
        const pkgJson = join(repoPath, 'package.json');
        if (await this.fileExists(pkgJson)) {
          files.push(pkgJson);
        }
        await this.collectFiles(join(repoPath, 'src', 'main'), files);
        await this.collectFiles(join(repoPath, 'src', 'renderer'), files);
        break;
      }

      case 'component':
      case 'code': {
        // Component/code: all TypeScript/JavaScript files in src/
        await this.collectFiles(join(repoPath, 'src'), files);
        break;
      }

      default:
        break;
    }

    return files;
  }

  /**
   * Recursively collect relevant source files from a directory.
   * Skips IGNORED_DIRS and filters by extension / optional predicate.
   */
  private async collectFiles(
    dirPath: string,
    out: string[],
    predicate?: (fp: string) => boolean
  ): Promise<void> {
    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      // Directory may not exist (e.g. no src/renderer in some projects)
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await this.collectFiles(fullPath, out, predicate);
      } else if (entry.isFile()) {
        const ext = `.${entry.name.split('.').pop()?.toLowerCase() || ''}`;
        if (!RELEVANT_EXTENSIONS.has(ext)) continue;
        if (predicate && !predicate(fullPath)) continue;
        out.push(fullPath);
      }
    }
  }

  /** Returns true if the path exists and is a file */
  private async fileExists(fp: string): Promise<boolean> {
    try {
      const s = await stat(fp);
      return s.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Cancel all pending debounce timers.
   * Call on service teardown / app quit.
   */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
