import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileWatcherService } from '@main/services/fileWatcherService';
import type { C4StorageService } from '@main/services/c4/c4StorageService';
import { join } from 'path';

// ====== Chokidar mock ======
// Tracks all event handlers per mock watcher instance so tests can emit events
type Handler = (path: string) => void;

const createMockWatcher = () => {
  const handlers: Record<string, Handler[]> = {};
  const watcher = {
    on: vi.fn((event: string, handler: Handler) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return watcher;
    }),
    close: vi.fn().mockResolvedValue(undefined),
    _emit: (event: string, path: string) => {
      handlers[event]?.forEach((h) => h(path));
    },
    _capturedOptions: null as Record<string, unknown> | null,
  };
  return watcher;
};

type MockWatcher = ReturnType<typeof createMockWatcher>;
let currentMockWatcher: MockWatcher;

vi.mock('chokidar', () => {
  return {
    default: {
      watch: vi.fn((paths: string[], options: Record<string, unknown>) => {
        currentMockWatcher._capturedOptions = options;
        return currentMockWatcher;
      }),
    },
    watch: vi.fn((paths: string[], options: Record<string, unknown>) => {
      currentMockWatcher._capturedOptions = options;
      return currentMockWatcher;
    }),
  };
});

// ====== Electron mock ======
const mockWebContentsSend = vi.fn();
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => [
      { webContents: { send: mockWebContentsSend } },
    ]),
  },
}));

// ====== fs/promises mock ======
vi.mock('fs/promises', () => ({
  stat: vi.fn(),
  readdir: vi.fn(),
}));

// ====== Helpers ======
function createMockStorage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getDiagram: vi.fn(() => ({
      state: 'fresh',
      updatedAt: new Date(Date.now() - 10_000).toISOString().replace('T', ' ').replace('Z', ''),
    })),
    updateState: vi.fn(),
    storeDiagram: vi.fn(),
    upsertChangeTracking: vi.fn(),
    getState: vi.fn(() => 'fresh'),
    close: vi.fn(),
    ...overrides,
  } as unknown as C4StorageService;
}

const REPO_PATH = '/test/repo';

