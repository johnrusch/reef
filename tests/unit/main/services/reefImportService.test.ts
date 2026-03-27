/**
 * Tests for reefImportService.ts
 *
 * Tests importReefArtifacts() which scans .reef/ folder, reads SVG/PUML/meta
 * per level, and imports them into SQLite + LRU cache.
 *
 * Requirements: READ-01, READ-02, READ-03
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to define mock functions before hoisted vi.mock calls
const { mockAccess, mockReadFile, mockStoreDiagram, mockStoreSvg, mockLruSet, mockLruGet, mockReadMeta } =
  vi.hoisted(() => ({
    mockAccess: vi.fn(),
    mockReadFile: vi.fn(),
    mockStoreDiagram: vi.fn(),
    mockStoreSvg: vi.fn(),
    mockLruSet: vi.fn(),
    mockLruGet: vi.fn(),
    mockReadMeta: vi.fn(),
  }));

// Mock fs/promises — must be before any module imports that touch the filesystem
vi.mock('fs/promises', () => ({
  default: {
    access: mockAccess,
    readFile: mockReadFile,
  },
  access: mockAccess,
  readFile: mockReadFile,
}));

vi.mock('../../../../src/main/services/c4/c4StorageService', () => ({
  C4StorageService: vi.fn().mockImplementation(() => ({
    storeDiagram: mockStoreDiagram,
    storeSvg: mockStoreSvg,
  })),
}));

vi.mock('../../../../src/main/services/plantUmlService', () => ({
  SvgLruCache: vi.fn().mockImplementation(() => ({
    get: mockLruGet,
    set: mockLruSet,
  })),
  svgLruCache: {
    get: mockLruGet,
    set: mockLruSet,
  },
}));

vi.mock('../../../../src/main/services/reef/reefStorageService', () => ({
  ReefStorageService: vi.fn().mockImplementation(() => ({
    readMeta: mockReadMeta,
  })),
}));

import { importReefArtifacts } from '../../../../src/main/services/reef/reefImportService';
import { C4StorageService } from '../../../../src/main/services/c4/c4StorageService';
import { SvgLruCache } from '../../../../src/main/services/plantUmlService';

const REPO_PATH = '/repo/my-project';
const CONTEXT_SVG = '<svg>context diagram</svg>';
const CONTAINER_SVG = '<svg>container diagram</svg>';
const CONTEXT_PUML = '@startuml\nC4Context\n@enduml';

const VALID_META = {
  schemaVersion: 1 as const,
  level: 'context' as const,
  generatedAt: '2026-01-01T00:00:00.000Z',
  modelUsed: 'haiku',
  promptVersion: '1.0',
  tokensUsed: 1000,
};

describe('importReefArtifacts', () => {
  let storageService: C4StorageService;
  let lruCache: SvgLruCache;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset stable mock implementations after clearAllMocks
    mockStoreDiagram.mockReturnValue(undefined);
    mockStoreSvg.mockReturnValue(undefined);
    mockLruSet.mockReturnValue(undefined);
    mockLruGet.mockReturnValue(undefined);
    mockReadMeta.mockResolvedValue(null);

    // Create fresh instances (they use the mocked constructors)
    storageService = new C4StorageService();
    lruCache = new SvgLruCache();
  });

  // Test 1: Returns both levels imported when .reef/ has context.svg and container.svg
  it('returns importedLevels: [context, container] when both SVGs exist', async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.includes('context.svg')) return Promise.resolve(CONTEXT_SVG);
      if (filePath.includes('container.svg')) return Promise.resolve(CONTAINER_SVG);
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    const result = await importReefArtifacts(REPO_PATH, storageService, lruCache);

    expect(result.importedLevels).toEqual(['context', 'container']);
    expect(result.missingLevels).toEqual([]);
  });

  // Test 2: Returns only context imported when only context.svg exists
  it('returns importedLevels: [context], missingLevels: [container] when only context.svg exists', async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.includes('context.svg')) return Promise.resolve(CONTEXT_SVG);
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    const result = await importReefArtifacts(REPO_PATH, storageService, lruCache);

    expect(result.importedLevels).toEqual(['context']);
    expect(result.missingLevels).toEqual(['container']);
  });

  // Test 3: Returns empty when .reef/ directory does not exist
  it('returns empty result when .reef/ directory does not exist', async () => {
    mockAccess.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const result = await importReefArtifacts(REPO_PATH, storageService, lruCache);

    expect(result.importedLevels).toEqual([]);
    expect(result.missingLevels).toEqual([]);
    expect(mockStoreDiagram).not.toHaveBeenCalled();
    expect(mockStoreSvg).not.toHaveBeenCalled();
  });

  // Test 4: Returns empty when .reef/ exists but has no SVG files
  it('returns empty importedLevels when .reef/ exists but has no SVG files', async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const result = await importReefArtifacts(REPO_PATH, storageService, lruCache);

    expect(result.importedLevels).toEqual([]);
    expect(result.missingLevels).toEqual(['context', 'container']);
  });

  // Test 5: Calls storeDiagram with correct shape including modelUsed from meta and state 'fresh'
  it('calls storeDiagram with correct StoredDiagram shape including modelUsed from meta and state fresh', async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.includes('context.svg')) return Promise.resolve(CONTEXT_SVG);
      if (filePath.includes('context.puml')) return Promise.resolve(CONTEXT_PUML);
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });
    mockReadMeta.mockResolvedValue(VALID_META);

    await importReefArtifacts(REPO_PATH, storageService, lruCache);

    expect(mockStoreDiagram).toHaveBeenCalledWith(
      expect.objectContaining({
        repoPath: REPO_PATH,
        level: 'context',
        diagramContent: CONTEXT_PUML,
        state: 'fresh',
        modelUsed: 'haiku',
        promptVersion: '1.0',
      })
    );
  });

  // Test 6: Calls storeSvg for each imported level
  it('calls storeSvg for each imported level with SVG content', async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.includes('context.svg')) return Promise.resolve(CONTEXT_SVG);
      if (filePath.includes('container.svg')) return Promise.resolve(CONTAINER_SVG);
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    await importReefArtifacts(REPO_PATH, storageService, lruCache);

    expect(mockStoreSvg).toHaveBeenCalledWith(REPO_PATH, 'context', CONTEXT_SVG, undefined);
    expect(mockStoreSvg).toHaveBeenCalledWith(REPO_PATH, 'container', CONTAINER_SVG, undefined);
  });

  // Test 7: Calls lruCache.set with key format "repoPath:level:" for each imported level
  it('calls lruCache.set with correct key format "repoPath:level:" for each imported level (D-05)', async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.includes('context.svg')) return Promise.resolve(CONTEXT_SVG);
      if (filePath.includes('container.svg')) return Promise.resolve(CONTAINER_SVG);
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    await importReefArtifacts(REPO_PATH, storageService, lruCache);

    expect(mockLruSet).toHaveBeenCalledWith(`${REPO_PATH}:context:`, CONTEXT_SVG);
    expect(mockLruSet).toHaveBeenCalledWith(`${REPO_PATH}:container:`, CONTAINER_SVG);
  });

  // Test 8: Imports level even when .meta.json is missing/invalid (D-06)
  it('imports level even when .meta.json is missing or invalid — uses fallback values (D-06)', async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.includes('context.svg')) return Promise.resolve(CONTEXT_SVG);
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });
    mockReadMeta.mockResolvedValue(null); // readMeta returns null for missing/invalid

    const result = await importReefArtifacts(REPO_PATH, storageService, lruCache);

    expect(result.importedLevels).toContain('context');
    expect(mockStoreDiagram).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'context',
        state: 'fresh',
        modelUsed: 'imported',
        promptVersion: 'imported',
      })
    );
  });

  // Test 9: Imports level even when .puml is missing — storeDiagram called with empty string
  it('calls storeDiagram with empty string diagramContent when .puml is missing', async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.includes('context.svg')) return Promise.resolve(CONTEXT_SVG);
      // All other files (including .puml) are missing
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    await importReefArtifacts(REPO_PATH, storageService, lruCache);

    expect(mockStoreDiagram).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'context',
        diagramContent: '',
      })
    );
  });

  // Test 10: Does not throw when readFile fails for one level — continues importing others
  it('continues importing other levels when one level has an unexpected read failure', async () => {
    mockAccess.mockResolvedValue(undefined);
    // context.svg read succeeds first time (to get past the missing check),
    // but then storeSvg throws a permission error to simulate a failure during import
    let contextSvgCalls = 0;
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.includes('context.svg')) {
        contextSvgCalls++;
        if (contextSvgCalls === 1) {
          return Promise.resolve(CONTEXT_SVG);
        }
      }
      if (filePath.includes('container.svg')) return Promise.resolve(CONTAINER_SVG);
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });
    // Make storeSvg throw for context level to simulate mid-import failure
    mockStoreSvg.mockImplementationOnce(() => {
      throw new Error('EACCES: permission denied');
    });

    // Should not throw
    const result = await importReefArtifacts(REPO_PATH, storageService, lruCache);

    // Container should still be imported even if context failed mid-import
    expect(result.importedLevels).toContain('container');
    // No throw — this is the key assertion
  });
});
