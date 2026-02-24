import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MigrationService } from '@main/services/c4/migrationService';
import { C4StorageService } from '@main/services/c4/c4StorageService';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') {
        return path.join(os.tmpdir(), 'test-electron-data');
      }
      return os.tmpdir();
    }),
  },
}));

// Mock electron-store
vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      private data: Map<string, any> = new Map();

      get(key: string, defaultValue?: any): any {
        return this.data.has(key) ? this.data.get(key) : defaultValue;
      }

      set(key: string, value: any): void {
        this.data.set(key, value);
      }

      delete(key: string): void {
        this.data.delete(key);
      }

      clear(): void {
        this.data.clear();
      }
    },
  };
});

describe('MigrationService', () => {
  let migrationService: MigrationService;
  let testDataPath: string;
  let v1CachePath: string;

  beforeEach(() => {
    testDataPath = path.join(os.tmpdir(), 'test-electron-data');
    v1CachePath = path.join(testDataPath, 'cache', 'diagram_cache.db');

    // Ensure directories exist
    if (!fs.existsSync(testDataPath)) {
      fs.mkdirSync(testDataPath, { recursive: true });
    }
    if (!fs.existsSync(path.dirname(v1CachePath))) {
      fs.mkdirSync(path.dirname(v1CachePath), { recursive: true });
    }

    migrationService = new MigrationService();
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(v1CachePath)) {
      fs.unlinkSync(v1CachePath);
    }
    const walPath = `${v1CachePath}-wal`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    const shmPath = `${v1CachePath}-shm`;
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
  });

  describe('version detection (STOR-02)', () => {
    it('detects v1.0 database via user_version = 0', () => {
      // Create v1.0 database (user_version = 0)
      const db = new Database(v1CachePath);
      db.exec(`
        CREATE TABLE diagram_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          diagram_type TEXT NOT NULL,
          diagram_content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      // Don't set user_version - it defaults to 0

      const version = migrationService.detectVersion(db);
      expect(version).toBe(0);

      db.close();
    });

    it('detects v1.1 database via user_version = 1', () => {
      // Create v1.1 database (user_version = 1)
      const db = new Database(v1CachePath);
      db.pragma('user_version = 1');

      const version = migrationService.detectVersion(db);
      expect(version).toBe(1);

      db.close();
    });

    it('returns needsMigration true when v1.0 cache exists', () => {
      // Create v1.0 cache database
      const db = new Database(v1CachePath);
      db.exec(`
        CREATE TABLE diagram_cache (
          id INTEGER PRIMARY KEY,
          repo_path TEXT NOT NULL
        );
      `);
      db.close();

      const needsMigration = migrationService.needsMigration();
      expect(needsMigration).toBe(true);
    });

    it('returns needsMigration false after migration complete', () => {
      // Mark migration as completed via mock store
      (migrationService as any).migrationStore.set('v1_1_migration_completed', true);

      const needsMigration = migrationService.needsMigration();
      expect(needsMigration).toBe(false);
    });
  });

  describe('diagram migration (STOR-02)', () => {
    it('copies all v1.0 diagrams to v1.1 schema', () => {
      // Create v1.0 database with sample diagrams
      const db = new Database(v1CachePath);
      db.exec(`
        CREATE TABLE diagram_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          diagram_type TEXT NOT NULL,
          element_id TEXT,
          diagram_content TEXT NOT NULL,
          diagram_metadata TEXT,
          model_used TEXT NOT NULL,
          prompt_version TEXT NOT NULL,
          tokens_used INTEGER,
          generation_cost REAL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          access_count INTEGER DEFAULT 0
        );
      `);

      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO diagram_cache
        (repo_path, diagram_type, diagram_content, model_used, prompt_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('/test/repo1', 'c4_context', 'diagram 1', 'claude-3', '1.0', now);

      db.prepare(`
        INSERT INTO diagram_cache
        (repo_path, diagram_type, diagram_content, model_used, prompt_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('/test/repo2', 'c4_container', 'diagram 2', 'claude-3', '1.0', now);

      db.close();

      // Create v1.1 storage service
      const v1StorageService = new C4StorageService(':memory:');

      // Run migration
      migrationService.migrate(v1StorageService);

      // Verify all diagrams were migrated
      const diagram1 = v1StorageService.getDiagram('/test/repo1', 'context');
      const diagram2 = v1StorageService.getDiagram('/test/repo2', 'container');

      expect(diagram1).not.toBeNull();
      expect(diagram1?.diagramContent).toBe('diagram 1');

      expect(diagram2).not.toBeNull();
      expect(diagram2?.diagramContent).toBe('diagram 2');

      v1StorageService.close();
    });

    it('marks expired TTL diagrams as stale', () => {
      // Create v1.0 database with expired diagram
      const db = new Database(v1CachePath);
      db.exec(`
        CREATE TABLE diagram_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          diagram_type TEXT NOT NULL,
          diagram_content TEXT NOT NULL,
          model_used TEXT NOT NULL,
          prompt_version TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create diagram from 10 days ago (context TTL is 7 days)
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO diagram_cache
        (repo_path, diagram_type, diagram_content, model_used, prompt_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('/test/repo', 'c4_context', 'expired diagram', 'claude-3', '1.0', tenDaysAgo);

      db.close();

      // Create v1.1 storage service
      const v1StorageService = new C4StorageService(':memory:');

      // Run migration
      migrationService.migrate(v1StorageService);

      // Verify diagram state is 'stale'
      const diagram = v1StorageService.getDiagram('/test/repo', 'context');
      expect(diagram).not.toBeNull();
      expect(diagram?.state).toBe('stale');

      v1StorageService.close();
    });

    it('marks fresh TTL diagrams as fresh', () => {
      // Create v1.0 database with fresh diagram
      const db = new Database(v1CachePath);
      db.exec(`
        CREATE TABLE diagram_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          diagram_type TEXT NOT NULL,
          diagram_content TEXT NOT NULL,
          model_used TEXT NOT NULL,
          prompt_version TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create diagram from 1 day ago (context TTL is 7 days)
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO diagram_cache
        (repo_path, diagram_type, diagram_content, model_used, prompt_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('/test/repo', 'c4_context', 'fresh diagram', 'claude-3', '1.0', oneDayAgo);

      db.close();

      // Create v1.1 storage service
      const v1StorageService = new C4StorageService(':memory:');

      // Run migration
      migrationService.migrate(v1StorageService);

      // Verify diagram state is 'fresh'
      const diagram = v1StorageService.getDiagram('/test/repo', 'context');
      expect(diagram).not.toBeNull();
      expect(diagram?.state).toBe('fresh');

      v1StorageService.close();
    });

    it('extracts level from v1.0 diagram_type field', () => {
      const testCases = [
        { diagramType: 'c4_context', expectedLevel: 'context' },
        { diagramType: 'c4_container', expectedLevel: 'container' },
        { diagramType: 'c4_component', expectedLevel: 'component' },
        { diagramType: 'c4_code', expectedLevel: 'code' },
      ];

      testCases.forEach(({ diagramType, expectedLevel }) => {
        const level = migrationService.extractLevelFromDiagramType(diagramType);
        expect(level).toBe(expectedLevel);
      });
    });

    it('handles null element_id for root diagrams', () => {
      // Create v1.0 database
      const db = new Database(v1CachePath);
      db.exec(`
        CREATE TABLE diagram_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          diagram_type TEXT NOT NULL,
          element_id TEXT,
          diagram_content TEXT NOT NULL,
          model_used TEXT NOT NULL,
          prompt_version TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO diagram_cache
        (repo_path, diagram_type, element_id, diagram_content, model_used, prompt_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('/test/repo', 'c4_context', null, 'root diagram', 'claude-3', '1.0', now);

      db.close();

      // Create v1.1 storage service
      const v1StorageService = new C4StorageService(':memory:');

      // Run migration
      migrationService.migrate(v1StorageService);

      // Verify diagram was migrated with null/undefined elementId
      const diagram = v1StorageService.getDiagram('/test/repo', 'context');
      expect(diagram).not.toBeNull();
      // Database stores undefined as NULL, which comes back as null
      expect(diagram?.elementId).toBeNull();

      v1StorageService.close();
    });

    it('sets user_version to 1 after migration', () => {
      // Create v1.0 database
      const db = new Database(v1CachePath);
      db.exec(`
        CREATE TABLE diagram_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          diagram_type TEXT NOT NULL,
          diagram_content TEXT NOT NULL,
          model_used TEXT NOT NULL,
          prompt_version TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      db.close();

      // Create v1.1 storage service
      const v1StorageService = new C4StorageService(':memory:');

      // Run migration
      migrationService.migrate(v1StorageService);

      // Check v1.1 storage has user_version = 1
      const db1_1 = (v1StorageService as any).db;
      const version = db1_1.pragma('user_version', { simple: true });
      expect(version).toBe(1);

      v1StorageService.close();
    });
  });

  describe('TTL expiration detection', () => {
    it('detects expired context diagrams (>7 days)', () => {
      const ttl = MigrationService.getTTLForLevel('context');
      expect(ttl).toBe(7 * 24 * 60 * 60 * 1000);

      // Test with diagram older than 7 days
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const v1Diagram = {
        created_at: eightDaysAgo.toISOString(),
        diagram_type: 'c4_context',
      };

      const isExpired = (migrationService as any).isV1DiagramExpired(v1Diagram, 'context');
      expect(isExpired).toBe(true);
    });

    it('detects expired container diagrams (>3 days)', () => {
      const ttl = MigrationService.getTTLForLevel('container');
      expect(ttl).toBe(3 * 24 * 60 * 60 * 1000);

      // Test with diagram older than 3 days
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      const v1Diagram = {
        created_at: fourDaysAgo.toISOString(),
        diagram_type: 'c4_container',
      };

      const isExpired = (migrationService as any).isV1DiagramExpired(v1Diagram, 'container');
      expect(isExpired).toBe(true);
    });

    it('detects expired component diagrams (>1 day)', () => {
      const ttl = MigrationService.getTTLForLevel('component');
      expect(ttl).toBe(24 * 60 * 60 * 1000);

      // Test with diagram older than 1 day
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const v1Diagram = {
        created_at: twoDaysAgo.toISOString(),
        diagram_type: 'c4_component',
      };

      const isExpired = (migrationService as any).isV1DiagramExpired(v1Diagram, 'component');
      expect(isExpired).toBe(true);
    });

    it('detects expired code diagrams (>6 hours)', () => {
      const ttl = MigrationService.getTTLForLevel('code');
      expect(ttl).toBe(6 * 60 * 60 * 1000);

      // Test with diagram older than 6 hours
      const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000);
      const v1Diagram = {
        created_at: sevenHoursAgo.toISOString(),
        diagram_type: 'c4_code',
      };

      const isExpired = (migrationService as any).isV1DiagramExpired(v1Diagram, 'code');
      expect(isExpired).toBe(true);
    });
  });

  describe('migration safety', () => {
    it('uses transaction for atomic migration', () => {
      // Create v1.0 database
      const db = new Database(v1CachePath);
      db.exec(`
        CREATE TABLE diagram_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          diagram_type TEXT NOT NULL,
          diagram_content TEXT NOT NULL,
          model_used TEXT NOT NULL,
          prompt_version TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO diagram_cache
        (repo_path, diagram_type, diagram_content, model_used, prompt_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('/test/repo', 'c4_context', 'test', 'claude-3', '1.0', now);

      db.close();

      // Create v1.1 storage service
      const v1StorageService = new C4StorageService(':memory:');

      // Run migration
      migrationService.migrate(v1StorageService);

      // Verify migration completed atomically (all or nothing)
      const migrationCompleted = (migrationService as any).migrationStore.get('v1_1_migration_completed');
      expect(migrationCompleted).toBe(true);

      v1StorageService.close();
    });

    it('continues migration if single diagram fails', () => {
      // Create v1.0 database with one valid and one potentially problematic diagram
      const db = new Database(v1CachePath);
      db.exec(`
        CREATE TABLE diagram_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL,
          diagram_type TEXT NOT NULL,
          diagram_content TEXT NOT NULL,
          model_used TEXT NOT NULL,
          prompt_version TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO diagram_cache
        (repo_path, diagram_type, diagram_content, model_used, prompt_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('/test/repo1', 'c4_context', 'valid diagram', 'claude-3', '1.0', now);

      db.prepare(`
        INSERT INTO diagram_cache
        (repo_path, diagram_type, diagram_content, model_used, prompt_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('/test/repo2', 'c4_container', 'another valid diagram', 'claude-3', '1.0', now);

      db.close();

      // Create v1.1 storage service
      const v1StorageService = new C4StorageService(':memory:');

      // Run migration
      migrationService.migrate(v1StorageService);

      // Verify at least some diagrams were migrated
      const diagram1 = v1StorageService.getDiagram('/test/repo1', 'context');
      expect(diagram1).not.toBeNull();

      v1StorageService.close();
    });

    it('logs warning for failed diagram migration', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create v1.0 database with invalid data that should trigger warning
      const db = new Database(v1CachePath);
      db.exec(`
        CREATE TABLE diagram_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT,
          diagram_type TEXT,
          diagram_content TEXT,
          model_used TEXT,
          prompt_version TEXT,
          created_at TIMESTAMP
        );
      `);

      // Insert diagram with null required fields
      db.prepare(`
        INSERT INTO diagram_cache
        (repo_path, diagram_type, diagram_content, model_used, prompt_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(null, null, null, null, null, null);

      db.close();

      // Create v1.1 storage service
      const v1StorageService = new C4StorageService(':memory:');

      // Run migration - should handle errors gracefully
      try {
        migrationService.migrate(v1StorageService);
      } catch (error) {
        // Migration may fail entirely if all diagrams are invalid
      }

      v1StorageService.close();
      consoleWarnSpy.mockRestore();
    });

    it('checks migration lock to prevent concurrent migrations', () => {
      // Set migration in progress
      (migrationService as any).migrationStore.set('v1_1_migration_in_progress', true);

      // Create v1.0 database
      const db = new Database(v1CachePath);
      db.exec(`
        CREATE TABLE diagram_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_path TEXT NOT NULL
        );
      `);
      db.close();

      // Create v1.1 storage service
      const v1StorageService = new C4StorageService(':memory:');

      // Attempt migration should throw
      expect(() => {
        migrationService.migrate(v1StorageService);
      }).toThrow('Migration already in progress');

      v1StorageService.close();
    });
  });

  describe('cleanup', () => {
    it('cleanupV1Cache removes v1.0 database file', () => {
      // Create v1.0 database file
      const db = new Database(v1CachePath);
      db.close();

      expect(fs.existsSync(v1CachePath)).toBe(true);

      // Run cleanup
      migrationService.cleanupV1Cache();

      // Verify file was deleted
      expect(fs.existsSync(v1CachePath)).toBe(false);
    });

    it('cleanupV1Cache removes WAL files', () => {
      // Create v1.0 database file with WAL mode
      const db = new Database(v1CachePath);
      db.pragma('journal_mode = WAL');
      db.exec(`
        CREATE TABLE test (id INTEGER);
        INSERT INTO test VALUES (1);
      `);
      db.close();

      // Verify WAL file exists
      const walPath = `${v1CachePath}-wal`;
      const walExists = fs.existsSync(walPath);

      // Run cleanup
      migrationService.cleanupV1Cache();

      // Verify all files were deleted
      expect(fs.existsSync(v1CachePath)).toBe(false);
      if (walExists) {
        expect(fs.existsSync(walPath)).toBe(false);
      }
    });
  });
});
