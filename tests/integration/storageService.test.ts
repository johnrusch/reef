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

describe('StorageService Integration', () => {
  let service: C4StorageService;
  let testDbPath: string;

  beforeEach(() => {
    // Create unique test database path for integration tests
    testDbPath = path.join(os.tmpdir(), `test-integration-${Date.now()}.db`);
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

  describe('persistence across restarts (STOR-01)', () => {
    it('diagram survives service close and reopen', () => {
      // Store diagram
      const diagram = {
        repoPath: '/test/repo',
        level: 'context' as const,
        diagramContent: 'persistent content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      };

      service.storeDiagram(diagram);

      // Close service
      service.close();

      // Reopen service with same database path
      const newService = new C4StorageService(testDbPath);

      // Verify diagram persists
      const retrieved = newService.getDiagram('/test/repo', 'context');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.diagramContent).toBe('persistent content');
      expect(retrieved?.state).toBe('fresh');

      newService.close();
    });

    it('state persists after service restart', () => {
      // Store diagram
      const diagram = {
        repoPath: '/test/repo',
        level: 'context' as const,
        diagramContent: 'test content',
        state: 'fresh' as const,
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      };

      service.storeDiagram(diagram);

      // Update state
      service.updateState('/test/repo', 'context', 'stale');

      // Close service
      service.close();

      // Reopen service
      const newService = new C4StorageService(testDbPath);

      // Verify state persists
      const state = newService.getState('/test/repo', 'context');
      expect(state).toBe('stale');

      const retrieved = newService.getDiagram('/test/repo', 'context');
      expect(retrieved?.state).toBe('stale');

      newService.close();
    });
  });

  describe('concurrent access (STOR-03)', () => {
    it('allows concurrent reads during write operation', async () => {
      // Store initial diagram
      service.storeDiagram({
        repoPath: '/test/repo',
        level: 'context',
        diagramContent: 'initial content',
        state: 'fresh',
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      });

      // Start a write operation in background
      const writePromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          service.storeDiagram({
            repoPath: '/test/repo2',
            level: 'container',
            diagramContent: 'new content',
            state: 'fresh',
            modelUsed: 'claude-3',
            promptVersion: '1.0',
          });
          resolve();
        }, 10);
      });

      // Perform concurrent reads while write is happening
      const read1 = service.getDiagram('/test/repo', 'context');
      const read2 = service.getDiagram('/test/repo', 'context');
      const state1 = service.getState('/test/repo', 'context');
      const state2 = service.getState('/test/repo', 'context');

      // Wait for write to complete
      await writePromise;

      // All read operations should complete successfully
      expect(read1).not.toBeNull();
      expect(read2).not.toBeNull();
      expect(read1?.diagramContent).toBe('initial content');
      expect(read2?.diagramContent).toBe('initial content');
      expect(state1).toBe('fresh');
      expect(state2).toBe('fresh');

      // Verify write also completed
      const newDiagram = service.getDiagram('/test/repo2', 'container');
      expect(newDiagram).not.toBeNull();
      expect(newDiagram?.diagramContent).toBe('new content');
    });

    it('maintains data consistency under concurrent access', async () => {
      // Store multiple diagrams
      service.storeDiagram({
        repoPath: '/test/repo1',
        level: 'context',
        diagramContent: 'content 1',
        state: 'fresh',
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      });

      service.storeDiagram({
        repoPath: '/test/repo2',
        level: 'context',
        diagramContent: 'content 2',
        state: 'fresh',
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      });

      // Perform concurrent operations
      const operations = [
        // Multiple readers
        Promise.resolve(service.getDiagram('/test/repo1', 'context')),
        Promise.resolve(service.getDiagram('/test/repo2', 'context')),
        Promise.resolve(service.getState('/test/repo1', 'context')),
        Promise.resolve(service.getState('/test/repo2', 'context')),

        // Writer updating different diagram
        new Promise<void>((resolve) => {
          service.updateState('/test/repo1', 'context', 'stale');
          resolve();
        }),

        // More readers
        Promise.resolve(service.getDiagram('/test/repo1', 'context')),
        Promise.resolve(service.getDiagram('/test/repo2', 'context')),
      ];

      const results = await Promise.all(operations);

      // Verify all operations completed successfully
      const [read1, read2, state1, state2, _, read3, read4] = results;

      expect(read1).not.toBeNull();
      expect(read2).not.toBeNull();
      expect(state1).toBe('fresh');
      expect(state2).toBe('fresh');

      // Final state should reflect the update
      const finalState = service.getState('/test/repo1', 'context');
      expect(finalState).toBe('stale');

      // Other diagram should be unchanged
      const unchangedState = service.getState('/test/repo2', 'context');
      expect(unchangedState).toBe('fresh');
    });

    it('handles concurrent writes to different diagrams', async () => {
      // Perform concurrent writes to different diagrams
      const writes = [
        new Promise<void>((resolve) => {
          service.storeDiagram({
            repoPath: '/test/repo1',
            level: 'context',
            diagramContent: 'diagram 1',
            state: 'fresh',
            modelUsed: 'claude-3',
            promptVersion: '1.0',
          });
          resolve();
        }),
        new Promise<void>((resolve) => {
          service.storeDiagram({
            repoPath: '/test/repo2',
            level: 'context',
            diagramContent: 'diagram 2',
            state: 'fresh',
            modelUsed: 'claude-3',
            promptVersion: '1.0',
          });
          resolve();
        }),
        new Promise<void>((resolve) => {
          service.storeDiagram({
            repoPath: '/test/repo3',
            level: 'context',
            diagramContent: 'diagram 3',
            state: 'fresh',
            modelUsed: 'claude-3',
            promptVersion: '1.0',
          });
          resolve();
        }),
      ];

      await Promise.all(writes);

      // Verify all diagrams were stored correctly
      const diagram1 = service.getDiagram('/test/repo1', 'context');
      const diagram2 = service.getDiagram('/test/repo2', 'context');
      const diagram3 = service.getDiagram('/test/repo3', 'context');

      expect(diagram1).not.toBeNull();
      expect(diagram1?.diagramContent).toBe('diagram 1');

      expect(diagram2).not.toBeNull();
      expect(diagram2?.diagramContent).toBe('diagram 2');

      expect(diagram3).not.toBeNull();
      expect(diagram3?.diagramContent).toBe('diagram 3');
    });

    it('WAL mode allows readers to not block writers', () => {
      // Verify WAL mode is enabled
      const db = (service as any).db;
      const journalMode = db.pragma('journal_mode', { simple: true });
      expect(journalMode).toBe('wal');

      // Store initial diagram
      service.storeDiagram({
        repoPath: '/test/repo',
        level: 'context',
        diagramContent: 'initial',
        state: 'fresh',
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      });

      // Perform read
      const read1 = service.getDiagram('/test/repo', 'context');

      // Perform write
      service.storeDiagram({
        repoPath: '/test/repo2',
        level: 'context',
        diagramContent: 'second',
        state: 'fresh',
        modelUsed: 'claude-3',
        promptVersion: '1.0',
      });

      // Perform another read
      const read2 = service.getDiagram('/test/repo', 'context');

      // Both reads should succeed
      expect(read1).not.toBeNull();
      expect(read2).not.toBeNull();

      // Write should also succeed
      const diagram2 = service.getDiagram('/test/repo2', 'context');
      expect(diagram2).not.toBeNull();
      expect(diagram2?.diagramContent).toBe('second');
    });
  });
});
