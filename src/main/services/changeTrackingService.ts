/**
 * Change Tracking Service
 *
 * Accumulates file change events, debounces them into a single flush per
 * (repoPath, level), maps file paths to C4 elements using path heuristics,
 * propagates changes up the C4 hierarchy, persists to SQLite, and emits
 * an enriched c4-storage:state-changed IPC event to all renderer windows.
 *
 * Design decisions:
 * - Plain setTimeout debounce (no lodash) - zero dependency
 * - Path heuristic mapping (not ts-morph) - < 1ms vs 500-3000ms
 * - State guard: does NOT overwrite 'generating' state (Pitfall 2)
 * - Path normalization to forward slashes (Pitfall 3)
 */

import { BrowserWindow } from 'electron';
import type { C4Level } from './c4/types/c4Types';
import type { C4StorageService } from './c4/c4StorageService';
import type { AffectedElement } from '../../shared/types/changeTracking';
import { sanitizeId } from './c4/elementIdRegistry';

// Re-export sanitizeId so existing importers of sanitizeId from this module continue to work
export { sanitizeId } from './c4/elementIdRegistry';

interface ChangeAccumulator {
  files: Set<string>;
  timer: ReturnType<typeof setTimeout> | null;
}

export class ChangeTrackingService {
  /** Keyed by "repoPath:level" */
  private accumulators: Map<string, ChangeAccumulator>;
  private readonly debounceMs: number;
  private storage: C4StorageService;

  constructor(storage: C4StorageService, debounceMs = 1000) {
    this.storage = storage;
    this.debounceMs = debounceMs;
    this.accumulators = new Map();
  }

  /**
   * Record a file change for a given repository and C4 level.
   * Adds changedPath to the accumulator and resets the debounce timer.
   * After debounceMs idle time, flush() is called automatically.
   */
  recordChange(repoPath: string, level: C4Level, changedPath: string): void {
    const key = `${repoPath}:${level}`;
    let acc = this.accumulators.get(key);
    if (!acc) {
      acc = { files: new Set(), timer: null };
      this.accumulators.set(key, acc);
    }

    // Normalize path to forward slashes (Pitfall 3)
    const normalizedPath = changedPath.replace(/\\/g, '/');
    acc.files.add(normalizedPath);

    // Reset debounce timer
    if (acc.timer) clearTimeout(acc.timer);
    acc.timer = setTimeout(() => {
      this.flush(repoPath, level, key);
    }, this.debounceMs);
  }

  /**
   * Clear all pending timers and accumulators.
   * Called on app quit to prevent timer leak (Pitfall 1).
   */
  shutdown(): void {
    for (const acc of this.accumulators.values()) {
      if (acc.timer) {
        clearTimeout(acc.timer);
        acc.timer = null;
      }
    }
    this.accumulators.clear();
  }

  /**
   * Flush accumulated changes for a given key.
   * Maps files to elements, propagates hierarchy, persists to DB,
   * conditionally updates state, and emits IPC event.
   */
  private flush(repoPath: string, level: C4Level, key: string): void {
    const acc = this.accumulators.get(key);
    if (!acc) return;

    const files = Array.from(acc.files);
    acc.files.clear();
    acc.timer = null;

    // Map files to C4 elements (direct)
    const directElements = this.mapFilesToElements(repoPath, level, files);

    // Propagate changes up the hierarchy
    const allElements = this.propagateUp(directElements);

    // Compute element counts
    const elementCounts = this.computeElementCounts(directElements);

    // Persist change tracking data to DB (always, even if generating)
    this.storage.upsertChangeTracking(repoPath, level, files, allElements, elementCounts);

    // Guard: do NOT overwrite 'generating' state (Pitfall 2)
    const currentState = this.storage.getState(repoPath, level);
    if (currentState !== 'generating') {
      this.storage.updateState(repoPath, level, 'stale');
    }

    // Broadcast enriched IPC event to all renderer windows
    this.emitChangeEvent(repoPath, level, files, allElements);
  }

