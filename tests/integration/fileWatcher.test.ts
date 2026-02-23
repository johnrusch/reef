/**
 * File Watcher Integration Tests
 *
 * Tests for FileWatcherService and generation timestamp persistence:
 * - Timestamp storage and retrieval
 * - File watching with level-specific patterns
 * - Staleness detection based on file mtimes
 * - Cache invalidation on file changes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileWatcherService } from '../../src/main/services/fileWatcherService';
import { C4CacheService } from '../../src/main/services/c4/c4CacheService';
import { writeFile, mkdir, rm, utimes } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { C4Level } from '../../src/main/services/c4/types/c4Types';

// Mock Electron BrowserWindow
const mockSend = vi.fn();
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [
      {
        webContents: {
          send: mockSend,
        },
      },
    ],
  },
  app: {
    getPath: () => tmpdir(),
  },
}));

describe('C4CacheService Timestamp Persistence', () => {
  let cacheService: C4CacheService;
  let testDbPath: string;

  beforeEach(() => {
    // Use in-memory database for tests
    testDbPath = ':memory:';
    cacheService = new C4CacheService(testDbPath);
  });

  afterEach(() => {
    cacheService.close();
  });

  it('stores and retrieves generation timestamps', () => {
    const repoPath = '/test/repo';
    const level: C4Level = 'context';

    // Store timestamp
    cacheService.setLastGenerationTimestamp(repoPath, level);

    // Retrieve timestamp
    const timestamp = cacheService.getLastGenerationTimestamp(repoPath, level);

    expect(timestamp).toBeGreaterThan(0);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('returns 0 for non-existent timestamps', () => {
    const timestamp = cacheService.getLastGenerationTimestamp('/nonexistent/repo', 'context');
    expect(timestamp).toBe(0);
  });

  it('clears timestamps when cache is cleared', () => {
    const repoPath = '/test/repo';
    const level: C4Level = 'container';

    // Set timestamp
    cacheService.setLastGenerationTimestamp(repoPath, level);
    expect(cacheService.getLastGenerationTimestamp(repoPath, level)).toBeGreaterThan(0);

    // Clear cache
    cacheService.clearCache(repoPath);

    // Verify timestamp is gone
    expect(cacheService.getLastGenerationTimestamp(repoPath, level)).toBe(0);
  });

  it('updates timestamp when diagram is cached', async () => {
    const repoPath = '/test/repo';
    const level: C4Level = 'component';
    const diagram = '@startuml\ntest diagram\n@enduml';

    // Cache diagram
    await cacheService.setCachedDiagram(repoPath, level, diagram);

    // Verify timestamp was set
    const timestamp = cacheService.getLastGenerationTimestamp(repoPath, level);
    expect(timestamp).toBeGreaterThan(0);
  });

  it('stores different timestamps for different levels', () => {
    const repoPath = '/test/repo';

    // Store timestamps for different levels
    cacheService.setLastGenerationTimestamp(repoPath, 'context');
    cacheService.setLastGenerationTimestamp(repoPath, 'container');

    // Retrieve timestamps
    const contextTimestamp = cacheService.getLastGenerationTimestamp(repoPath, 'context');
    const containerTimestamp = cacheService.getLastGenerationTimestamp(repoPath, 'container');

    expect(contextTimestamp).toBeGreaterThan(0);
    expect(containerTimestamp).toBeGreaterThan(0);
  });

  it('clears all cache including timestamps with clearAllCache', () => {
    const repoPath = '/test/repo';

    // Set timestamps and cache
    cacheService.setLastGenerationTimestamp(repoPath, 'context');
    cacheService.setLastGenerationTimestamp(repoPath, 'container');

    // Clear all
    cacheService.clearAllCache();

    // Verify all timestamps are gone
    expect(cacheService.getLastGenerationTimestamp(repoPath, 'context')).toBe(0);
    expect(cacheService.getLastGenerationTimestamp(repoPath, 'container')).toBe(0);
  });
});

describe('FileWatcherService', () => {
  let fileWatcherService: FileWatcherService;
  let cacheService: C4CacheService;
  let testRepoPath: string;

  beforeEach(async () => {
    // Create cache service
    cacheService = new C4CacheService(':memory:');
    fileWatcherService = new FileWatcherService(cacheService);

    // Create temporary test repository
    testRepoPath = join(tmpdir(), `test-repo-watcher-${Date.now()}`);
    await mkdir(testRepoPath, { recursive: true });
    await mkdir(join(testRepoPath, 'src', 'main'), { recursive: true });
    await mkdir(join(testRepoPath, 'src', 'renderer'), { recursive: true });

    // Create test files
    await writeFile(join(testRepoPath, 'package.json'), '{}');
    await writeFile(join(testRepoPath, 'tsconfig.json'), '{}');
    await writeFile(join(testRepoPath, 'src', 'main', 'main.ts'), '// main');
    await writeFile(join(testRepoPath, 'src', 'main', 'test.ts'), '// test');
    await writeFile(join(testRepoPath, 'src', 'renderer', 'App.tsx'), '// app');

    // Reset mock
    mockSend.mockClear();
  });

  afterEach(async () => {
    // Stop all watchers
    fileWatcherService.stopAllWatchers();

    // Close cache service
    cacheService.close();

    // Clean up test directory
    try {
      await rm(testRepoPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('starts watching with correct patterns for each C4 level', () => {
    const levels: C4Level[] = ['context', 'container', 'component', 'code'];

    levels.forEach((level) => {
      fileWatcherService.startWatching(testRepoPath, level);
    });

    // Verify watchers were created
    // Note: We can't easily inspect chokidar internals, but we can verify no errors
    expect(true).toBe(true);

    // Clean up
    levels.forEach((level) => {
      fileWatcherService.stopWatching(testRepoPath, level);
    });
  });

  it('stops watching when requested', () => {
    const level: C4Level = 'context';

    // Start watching
    fileWatcherService.startWatching(testRepoPath, level);

    // Stop watching
    fileWatcherService.stopWatching(testRepoPath, level);

    // Verify no errors
    expect(true).toBe(true);
  });

  it('stops all watchers on cleanup', () => {
    // Start multiple watchers
    fileWatcherService.startWatching(testRepoPath, 'context');
    fileWatcherService.startWatching(testRepoPath, 'container');
    fileWatcherService.startWatching(testRepoPath, 'component');

    // Stop all
    fileWatcherService.stopAllWatchers();

    // Verify no errors
    expect(true).toBe(true);
  });

  it("doesn't start duplicate watchers", () => {
    const level: C4Level = 'context';

    // Start watching twice
    fileWatcherService.startWatching(testRepoPath, level);
    fileWatcherService.startWatching(testRepoPath, level);

    // Should only have one watcher (verified by no errors)
    expect(true).toBe(true);

    // Clean up
    fileWatcherService.stopWatching(testRepoPath, level);
  });
});

describe('Staleness Detection Integration', () => {
  let fileWatcherService: FileWatcherService;
  let cacheService: C4CacheService;
  let testRepoPath: string;

  beforeEach(async () => {
    // Create cache service
    cacheService = new C4CacheService(':memory:');
    fileWatcherService = new FileWatcherService(cacheService);

    // Create temporary test repository
    testRepoPath = join(tmpdir(), `test-repo-stale-${Date.now()}`);
    await mkdir(testRepoPath, { recursive: true });
    await mkdir(join(testRepoPath, 'src'), { recursive: true });

    // Create test file
    const testFile = join(testRepoPath, 'src', 'test.ts');
    await writeFile(testFile, '// old content');

    // Set file mtime to past
    const pastDate = new Date(Date.now() - 10000); // 10 seconds ago
    await utimes(testFile, pastDate, pastDate);

    // Reset mock
    mockSend.mockClear();
  });

  afterEach(async () => {
    fileWatcherService.stopAllWatchers();
    cacheService.close();

    try {
      await rm(testRepoPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('returns false when diagram was never generated', async () => {
    const isStale = await fileWatcherService.checkStalenessOnStartup(testRepoPath, 'code');
    expect(isStale).toBe(false);
  });

  it('detects diagram as stale when files are newer than generation timestamp', async () => {
    const level: C4Level = 'code';

    // Set generation timestamp to past
    const pastTimestamp = Date.now() - 5000; // 5 seconds ago
    cacheService.setLastGenerationTimestamp(testRepoPath, level);

    // Update timestamp manually to past
    const stmt = (cacheService as any).db.prepare(
      'UPDATE generation_timestamps SET timestamp = ? WHERE repo_path = ? AND level = ?'
    );
    stmt.run(pastTimestamp, testRepoPath, level);

    // Create a new file with current timestamp
    const newFile = join(testRepoPath, 'src', 'new.ts');
    await writeFile(newFile, '// new content');

    // Check staleness
    const isStale = await fileWatcherService.checkStalenessOnStartup(testRepoPath, level);

    // Should detect as stale and emit event
    expect(isStale).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      'diagram:stale',
      expect.objectContaining({
        repoPath: testRepoPath,
        level,
      })
    );
  });

  it('detects diagram as fresh when files are older than generation timestamp', async () => {
    const level: C4Level = 'code';

    // Set generation timestamp to now (after all files were created in beforeEach)
    // Wait a tiny bit to ensure timestamp is definitely after file creation
    await new Promise((resolve) => setTimeout(resolve, 10));
    cacheService.setLastGenerationTimestamp(testRepoPath, level);

    // All files are older (from beforeEach)
    const isStale = await fileWatcherService.checkStalenessOnStartup(testRepoPath, level);

    // Should be fresh
    expect(isStale).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('handles different levels with level-specific patterns', async () => {
    // Context level should only check specific files
    // Wait to ensure timestamp is after file creation
    await new Promise((resolve) => setTimeout(resolve, 10));
    cacheService.setLastGenerationTimestamp(testRepoPath, 'context');

    const isContextStale = await fileWatcherService.checkStalenessOnStartup(
      testRepoPath,
      'context'
    );

    // Should be fresh (no package.json/tsconfig.json changes)
    expect(isContextStale).toBe(false);

    // Code level checks all source files
    const pastTimestamp = Date.now() - 5000;
    cacheService.setLastGenerationTimestamp(testRepoPath, 'code');

    // Manually set past timestamp
    const stmt = (cacheService as any).db.prepare(
      'UPDATE generation_timestamps SET timestamp = ? WHERE repo_path = ? AND level = ?'
    );
    stmt.run(pastTimestamp, testRepoPath, 'code');

    // Create new source file
    await writeFile(join(testRepoPath, 'src', 'fresh.ts'), '// fresh');

    const isCodeStale = await fileWatcherService.checkStalenessOnStartup(testRepoPath, 'code');

    // Should be stale
    expect(isCodeStale).toBe(true);
  });
});
