/**
 * C4 Storage Service
 *
 * Persistent storage for C4 diagrams (v1.1).
 * Replaces v1.0 TTL-based cache with true persistent storage.
 *
 * Key Features:
 * - No TTL expiration - diagrams persist indefinitely
 * - State tracking (never_generated, generating, fresh, stale, error)
 * - WAL mode for concurrent reads
 * - Corruption detection and recovery
 * - Cross-platform path normalization
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import type { C4Level } from './types/c4Types';
import type { DiagramState, StoredDiagram } from '../../../shared/types/diagramState';
import type { AffectedElement } from '../../../shared/types/changeTracking';

export class C4StorageService {
  private db: Database.Database;
  private readonly dbPath: string;

  constructor(dbPath?: string) {
    // Default to userData/diagrams/diagram_storage.db
    if (!dbPath) {
      const userDataPath = app.getPath('userData');
      const storageDir = path.join(userDataPath, 'diagrams');

      // Ensure directory exists
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      this.dbPath = path.join(storageDir, 'diagram_storage.db');
    } else {
      this.dbPath = dbPath;
    }

    this.db = this.initializeDatabase();
  }

  /**
   * Initialize database with WAL mode and integrity check
   */
  private initializeDatabase(): Database.Database {
    try {
      const db = new Database(this.dbPath);

      // Check integrity on startup
      const integrityResult = db.pragma('integrity_check', { simple: true });

      if (integrityResult !== 'ok') {
        console.error(`Database corruption detected: ${integrityResult}`);
        db.close();

        // Backup corrupted database
        const backupPath = `${this.dbPath}.corrupted.${Date.now()}`;
        fs.renameSync(this.dbPath, backupPath);
        console.warn(`Corrupted database backed up to: ${backupPath}`);

        // Create fresh database
        return this.createFreshDatabase();
      }

      // Configure database
      this.configureDatabase(db);

      // Initialize schema
      this.createSchema(db);

      return db;
    } catch (error) {
      console.error(`Cannot open database: ${error}`);

      // Database file corrupted beyond opening
      if (fs.existsSync(this.dbPath)) {
        const backupPath = `${this.dbPath}.corrupted.${Date.now()}`;
        fs.renameSync(this.dbPath, backupPath);
        console.warn(`Corrupted database backed up to: ${backupPath}`);
      }

      return this.createFreshDatabase();
    }
  }

  /**
   * Create a fresh database instance
   */
  private createFreshDatabase(): Database.Database {
    const db = new Database(this.dbPath);
    this.configureDatabase(db);
    this.createSchema(db);
    return db;
  }

  /**
   * Configure database settings (WAL mode, foreign keys, etc.)
   */
  private configureDatabase(db: Database.Database): void {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Enable WAL mode for concurrent reads (STOR-03)
    db.pragma('journal_mode = WAL');

    // Full synchronous mode for crash safety
    db.pragma('synchronous = FULL');

    // Set checkpoint interval (1000 pages = ~4MB WAL before auto-checkpoint)
    db.pragma('wal_autocheckpoint = 1000');
  }

  /**
   * Create v1.1 schema
   */
  private createSchema(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS diagram_storage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_path TEXT NOT NULL,
        level TEXT NOT NULL CHECK(level IN ('context', 'container', 'component', 'code')),
        element_id TEXT,
        diagram_content TEXT NOT NULL,
        diagram_metadata TEXT,
        state TEXT NOT NULL DEFAULT 'fresh' CHECK(state IN ('never_generated', 'generating', 'fresh', 'stale', 'error')),
        error_message TEXT,
        model_used TEXT NOT NULL,
        prompt_version TEXT NOT NULL,
        tokens_used INTEGER,
        generation_cost REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(repo_path, level, element_id)
      );

      CREATE INDEX IF NOT EXISTS idx_repo_level ON diagram_storage(repo_path, level);
      CREATE INDEX IF NOT EXISTS idx_state ON diagram_storage(state);

      CREATE TABLE IF NOT EXISTS diagram_change_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_path TEXT NOT NULL,
        level TEXT NOT NULL CHECK(level IN ('context','container','component','code')),
        changed_files TEXT NOT NULL,
        affected_elements TEXT NOT NULL,
        element_counts TEXT NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(repo_path, level)
      );

      CREATE INDEX IF NOT EXISTS idx_change_tracking_repo
        ON diagram_change_tracking(repo_path);
    `);

    // Set user_version to 2 for v1.2 schema (adds diagram_change_tracking table)
    const currentVersion = db.pragma('user_version', { simple: true }) as number;
    if (currentVersion < 2) {
      db.pragma('user_version = 2');
    }

    // Migration to version 3: add svg_content column for PERF-01 SVG caching
    const currentVersionAfter2 = db.pragma('user_version', { simple: true }) as number;
    if (currentVersionAfter2 < 3) {
      // Check if svg_content column exists (guards against partial migration)
      const cols = db.prepare('PRAGMA table_info(diagram_storage)').all() as Array<{ name: string }>;
      if (!cols.some(c => c.name === 'svg_content')) {
        db.exec('ALTER TABLE diagram_storage ADD COLUMN svg_content TEXT');
      }
      db.pragma('user_version = 3');
    }
  }

  /**
   * Normalize path to forward slashes (cross-platform)
   */
  private normalizePath(repoPath: string): string {
    return repoPath.replace(/\\/g, '/');
  }

  /**
   * Get a stored diagram
   */
  getDiagram(repoPath: string, level: C4Level, elementId?: string): StoredDiagram | null {
    const normalizedPath = this.normalizePath(repoPath);

    const stmt = this.db.prepare(`
      SELECT * FROM diagram_storage
      WHERE repo_path = ? AND level = ? AND (element_id = ? OR (element_id IS NULL AND ? IS NULL))
    `);

    const result = stmt.get(normalizedPath, level, elementId, elementId) as any;

    if (!result) {
      return null;
    }

    // Map database columns to StoredDiagram interface
    return {
      id: result.id,
      repoPath: result.repo_path,
      level: result.level as C4Level,
      elementId: result.element_id,
      diagramContent: result.diagram_content,
      diagramMetadata: result.diagram_metadata,
      state: result.state as DiagramState,
      errorMessage: result.error_message,
      modelUsed: result.model_used,
      promptVersion: result.prompt_version,
      tokensUsed: result.tokens_used,
      generationCost: result.generation_cost,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  /**
   * Store a diagram (INSERT OR REPLACE)
   */
  storeDiagram(diagram: StoredDiagram): void {
    const normalizedPath = this.normalizePath(diagram.repoPath);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO diagram_storage (
        repo_path, level, element_id, diagram_content, diagram_metadata,
        state, error_message, model_used, prompt_version, tokens_used,
        generation_cost, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
    `);

    stmt.run(
      normalizedPath,
      diagram.level,
      diagram.elementId || null,
      diagram.diagramContent,
      diagram.diagramMetadata || null,
      diagram.state,
      diagram.errorMessage || null,
      diagram.modelUsed,
      diagram.promptVersion,
      diagram.tokensUsed || null,
      diagram.generationCost || null,
      diagram.createdAt || null
    );
  }

  /**
   * Update diagram state
   */
  updateState(
    repoPath: string,
    level: C4Level,
    state: DiagramState,
    elementId?: string,
    errorMessage?: string
  ): void {
    const normalizedPath = this.normalizePath(repoPath);

    const stmt = this.db.prepare(`
      UPDATE diagram_storage
      SET state = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE repo_path = ? AND level = ? AND (element_id = ? OR (element_id IS NULL AND ? IS NULL))
    `);

    stmt.run(state, errorMessage || null, normalizedPath, level, elementId, elementId);
  }

  /**
   * Get rendered SVG for a diagram (PERF-01)
   * Returns null if no SVG has been stored for this diagram
   */
  getSvg(repoPath: string, level: C4Level, elementId?: string): string | null {
    const normalizedPath = this.normalizePath(repoPath);
    const stmt = this.db.prepare(`
      SELECT svg_content FROM diagram_storage
      WHERE repo_path = ? AND level = ?
        AND (element_id = ? OR (element_id IS NULL AND ? IS NULL))
        AND svg_content IS NOT NULL
    `);
    const result = stmt.get(normalizedPath, level, elementId ?? null, elementId ?? null) as
      | { svg_content: string }
      | undefined;
    return result?.svg_content ?? null;
  }

  /**
   * Store rendered SVG for a diagram (PERF-01)
   * Only updates existing rows (diagram must already exist via storeDiagram)
   */
  storeSvg(repoPath: string, level: C4Level, svg: string, elementId?: string): void {
    const normalizedPath = this.normalizePath(repoPath);
    const stmt = this.db.prepare(`
      UPDATE diagram_storage
      SET svg_content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE repo_path = ? AND level = ?
        AND (element_id = ? OR (element_id IS NULL AND ? IS NULL))
    `);
    stmt.run(svg, normalizedPath, level, elementId ?? null, elementId ?? null);
  }

  /**
   * Get diagram state
   */
  getState(repoPath: string, level: C4Level, elementId?: string): DiagramState {
    const normalizedPath = this.normalizePath(repoPath);

    const stmt = this.db.prepare(`
      SELECT state FROM diagram_storage
      WHERE repo_path = ? AND level = ? AND (element_id = ? OR (element_id IS NULL AND ? IS NULL))
    `);

    const result = stmt.get(normalizedPath, level, elementId, elementId) as
      | { state: DiagramState }
      | undefined;

    return result?.state || 'never_generated';
  }

  /**
   * Get all diagrams for a repository
   */
  getAllDiagramsForRepo(repoPath: string): StoredDiagram[] {
    const normalizedPath = this.normalizePath(repoPath);

    const stmt = this.db.prepare(`
      SELECT * FROM diagram_storage
      WHERE repo_path = ?
      ORDER BY level, element_id
    `);

    const results = stmt.all(normalizedPath) as any[];

    return results.map((result) => ({
      id: result.id,
      repoPath: result.repo_path,
      level: result.level as C4Level,
      elementId: result.element_id,
      diagramContent: result.diagram_content,
      diagramMetadata: result.diagram_metadata,
      state: result.state as DiagramState,
      errorMessage: result.error_message,
      modelUsed: result.model_used,
      promptVersion: result.prompt_version,
      tokensUsed: result.tokens_used,
      generationCost: result.generation_cost,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    }));
  }

  /**
   * Delete diagrams for a repository
   * NOTE: Per user decision, this is NOT called when repo is removed from Reef
   * Only used for manual "Clear diagrams for this repo" action
   */
  deleteDiagramsForRepo(repoPath: string): void {
    const normalizedPath = this.normalizePath(repoPath);

    const stmt = this.db.prepare(`
      DELETE FROM diagram_storage
      WHERE repo_path = ?
    `);

    stmt.run(normalizedPath);
  }

  /**
   * Clear all diagrams (for Settings "Clear All" button)
   */
  clearAllDiagrams(): void {
    this.db.prepare('DELETE FROM diagram_storage').run();
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): { path: string; sizeBytes: number; diagramCount: number } {
    // Get diagram count
    const countResult = this.db.prepare('SELECT COUNT(*) as count FROM diagram_storage').get() as {
      count: number;
    };

    // Get file size
    let sizeBytes = 0;
    if (fs.existsSync(this.dbPath)) {
      const stats = fs.statSync(this.dbPath);
      sizeBytes = stats.size;

      // Add WAL file size if exists
      const walPath = `${this.dbPath}-wal`;
      if (fs.existsSync(walPath)) {
        const walStats = fs.statSync(walPath);
        sizeBytes += walStats.size;
      }
    }

    return {
      path: this.dbPath,
      sizeBytes,
      diagramCount: countResult.count,
    };
  }

  /**
   * Upsert change tracking data for a (repo, level) pair.
   * Uses INSERT OR REPLACE to keep only the most recent snapshot.
   * Called by ChangeTrackingService after each debounced flush.
   */
  upsertChangeTracking(
    repoPath: string,
    level: C4Level,
    changedFiles: string[],
    affectedElements: AffectedElement[],
    elementCounts: Record<string, number>
  ): void {
    const normalizedPath = this.normalizePath(repoPath);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO diagram_change_tracking
        (repo_path, level, changed_files, affected_elements, element_counts, recorded_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      normalizedPath,
      level,
      JSON.stringify(changedFiles),
      JSON.stringify(affectedElements),
      JSON.stringify(elementCounts)
    );
  }

  /**
   * Retrieve the most recent change tracking snapshot for a (repo, level) pair.
   * Returns null if no tracking data exists.
   */
  getChangeTracking(
    repoPath: string,
    level: C4Level
  ): { changedFiles: string[]; affectedElements: AffectedElement[]; elementCounts: Record<string, number> } | null {
    const normalizedPath = this.normalizePath(repoPath);

    const stmt = this.db.prepare(`
      SELECT changed_files, affected_elements, element_counts
      FROM diagram_change_tracking
      WHERE repo_path = ? AND level = ?
    `);

    const result = stmt.get(normalizedPath, level) as
      | { changed_files: string; affected_elements: string; element_counts: string }
      | undefined;

    if (!result) {
      return null;
    }

    return {
      changedFiles: JSON.parse(result.changed_files) as string[],
      affectedElements: JSON.parse(result.affected_elements) as AffectedElement[],
      elementCounts: JSON.parse(result.element_counts) as Record<string, number>,
    };
  }

  /**
   * Clear change tracking data for a (repo, level) pair.
   * Called when state transitions to 'fresh' or 'generating' (diagram regenerated).
   */
  clearChangeTracking(repoPath: string, level: C4Level): void {
    const normalizedPath = this.normalizePath(repoPath);

    const stmt = this.db.prepare(`
      DELETE FROM diagram_change_tracking
      WHERE repo_path = ? AND level = ?
    `);

    stmt.run(normalizedPath, level);
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}