  /**
   * Map file paths to C4 elements using path-based heuristics.
   * Mirrors the logic in C4PlantUMLGenerator.detectComponents() and getContainerPath().
   *
   * - code level: element = filename without extension
   * - component level: element = first directory after container root (main/renderer)
   * - container level: element = Main Process or Renderer Process
   * - context level: returns empty array (CHNG-02 excludes context level)
   */
  private mapFilesToElements(repoPath: string, level: C4Level, files: string[]): AffectedElement[] {
    if (level === 'context') {
      return [];
    }

    const elements: AffectedElement[] = [];
    const seen = new Set<string>();

    for (const file of files) {
      // Normalize and strip repoPath prefix to get relative path
      const normalizedFile = file.replace(/\\/g, '/');
      const normalizedRepo = repoPath.replace(/\\/g, '/');
      const relative = normalizedFile.startsWith(normalizedRepo)
        ? normalizedFile.slice(normalizedRepo.length)
        : normalizedFile;

      if (level === 'code') {
        // Code level: element = filename without extension
        const fileName = relative.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || '';
        if (fileName && !seen.has(fileName)) {
          seen.add(fileName);
          elements.push({
            level: 'code',
            elementId: sanitizeId(fileName),
            elementName: fileName,
            isDirect: true,
          });
        }
      } else if (level === 'component') {
        // Component level: first directory after main/ or renderer/
        const parts = relative.replace(/^\//, '').split('/');
        const containerIdx = parts.findIndex((p) => p === 'main' || p === 'renderer');
        if (containerIdx >= 0 && containerIdx + 1 < parts.length) {
          const rawName = parts[containerIdx + 1];
          if (!seen.has(rawName)) {
            seen.add(rawName);
            const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
            elements.push({
              level: 'component',
              elementId: sanitizeId(capitalizedName),
              elementName: capitalizedName,
              isDirect: true,
            });
          }
        }
      } else if (level === 'container') {
        // Container level: Main Process or Renderer Process
        if (relative.includes('/main/')) {
          if (!seen.has('Main_Process')) {
            seen.add('Main_Process');
            elements.push({
              level: 'container',
              elementId: 'Main_Process',
              elementName: 'Main Process',
              isDirect: true,
            });
          }
        } else if (relative.includes('/renderer/')) {
          if (!seen.has('Renderer_Process')) {
            seen.add('Renderer_Process');
            elements.push({
              level: 'container',
              elementId: 'Renderer_Process',
              elementName: 'Renderer Process',
              isDirect: true,
            });
          }
        }
      }
    }

    return elements;
  }

  /**
   * Propagate direct element changes up the C4 hierarchy.
   * code -> component + container
   * component -> container
   * container -> (nothing higher in element mapping)
   *
   * Propagated entries have isDirect: false.
   * Does not add duplicate if direct entry already exists with same elementId at parent level.
   */
  private propagateUp(direct: AffectedElement[]): AffectedElement[] {
    const all = [...direct];
    const directKeys = new Set(direct.map((e) => `${e.level}:${e.elementId}`));

    for (const el of direct) {
      if (el.level === 'code') {
        // Code changes propagate to component and container
        const componentKey = `component:${el.elementId}`;
        if (!directKeys.has(componentKey)) {
          all.push({ level: 'component', elementId: el.elementId, elementName: el.elementName, isDirect: false });
        }
        const containerKey = `container:${el.elementId}`;
        if (!directKeys.has(containerKey)) {
          all.push({ level: 'container', elementId: el.elementId, elementName: el.elementName, isDirect: false });
        }
      } else if (el.level === 'component') {
        // Component changes propagate to container
        const containerKey = `container:${el.elementId}`;
        if (!directKeys.has(containerKey)) {
          all.push({ level: 'container', elementId: el.elementId, elementName: el.elementName, isDirect: false });
        }
      }
      // container level does not propagate further
    }

    return all;
  }

  /**
   * Broadcast the enriched c4-storage:state-changed event to all renderer windows.
   * Adds changedFiles and affectedElements to the standard payload.
   */
  private emitChangeEvent(
    repoPath: string,
    level: C4Level,
    files: string[],
    elements: AffectedElement[]
  ): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send('c4-storage:state-changed', {
        repoPath,
        level,
        state: 'stale',
        elementId: undefined,
        errorMessage: undefined,
        changedFiles: files,
        affectedElements: elements,
      });
    }
  }

  /**
   * Count direct elements per C4 level.
   * Returns e.g. { container: 1, component: 2, code: 5 }
   */
  computeElementCounts(elements: AffectedElement[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const el of elements) {
      if (el.isDirect) {
        counts[el.level] = (counts[el.level] || 0) + 1;
      }
    }
    return counts;
  }
}
