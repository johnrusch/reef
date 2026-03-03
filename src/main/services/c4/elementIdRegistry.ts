/**
 * Element ID Registry
 *
 * Single source of truth for:
 * 1. sanitizeId - converts human-readable names to valid PlantUML identifiers
 * 2. ElementIdRegistry - maps sanitized IDs back to filesystem paths for drill-down navigation
 * 3. deriveContainerPath - dynamically resolves a container name to its source directory
 *    using static analysis data (replaces hardcoded getContainerPath map)
 *
 * Design decisions (13-01):
 * - sanitizeId defined once here; all consumers import from this module
 * - Registry is a plain class (not singleton) so callers control lifecycle
 * - deriveContainerPath uses fuzzy matching on entryPoints then class files, with
 *   a normalized-lowercase fallback to avoid empty strings
 */

import type { AnalysisResult } from './types/analysisTypes';
import type { C4Level } from './types/c4Types';

/**
 * Sanitizes a name into a valid PlantUML identifier.
 *
 * Rules:
 * - Replace any character that is not alphanumeric or underscore with '_'
 * - Prefix leading digit with '_' (IDs cannot start with a number)
 *
 * Examples:
 *   "Main Process"  -> "Main_Process"
 *   "123invalid"    -> "_123invalid"
 *   "already_valid" -> "already_valid"
 */
export function sanitizeId(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&');
}

/**
 * Metadata stored per registered element.
 */
export interface RegistryEntry {
  humanName: string;
  containerPath: string;
  level: C4Level;
}

/**
 * Registry mapping sanitized PlantUML IDs to their filesystem container paths.
 *
 * Populated during generateContainerDiagram() so that subsequent
 * generateComponentDiagram() calls can look up the correct source directory
 * for any container without relying on a hardcoded map.
 */
export class ElementIdRegistry {
  private readonly entries: Map<string, RegistryEntry>;

  constructor() {
    this.entries = new Map();
  }

  /**
   * Register a mapping from sanitized ID to filesystem path and metadata.
   */
  register(sanitizedId: string, humanName: string, containerPath: string, level: C4Level): void {
    this.entries.set(sanitizedId, { humanName, containerPath, level });
  }

  /**
   * Returns the filesystem path for the given sanitized ID, or null if not registered.
   */
  getContainerPath(sanitizedId: string): string | null {
    return this.entries.get(sanitizedId)?.containerPath ?? null;
  }

  /**
   * Returns the human-readable name for the given sanitized ID, or null if not registered.
   */
  getHumanName(sanitizedId: string): string | null {
    return this.entries.get(sanitizedId)?.humanName ?? null;
  }

  /**
   * Removes all registered entries.
   */
  clear(): void {
    this.entries.clear();
  }
}

/**
 * Dynamically resolves a container name to its source directory by searching
 * static analysis data, replacing the old hardcoded getContainerPath() map.
 *
 * Resolution order:
 * 1. Fuzzy match containerName against directory segments from entryPoints
 * 2. Fuzzy match against directory segments from class file paths
 * 3. Check componentGroups labels for fuzzy match
 * 4. Absolute fallback: containerName.toLowerCase().replace(/\s+/g, '/')
 *
 * "Fuzzy match" = normalized (no underscores, lowercase) includes check.
 *
 * @param containerName - Human-readable name (e.g. "Main Process", "API Server")
 * @param staticData    - Static analysis result with entryPoints and structure
 * @returns Resolved path string (never empty)
 */
export function deriveContainerPath(containerName: string, staticData: AnalysisResult): string {
  // Normalize the container name for matching: strip underscores, lowercase
  const normalized = containerName.replace(/_/g, '').toLowerCase();

  // 1. Search entryPoints for a src-relative directory match
  for (const ep of staticData.entryPoints) {
    const parts = ep.replace(/\\/g, '/').split('/');
    const srcIdx = parts.indexOf('src');

    if (srcIdx >= 0 && srcIdx + 1 < parts.length) {
      const dirSegment = parts[srcIdx + 1].toLowerCase();
      if (normalized.includes(dirSegment) || dirSegment.includes(normalized)) {
        return parts.slice(0, srcIdx + 2).join('/');
      }
    }
  }

  // 2. Search class file paths for a src-relative directory match
  for (const cls of staticData.structure.classes) {
    const parts = cls.file.replace(/\\/g, '/').split('/');
    const srcIdx = parts.indexOf('src');

    if (srcIdx >= 0 && srcIdx + 1 < parts.length) {
      const dirSegment = parts[srcIdx + 1].toLowerCase();
      if (normalized.includes(dirSegment) || dirSegment.includes(normalized)) {
        return parts.slice(0, srcIdx + 2).join('/');
      }
    }
  }

  // 3. Check componentGroups labels for a fuzzy match
  if (staticData.componentGroups && staticData.componentGroups.length > 0) {
    for (const group of staticData.componentGroups) {
      const groupNorm = group.label.replace(/_/g, '').toLowerCase();
      if (normalized.includes(groupNorm) || groupNorm.includes(normalized)) {
        // Return directory of first file in group (if available)
        const firstFile = group.files[0];
        if (firstFile) {
          const parts = firstFile.replace(/\\/g, '/').split('/');
          parts.pop(); // remove filename
          return parts.join('/');
        }
      }
    }
  }

  // 4. Absolute fallback: normalize to lowercase (preserving underscores)
  return containerName.toLowerCase().replace(/\s+/g, '/');
}
