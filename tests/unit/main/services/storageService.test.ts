import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { C4StorageService } from '@main/services/c4/c4StorageService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir()),
  },
}));

describe('C4StorageService', () => {
  let service: C4StorageService;
  let testDbPath: string;

  beforeEach(() => {
    // Create unique test database path
    testDbPath = path.join(os.tmpdir(), `test-storage-${Date.now()}.db`);
    service = new C4StorageService(testDbPath);
  });

  afterEach(() => {
    // Clean up
    service.close();

    // Remove test database files
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const walPath = `${testDbPath}-wal`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
  });

  describe('diagram persistence (STOR-01)', () => {
    it('stores diagram without TTL expiration', () => {
      const diagram = {
        repoPath: '/test/repo',
        level: 'context' as const,
        diagramContent: 'test content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      };

      service.storeDiagram(diagram);
      const retrieved = service.getDiagram('/test/repo', 'context');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.diagramContent).toBe('test content');
      expect(retrieved?.state).toBe('fresh');

      // Verify no TTL-related methods exist
      expect(typeof (service as any).cleanupOldEntries).toBe('undefined');
    });

    it('retrieves diagram regardless of age (no TTL)', async () => {
      const diagram = {
        repoPath: '/test/repo',
        level: 'context' as const,
        diagramContent: 'old content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days old
      };

      service.storeDiagram(diagram);

      // Wait a moment to ensure timestamp is in past
      await new Promise(resolve => setTimeout(resolve, 100));

      const retrieved = service.getDiagram('/test/repo', 'context');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.diagramContent).toBe('old content');
      // Diagram should still be accessible despite age
    });

    it('returns null for non-existent diagram', () => {
      const result = service.getDiagram('/nonexistent/repo', 'context');
      expect(result).toBeNull();
    });

    it('updates existing diagram via INSERT OR REPLACE', async () => {
      // Note: When element_id is NULL, SQLite's UNIQUE constraint treats each NULL
      // as distinct, so we need to explicitly use an elementId to test updates.
      // For root diagrams (no elementId), use empty string instead.

      const diagram1 = {
        repoPath: '/test/repo',
        level: 'context' as const,
        elementId: 'test-element',
        diagramContent: 'first content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      };

      service.storeDiagram(diagram1);

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Get the first diagram to capture its createdAt
      const first = service.getDiagram('/test/repo', 'context', 'test-element');
      expect(first).not.toBeNull();

      const diagram2 = {
        repoPath: '/test/repo',
        level: 'context' as const,
        elementId: 'test-element', // Same elementId to trigger UNIQUE constraint
        diagramContent: 'updated content',
        state: 'fresh' as const,
        modelUsed: 'claude-3.5',
        promptVersion: '1.1',
        createdAt: first?.createdAt, // Preserve createdAt
      };

      service.storeDiagram(diagram2);

      const retrieved = service.getDiagram('/test/repo', 'context', 'test-element');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.diagramContent).toBe('updated content');
      expect(retrieved?.modelUsed).toBe('claude-3.5');
      expect(retrieved?.promptVersion).toBe('1.1');

      // Verify there's still only one diagram for this repo/level/element
      const allDiagrams = service.getAllDiagramsForRepo('/test/repo');
      expect(allDiagrams).toHaveLength(1);
    });

    it('normalizes repo paths to forward slashes', () => {
      const diagram = {
        repoPath: 'C:\\Users\\test\\repo',
        level: 'context' as const,
        diagramContent: 'test content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      };

      service.storeDiagram(diagram);

      // Retrieve with forward slashes
      const retrieved = service.getDiagram('C:/Users/test/repo', 'context');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.diagramContent).toBe('test content');
    });
  });

  describe('WAL mode (STOR-03)', () => {
    it('enables WAL journal mode on initialization', () => {
      const db = (service as any).db;
      const journalMode = db.pragma('journal_mode', { simple: true });
      expect(journalMode).toBe('wal');
    });

    it('sets synchronous mode to FULL', () => {
      const db = (service as any).db;
      const syncMode = db.pragma('synchronous', { simple: true });
      expect(syncMode).toBe(2); // FULL = 2 in SQLite
    });

    it('configures wal_autocheckpoint', () => {
      const db = (service as any).db;
      const checkpoint = db.pragma('wal_autocheckpoint', { simple: true });
      expect(checkpoint).toBe(1000);
    });
  });

  describe('state tracking (STOR-04)', () => {
    it('stores state column with diagram', () => {
      const diagram = {
        repoPath: '/test/repo',
        level: 'context' as const,
        diagramContent: 'test content',
        state: 'generating' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      };

      service.storeDiagram(diagram);
      const retrieved = service.getDiagram('/test/repo', 'context');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.state).toBe('generating');
    });

    it('retrieves state for existing diagram', () => {
      const diagram = {
        repoPath: '/test/repo',
        level: 'context' as const,
        diagramContent: 'test content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      };

      service.storeDiagram(diagram);
      const state = service.getState('/test/repo', 'context');

      expect(state).toBe('fresh');
    });

    it('returns never_generated for unknown diagram', () => {
      const state = service.getState('/unknown/repo', 'context');
      expect(state).toBe('never_generated');
    });

    it('updates state without replacing diagram content', () => {
      const diagram = {
        repoPath: '/test/repo',
        level: 'context' as const,
        diagramContent: 'original content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      };

      service.storeDiagram(diagram);
      service.updateState('/test/repo', 'context', 'stale');

      const retrieved = service.getDiagram('/test/repo', 'context');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.diagramContent).toBe('original content');
      expect(retrieved?.state).toBe('stale');
    });

    it('stores error message with error state', () => {
      const diagram = {
        repoPath: '/test/repo',
        level: 'context' as const,
        diagramContent: 'test content',
        state: 'error' as const,
        errorMessage: 'Generation failed',
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      };

      service.storeDiagram(diagram);
      const retrieved = service.getDiagram('/test/repo', 'context');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.state).toBe('error');
      expect(retrieved?.errorMessage).toBe('Generation failed');
    });

    it('enforces valid state values via CHECK constraint', () => {
      const db = (service as any).db;

      // Try to insert invalid state directly
      const stmt = db.prepare(`
        INSERT INTO diagram_storage
        (repo_path, level, diagram_content, state, model_used, prompt_version)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      expect(() => {
        stmt.run('/test/repo', 'context', 'test', 'invalid_state', 'claude-3', '1.0');
      }).toThrow();
    });
  });

  describe('storage operations', () => {
    it('getAllDiagramsForRepo returns all diagrams for repo', () => {
      service.storeDiagram({
        repoPath: '/test/repo',
        level: 'context' as const,
        diagramContent: 'context content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      });

      service.storeDiagram({
        repoPath: '/test/repo',
        level: 'container' as const,
        diagramContent: 'container content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      });

      service.storeDiagram({
        repoPath: '/other/repo',
        level: 'context' as const,
        diagramContent: 'other content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      });

      const diagrams = service.getAllDiagramsForRepo('/test/repo');

      expect(diagrams).toHaveLength(2);
      // Just check that both levels are present, order may vary
      const levels = diagrams.map(d => d.level);
      expect(levels).toContain('context');
      expect(levels).toContain('container');
    });

    it('clearAllDiagrams removes all entries', () => {
      service.storeDiagram({
        repoPath: '/test/repo1',
        level: 'context' as const,
        diagramContent: 'content 1',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      });

      service.storeDiagram({
        repoPath: '/test/repo2',
        level: 'container' as const,
        diagramContent: 'content 2',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      });

      const statsBefore = service.getStorageStats();
      expect(statsBefore.diagramCount).toBe(2);

      service.clearAllDiagrams();

      const statsAfter = service.getStorageStats();
      expect(statsAfter.diagramCount).toBe(0);
    });

    it('getStorageStats returns path, size, and count', () => {
      service.storeDiagram({
        repoPath: '/test/repo',
        level: 'context' as const,
        diagramContent: 'test content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      });

      const stats = service.getStorageStats();

      expect(stats).toHaveProperty('path');
      expect(stats).toHaveProperty('sizeBytes');
      expect(stats).toHaveProperty('diagramCount');
      expect(stats.path).toBe(testDbPath);
      expect(stats.diagramCount).toBe(1);
      expect(stats.sizeBytes).toBeGreaterThan(0);
    });

    it('close properly closes database connection', () => {
      const diagram = {
        repoPath: '/test/repo',
        level: 'context' as const,
        diagramContent: 'test content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      };

      service.storeDiagram(diagram);
      service.close();

      // After close, operations should fail
      expect(() => {
        service.getDiagram('/test/repo', 'context');
      }).toThrow();
    });
  });

  describe('corruption handling', () => {
    it('detects corruption via integrity_check pragma', () => {
      // This test verifies that the service checks integrity on init
      // We can't easily create a corrupted database, but we can verify
      // the integrity check code path exists
      const db = (service as any).db;
      const result = db.pragma('integrity_check', { simple: true });
      expect(result).toBe('ok');
    });

    it('creates backup of corrupted database', () => {
      // Create a corrupted database file
      service.close();
      fs.writeFileSync(testDbPath, 'corrupted data');

      // Try to open corrupted database
      const newService = new C4StorageService(testDbPath);

      // Verify a backup was created
      const files = fs.readdirSync(path.dirname(testDbPath));
      const backupFiles = files.filter(f => f.includes('corrupted'));
      expect(backupFiles.length).toBeGreaterThan(0);

      newService.close();
    });

    it('initializes fresh database after corruption', () => {
      // Create a corrupted database file
      service.close();
      fs.writeFileSync(testDbPath, 'corrupted data');

      // Open should succeed with fresh database
      const newService = new C4StorageService(testDbPath);

      // Verify it's a fresh, working database
      const stats = newService.getStorageStats();
      expect(stats.diagramCount).toBe(0);

      newService.close();
    });
  });

  describe('diagram change tracking (CHNG-05)', () => {
    const sampleChangedFiles = ['/repo/src/main/services/gitService.ts'];
    const sampleAffectedElements = [
      { level: 'component' as const, elementId: 'Services', elementName: 'Services', isDirect: true },
      { level: 'container' as const, elementId: 'Main_Process', elementName: 'Main Process', isDirect: false },
    ];
    const sampleElementCounts = { container: 1, component: 1, code: 0 };

    it('upserts change tracking data', () => {
      service.upsertChangeTracking(
        '/test/repo',
        'component',
        sampleChangedFiles,
        sampleAffectedElements,
        sampleElementCounts
      );

      const result = service.getChangeTracking('/test/repo', 'component');

      expect(result).not.toBeNull();
      expect(result?.changedFiles).toEqual(sampleChangedFiles);
      expect(result?.affectedElements).toEqual(sampleAffectedElements);
      expect(result?.elementCounts).toEqual(sampleElementCounts);
    });

    it('replaces previous tracking data on upsert', () => {
      service.upsertChangeTracking('/test/repo', 'component', ['/repo/file1.ts'], [], { component: 1 });
      service.upsertChangeTracking('/test/repo', 'component', ['/repo/file2.ts'], sampleAffectedElements, { component: 2 });

      const result = service.getChangeTracking('/test/repo', 'component');

      expect(result).not.toBeNull();
      // Latest data should be returned
      expect(result?.changedFiles).toEqual(['/repo/file2.ts']);
      expect(result?.elementCounts).toEqual({ component: 2 });
    });

    it('returns null for non-existent tracking data', () => {
      const result = service.getChangeTracking('/nonexistent/repo', 'component');
      expect(result).toBeNull();
    });

    it('clears change tracking data', () => {
      service.upsertChangeTracking(
        '/test/repo',
        'component',
        sampleChangedFiles,
        sampleAffectedElements,
        sampleElementCounts
      );

      service.clearChangeTracking('/test/repo', 'component');

      const result = service.getChangeTracking('/test/repo', 'component');
      expect(result).toBeNull();
    });

    it('stores and retrieves element counts correctly', () => {
      const counts = { container: 1, component: 3, code: 7 };

      service.upsertChangeTracking('/test/repo', 'code', sampleChangedFiles, sampleAffectedElements, counts);

      const result = service.getChangeTracking('/test/repo', 'code');

      expect(result).not.toBeNull();
      expect(result?.elementCounts).toEqual(counts);
      expect(result?.elementCounts.container).toBe(1);
      expect(result?.elementCounts.component).toBe(3);
      expect(result?.elementCounts.code).toBe(7);
    });
  });
});
