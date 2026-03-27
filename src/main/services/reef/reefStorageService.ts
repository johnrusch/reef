/**
 * ReefStorageService
 *
 * File I/O layer that owns all `.reef/` folder operations.
 * Stores PlantUML source, AI metadata, and pre-rendered SVGs per repository.
 *
 * Design decisions:
 * - D-01: Flat levels (context, container) get files directly in .reef/
 * - D-02: Nested levels (component, code) get subdirectories keyed by parentId
 * - D-06: .reef/ directory created lazily on first write, never before
 * - D-08: Windows atomic rename: unlink target first to avoid EPERM
 * - D-09: Individual atomic renames, sequential not grouped
 * - D-13: ensureGitattributes idempotent — second call is a no-op
 */

import { mkdir, writeFile, rename, unlink, readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { join, dirname } from 'path';
import {
  REEF_DIR,
  ReefMetaSchema,
  type ReefMetaJson,
  type FlatLevel,
  type NestedLevel,
} from './reefStorageTypes';

export class ReefStorageService {
  /**
   * Write flat-level diagram files to .reef/{level}.{ext}
   * Covers context and container levels (D-01).
   */
  async writeLevelFiles(
    repoPath: string,
    level: FlatLevel,
    puml: string,
    svg: string,
    meta: ReefMetaJson
  ): Promise<void> {
    const pumlPath = join(repoPath, REEF_DIR, `${level}.puml`);
    const svgPath = join(repoPath, REEF_DIR, `${level}.svg`);
    const metaPath = join(repoPath, REEF_DIR, `${level}.meta.json`);

    // D-13: ensure .gitattributes exists (idempotent)
    await this.ensureGitattributes(repoPath);

    // D-09: individual atomic renames, sequential
    await this.atomicWrite(pumlPath, puml);
    await this.atomicWrite(svgPath, svg);
    await this.atomicWrite(metaPath, JSON.stringify(meta, null, 2));
  }

  /**
   * Write nested sub-diagram files to .reef/{level}/{parentId}/diagram.{ext}
   * Covers component and code levels (D-02).
   */
  async writeSubDiagramFiles(
    repoPath: string,
    level: NestedLevel,
    parentId: string,
    puml: string,
    svg: string,
    meta: ReefMetaJson
  ): Promise<void> {
    const pumlPath = join(repoPath, REEF_DIR, level, parentId, 'diagram.puml');
    const svgPath = join(repoPath, REEF_DIR, level, parentId, 'diagram.svg');
    const metaPath = join(repoPath, REEF_DIR, level, parentId, 'diagram.meta.json');

    // D-13: ensure .gitattributes exists (idempotent)
    await this.ensureGitattributes(repoPath);

    // D-09: individual atomic renames, sequential
    await this.atomicWrite(pumlPath, puml);
    await this.atomicWrite(svgPath, svg);
    await this.atomicWrite(metaPath, JSON.stringify(meta, null, 2));
  }

  /**
   * Read and validate a .meta.json file.
   * Returns parsed ReefMetaJson when schemaVersion matches, null otherwise.
   * Per D-05: unrecognized schemaVersion treated as missing — return null.
   */
  async readMeta(
    repoPath: string,
    level: string,
    parentId?: string
  ): Promise<ReefMetaJson | null> {
    const metaPath = parentId
      ? join(repoPath, REEF_DIR, level, parentId, 'diagram.meta.json')
      : join(repoPath, REEF_DIR, `${level}.meta.json`);

    let content: string;
    try {
      content = await readFile(metaPath, 'utf8');
    } catch {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }

    const result = ReefMetaSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }

    return result.data;
  }

  /**
   * Ensure .reef/.gitattributes exists with binary markers for SVG and PUML files.
   * Idempotent: second call returns immediately if file already exists (D-13).
   */
  async ensureGitattributes(repoPath: string): Promise<void> {
    const gitattrsPath = join(repoPath, REEF_DIR, '.gitattributes');

    try {
      await access(gitattrsPath, constants.F_OK);
      // File exists — idempotent, do nothing
      return;
    } catch {
      // File does not exist, create it
    }

    const content =
      '# Reef auto-generated — prevents SVG/PUML merge conflicts\n*.svg binary\n*.puml binary\n';
    await this.atomicWrite(gitattrsPath, content);
  }

  /**
   * Atomically write content to targetPath using temp-then-rename pattern.
   * Cleans up .tmp file on failure (prevents .tmp pollution).
   * Handles Windows EPERM on rename by unlinking target first (D-08).
   * Creates parent directories lazily (D-06).
   */
  private async atomicWrite(targetPath: string, content: string): Promise<void> {
    const tmpPath = `${targetPath}.tmp`;

    try {
      // D-06: lazy directory creation
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(tmpPath, content, 'utf8');

      // D-08: Windows EPERM handling — unlink existing target before rename
      if (process.platform === 'win32') {
        try {
          await unlink(targetPath);
        } catch (err: unknown) {
          // Ignore ENOENT (file doesn't exist yet) — rethrow everything else
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw err;
          }
        }
      }

      await rename(tmpPath, targetPath);
    } catch (err) {
      // Cleanup .tmp pollution (pitfall 3)
      try {
        await unlink(tmpPath);
      } catch {
        // Ignore cleanup errors
      }
      console.warn(`[ReefStorageService] atomicWrite failed for ${targetPath}:`, err);
      throw err;
    }
  }
}
