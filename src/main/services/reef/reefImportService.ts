/**
 * ReefImportService
 *
 * Scans a repository's `.reef/` folder, reads SVG/PUML/meta files for each
 * C4 level, and imports them into SQLite + the in-process LRU cache.
 *
 * Requirements: READ-01, READ-02, READ-03
 *
 * Design decisions:
 * - Only flat levels (context, container) are scanned — component/code are SQLite-only (ADV-01)
 * - SVG is the primary signal — if SVG missing, level is added to missingLevels
 * - Missing/invalid .meta.json does not block SVG import (D-06, D-13)
 * - Missing .puml is handled gracefully — storeDiagram called with empty string (D-06)
 * - Per-level try/catch with console.warn — one level failure does not block others
 * - LRU cache key matches format used in c4StorageHandlers.ts: `${repoPath}:${level}:${elementId ?? ''}`
 */

import { access, readFile } from 'fs/promises';
import { join } from 'path';
import { REEF_DIR, FLAT_LEVELS } from './reefStorageTypes';
import { ReefStorageService } from './reefStorageService';
import type { C4StorageService } from '../c4/c4StorageService';
import type { SvgLruCache } from '../plantUmlService';
import type { C4Level } from '../c4/types/c4Types';

/**
 * Result of scanning and importing .reef/ artifacts.
 */
export interface ReefImportResult {
  /** Levels that had SVG files and were successfully imported into SQLite + LRU */
  importedLevels: string[];
  /** Flat levels that had no SVG file in .reef/ */
  missingLevels: string[];
}

/**
 * Scan a repository's `.reef/` folder and import available C4 diagram artifacts
 * into SQLite (via C4StorageService) and the in-process LRU cache.
 *
 * Only flat levels (context, container) are scanned per ADV-01 scope.
 *
 * @param repoPath    Absolute path to the repository root
 * @param storageService  C4StorageService instance (singleton from caller)
 * @param lruCache    SvgLruCache instance (singleton from caller)
 * @returns ReefImportResult with importedLevels and missingLevels
 */
export async function importReefArtifacts(
  repoPath: string,
  storageService: C4StorageService,
  lruCache: SvgLruCache
): Promise<ReefImportResult> {
  const reefDir = join(repoPath, REEF_DIR);

  // Check if .reef/ directory exists — if not, return empty result (no error)
  try {
    await access(reefDir);
  } catch {
    return { importedLevels: [], missingLevels: [] };
  }

  const importedLevels: string[] = [];
  const missingLevels: string[] = [];

  // ReefStorageService handles .meta.json parsing with schema validation
  const reefStorage = new ReefStorageService();

  // Only scan flat levels per ADV-01 (component/code are SQLite-only)
  for (const level of FLAT_LEVELS) {
    const svgPath = join(reefDir, `${level}.svg`);

    // Attempt to read SVG — if missing, add to missingLevels and continue
    let svg: string;
    try {
      svg = await readFile(svgPath, 'utf8');
    } catch {
      missingLevels.push(level);
      continue;
    }

    // Per-level try/catch — one failure should not block other levels
    try {
      // Attempt to read .puml — default to empty string if missing (D-06)
      let puml = '';
      const pumlPath = join(reefDir, `${level}.puml`);
      try {
        puml = await readFile(pumlPath, 'utf8');
      } catch {
        // .puml missing — use empty string, not an error
      }

      // Read .meta.json via ReefStorageService — returns null if missing/invalid (D-06, D-13)
      const meta = await reefStorage.readMeta(repoPath, level);

      // Import into SQLite via storeDiagram
      storageService.storeDiagram({
        repoPath,
        level: level as C4Level,
        diagramContent: puml,
        state: 'fresh',
        modelUsed: meta?.modelUsed ?? 'imported',
        promptVersion: meta?.promptVersion ?? 'imported',
        tokensUsed: meta?.tokensUsed,
        createdAt: meta?.generatedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Store SVG in SQLite svg_content column (PERF-01)
      storageService.storeSvg(repoPath, level as C4Level, svg, undefined);

      // Populate LRU cache (D-05) — key matches format in c4StorageHandlers.ts line 185
      // Format: `${repoPath}:${level}:${elementId ?? ''}` — trailing colon for flat levels
      lruCache.set(`${repoPath}:${level}:`, svg);

      importedLevels.push(level);
    } catch (err) {
      console.warn(`[reefImportService] Failed to import level "${level}" from .reef/:`, err);
      // Continue to next level — non-fatal per-level error handling
    }
  }

  return { importedLevels, missingLevels };
}