describe('FileWatcherService', () => {
  let storage: C4StorageService;
  let service: FileWatcherService;
  let chokidarWatch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    currentMockWatcher = createMockWatcher();

    const chokidar = await import('chokidar');
    chokidarWatch = chokidar.default.watch as ReturnType<typeof vi.fn>;

    storage = createMockStorage();
    service = new FileWatcherService(storage);
  });

  afterEach(() => {
    service.stopAllWatchers();
  });

  // ====== Test 1: No glob patterns passed to chokidar ======

  describe('getWatchPaths returns directory paths, not globs', () => {
    it('component level: passes [repoPath/src] with no glob characters', () => {
      service.startWatching(REPO_PATH, 'component');

      expect(chokidarWatch).toHaveBeenCalledOnce();
      const [paths] = chokidarWatch.mock.calls[0] as [string[], unknown];

      // Must contain no glob patterns
      expect(paths.every((p) => !p.includes('*'))).toBe(true);
      expect(paths).toContain(join(REPO_PATH, 'src'));
    });

    it('context level: passes concrete files and src directory, no globs', () => {
      service.startWatching(REPO_PATH, 'context');

      expect(chokidarWatch).toHaveBeenCalledOnce();
      const [paths] = chokidarWatch.mock.calls[0] as [string[], unknown];

      expect(paths.every((p) => !p.includes('*'))).toBe(true);
      expect(paths).toContain(join(REPO_PATH, 'package.json'));
      expect(paths).toContain(join(REPO_PATH, 'tsconfig.json'));
      expect(paths).toContain(join(REPO_PATH, 'src'));
    });

    it('container level: passes package.json and src/main and src/renderer directories', () => {
      service.startWatching(REPO_PATH, 'container');

      expect(chokidarWatch).toHaveBeenCalledOnce();
      const [paths] = chokidarWatch.mock.calls[0] as [string[], unknown];

      expect(paths.every((p) => !p.includes('*'))).toBe(true);
      expect(paths).toContain(join(REPO_PATH, 'package.json'));
      expect(paths).toContain(join(REPO_PATH, 'src', 'main'));
      expect(paths).toContain(join(REPO_PATH, 'src', 'renderer'));
    });

    it('code level: passes [repoPath/src] with no glob characters', () => {
      service.startWatching(REPO_PATH, 'code');

      expect(chokidarWatch).toHaveBeenCalledOnce();
      const [paths] = chokidarWatch.mock.calls[0] as [string[], unknown];

      expect(paths.every((p) => !p.includes('*'))).toBe(true);
      expect(paths).toContain(join(REPO_PATH, 'src'));
    });
  });

  // ====== Test 2: isRelevantFile for component level ======

  describe('isRelevantFile filters correctly for component level', () => {
    it('accepts .ts, .tsx, .js, .jsx files', async () => {
      const { stat } = await import('fs/promises');
      const statMock = stat as ReturnType<typeof vi.fn>;
      statMock.mockResolvedValue({ mtimeMs: Date.now() + 5000, isFile: () => true, isDirectory: () => false });

      storage = createMockStorage();
      service = new FileWatcherService(storage);
      service.startWatching(REPO_PATH, 'component');

      const watcher = currentMockWatcher;

      // These should trigger handleFileChange (getDiagram is called)
      watcher._emit('change', '/test/repo/src/main/services/gitService.ts');
      await new Promise((r) => setImmediate(r));
      expect(storage.getDiagram).toHaveBeenCalled();

      vi.clearAllMocks();
      (storage.getDiagram as ReturnType<typeof vi.fn>).mockReturnValue({
        state: 'fresh',
        updatedAt: new Date(Date.now() - 10_000).toISOString().replace('T', ' ').replace('Z', ''),
      });

      watcher._emit('change', '/test/repo/src/renderer/App.tsx');
      await new Promise((r) => setImmediate(r));
      expect(storage.getDiagram).toHaveBeenCalled();
    });

    it('rejects .json, .md, .css, .map files', async () => {
      storage = createMockStorage();
      service = new FileWatcherService(storage);
      service.startWatching(REPO_PATH, 'component');

      const watcher = currentMockWatcher;

      vi.clearAllMocks();
      watcher._emit('change', '/test/repo/src/styles/app.css');
      await new Promise((r) => setImmediate(r));
      expect(storage.getDiagram).not.toHaveBeenCalled();

      watcher._emit('change', '/test/repo/README.md');
      await new Promise((r) => setImmediate(r));
      expect(storage.getDiagram).not.toHaveBeenCalled();

      watcher._emit('change', '/test/repo/src/main/services/gitService.js.map');
      await new Promise((r) => setImmediate(r));
      expect(storage.getDiagram).not.toHaveBeenCalled();
    });
  });

  // ====== Test 3: container level allows all files ======

  describe('isRelevantFile allows all files for container level', () => {
    it('accepts any file in src/main or src/renderer', async () => {
      const { stat } = await import('fs/promises');
      const statMock = stat as ReturnType<typeof vi.fn>;
      statMock.mockResolvedValue({ mtimeMs: Date.now() + 5000, isFile: () => true, isDirectory: () => false });

      storage = createMockStorage();
      service = new FileWatcherService(storage);
      service.startWatching(REPO_PATH, 'container');

      const watcher = currentMockWatcher;

      // CSS file — container passes all
      watcher._emit('change', `${REPO_PATH}/src/renderer/styles/app.css`);
      await new Promise((r) => setImmediate(r));
      expect(storage.getDiagram).toHaveBeenCalled();

      vi.clearAllMocks();
      (storage.getDiagram as ReturnType<typeof vi.fn>).mockReturnValue({
        state: 'fresh',
        updatedAt: new Date(Date.now() - 10_000).toISOString().replace('T', ' ').replace('Z', ''),
      });

      // JSON config — container passes all
      watcher._emit('change', `${REPO_PATH}/src/main/config.json`);
      await new Promise((r) => setImmediate(r));
      expect(storage.getDiagram).toHaveBeenCalled();
    });
  });

  // ====== Test 4: context level filters to config and entry files ======

  describe('isRelevantFile filters context level to config and entry files', () => {
    it('accepts package.json, tsconfig.json, and main.ts', async () => {
      const { stat } = await import('fs/promises');
      const statMock = stat as ReturnType<typeof vi.fn>;
      statMock.mockResolvedValue({ mtimeMs: Date.now() + 5000, isFile: () => true, isDirectory: () => false });

      storage = createMockStorage();
      service = new FileWatcherService(storage);
      service.startWatching(REPO_PATH, 'context');

      const watcher = currentMockWatcher;

      watcher._emit('change', `${REPO_PATH}/package.json`);
      await new Promise((r) => setImmediate(r));
      expect(storage.getDiagram).toHaveBeenCalled();

      vi.clearAllMocks();
      (storage.getDiagram as ReturnType<typeof vi.fn>).mockReturnValue({
        state: 'fresh',
        updatedAt: new Date(Date.now() - 10_000).toISOString().replace('T', ' ').replace('Z', ''),
      });

      watcher._emit('change', `${REPO_PATH}/tsconfig.json`);
      await new Promise((r) => setImmediate(r));
      expect(storage.getDiagram).toHaveBeenCalled();

      vi.clearAllMocks();
      (storage.getDiagram as ReturnType<typeof vi.fn>).mockReturnValue({
        state: 'fresh',
        updatedAt: new Date(Date.now() - 10_000).toISOString().replace('T', ' ').replace('Z', ''),
      });

      watcher._emit('change', `${REPO_PATH}/src/main.ts`);
      await new Promise((r) => setImmediate(r));
      expect(storage.getDiagram).toHaveBeenCalled();
    });

    it('rejects random .ts files that are not main entry points', async () => {
      storage = createMockStorage();
      service = new FileWatcherService(storage);
      service.startWatching(REPO_PATH, 'context');

      const watcher = currentMockWatcher;

      vi.clearAllMocks();
      // A random TypeScript file (not named main.ts/main.tsx/main.js/main.jsx)
      watcher._emit('change', `${REPO_PATH}/src/services/gitService.ts`);
      await new Promise((r) => setImmediate(r));
      expect(storage.getDiagram).not.toHaveBeenCalled();
    });
  });

  // ====== Test 5: Non-matching extension events are ignored ======

  describe('chokidar events for non-matching extensions are ignored', () => {
    it('does not call getDiagram for .css files at component level', async () => {
      service.startWatching(REPO_PATH, 'component');
      const watcher = currentMockWatcher;
      vi.clearAllMocks();

      watcher._emit('change', `${REPO_PATH}/src/styles/main.css`);
      await new Promise((r) => setImmediate(r));

      expect(storage.getDiagram).not.toHaveBeenCalled();
    });

    it('does not call getDiagram for .json files at component level', async () => {
      service.startWatching(REPO_PATH, 'component');
      const watcher = currentMockWatcher;
      vi.clearAllMocks();

      watcher._emit('change', `${REPO_PATH}/src/config.json`);
      await new Promise((r) => setImmediate(r));

      expect(storage.getDiagram).not.toHaveBeenCalled();
    });
  });

  // ====== Test 6: Matching extension events are processed ======

  describe('chokidar events for matching extensions are processed', () => {
    it('calls getDiagram for .ts files at component level', async () => {
      const { stat } = await import('fs/promises');
      const statMock = stat as ReturnType<typeof vi.fn>;
      statMock.mockResolvedValue({ mtimeMs: Date.now() + 5000, isFile: () => true, isDirectory: () => false });

      service.startWatching(REPO_PATH, 'component');
      const watcher = currentMockWatcher;
      vi.clearAllMocks();
      (storage.getDiagram as ReturnType<typeof vi.fn>).mockReturnValue({
        state: 'fresh',
        updatedAt: new Date(Date.now() - 10_000).toISOString().replace('T', ' ').replace('Z', ''),
      });

      watcher._emit('change', `${REPO_PATH}/src/main/services/gitService.ts`);
      await new Promise((r) => setImmediate(r));

      expect(storage.getDiagram).toHaveBeenCalled();
    });

    it('calls getDiagram for .tsx files at code level', async () => {
      const { stat } = await import('fs/promises');
      const statMock = stat as ReturnType<typeof vi.fn>;
      statMock.mockResolvedValue({ mtimeMs: Date.now() + 5000, isFile: () => true, isDirectory: () => false });

      service.startWatching(REPO_PATH, 'code');
      const watcher = currentMockWatcher;
      vi.clearAllMocks();
      (storage.getDiagram as ReturnType<typeof vi.fn>).mockReturnValue({
        state: 'fresh',
        updatedAt: new Date(Date.now() - 10_000).toISOString().replace('T', ' ').replace('Z', ''),
      });

      watcher._emit('add', `${REPO_PATH}/src/renderer/components/NewComponent.tsx`);
      await new Promise((r) => setImmediate(r));

      expect(storage.getDiagram).toHaveBeenCalled();
    });
  });

  // ====== Test 7: ignored option is a function predicate ======

  describe('ignored function predicate excludes node_modules and dist-electron paths', () => {
    it('ignored option is a function, not an array', () => {
      service.startWatching(REPO_PATH, 'component');

      const capturedOptions = currentMockWatcher._capturedOptions;
      expect(capturedOptions).not.toBeNull();
      expect(typeof capturedOptions!['ignored']).toBe('function');
    });

    it('ignored function returns true for node_modules paths', () => {
      service.startWatching(REPO_PATH, 'component');

      const ignoredFn = currentMockWatcher._capturedOptions!['ignored'] as (p: string) => boolean;

      expect(ignoredFn('/test/repo/node_modules/lodash/index.js')).toBe(true);
      expect(ignoredFn('/test/repo/node_modules')).toBe(true);
    });

    it('ignored function returns true for .git paths', () => {
      service.startWatching(REPO_PATH, 'component');

      const ignoredFn = currentMockWatcher._capturedOptions!['ignored'] as (p: string) => boolean;

      expect(ignoredFn('/test/repo/.git/objects/abc')).toBe(true);
    });

    it('ignored function returns true for dist-electron paths', () => {
      service.startWatching(REPO_PATH, 'component');

      const ignoredFn = currentMockWatcher._capturedOptions!['ignored'] as (p: string) => boolean;

      expect(ignoredFn('/test/repo/dist-electron/main.js')).toBe(true);
    });

    it('ignored function returns true for dist paths', () => {
      service.startWatching(REPO_PATH, 'component');

      const ignoredFn = currentMockWatcher._capturedOptions!['ignored'] as (p: string) => boolean;

      expect(ignoredFn('/test/repo/dist/main/index.js')).toBe(true);
    });

    it('ignored function returns true for build and coverage paths', () => {
      service.startWatching(REPO_PATH, 'component');

      const ignoredFn = currentMockWatcher._capturedOptions!['ignored'] as (p: string) => boolean;

      expect(ignoredFn('/test/repo/build/output.js')).toBe(true);
      expect(ignoredFn('/test/repo/coverage/lcov.info')).toBe(true);
    });

    it('ignored function returns false for normal src paths', () => {
      service.startWatching(REPO_PATH, 'component');

      const ignoredFn = currentMockWatcher._capturedOptions!['ignored'] as (p: string) => boolean;

      expect(ignoredFn('/test/repo/src/main/index.ts')).toBe(false);
      expect(ignoredFn('/test/repo/src/renderer/App.tsx')).toBe(false);
      expect(ignoredFn('/test/repo/package.json')).toBe(false);
    });
  });
});
