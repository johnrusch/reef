/**
 * Tests for .reef/ write-through logic extracted from the store-svg handler.
 *
 * Tests writeReefArtifacts() which is the extracted helper containing
 * all .reef/ write logic from the c4-storage:store-svg IPC handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron first — must be before any module imports that touch electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([]),
  },
}));

// Stable mock functions for ReefStorageService instance methods
const mockWriteLevelFiles = vi.fn().mockResolvedValue(undefined);
const mockWriteSubDiagramFiles = vi.fn().mockResolvedValue(undefined);

vi.mock('../../../../src/main/services/reef/reefStorageService', () => ({
  ReefStorageService: vi.fn().mockImplementation(() => ({
    writeLevelFiles: mockWriteLevelFiles,
    writeSubDiagramFiles: mockWriteSubDiagramFiles,
  })),
}));

// Mock sourceHashService
vi.mock('../../../../src/main/services/reef/sourceHashService', () => ({
  computeSourceHash: vi.fn(),
}));

// Mock c4AnalyzerService exports (the module-level cache helpers)
vi.mock('../../../../src/main/services/c4/c4AnalyzerService', () => ({
  getAnalyzedFilePaths: vi.fn(),
  clearAnalyzedFilePaths: vi.fn(),
  C4AnalyzerService: vi.fn(),
}));

// Stable mock function for getDiagram
const mockGetDiagram = vi.fn();
const mockStoreSvg = vi.fn();

vi.mock('../../../../src/main/services/c4/c4StorageService', () => ({
  C4StorageService: vi.fn().mockImplementation(() => ({
    getDiagram: mockGetDiagram,
    storeSvg: mockStoreSvg,
  })),
}));

// Mock plantUmlService (used for svgLruCache import)
vi.mock('../../../../src/main/services/plantUmlService', () => ({
  svgLruCache: { get: vi.fn(), set: vi.fn(), invalidate: vi.fn() },
}));

// Mock migrationService
vi.mock('../../../../src/main/services/c4/migrationService', () => ({
  MigrationService: vi.fn(),
}));

import { writeReefArtifacts } from '../../../../src/main/services/c4/c4StorageHandlers';
import { computeSourceHash } from '../../../../src/main/services/reef/sourceHashService';
import { getAnalyzedFilePaths, clearAnalyzedFilePaths } from '../../../../src/main/services/c4/c4AnalyzerService';

describe('writeReefArtifacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset stable mock implementations after clearAllMocks
    mockWriteLevelFiles.mockResolvedValue(undefined);
    mockWriteSubDiagramFiles.mockResolvedValue(undefined);

    // Default: getDiagram returns a valid diagram with puml content
    mockGetDiagram.mockReturnValue({
      diagramContent: '@startuml\nC4Context\n@enduml',
      modelUsed: 'haiku',
      promptVersion: '1.0',
    });

    // Default: analyzed file paths available
    vi.mocked(getAnalyzedFilePaths).mockReturnValue(['/repo/src/main.ts', '/repo/src/app.ts']);
    vi.mocked(computeSourceHash).mockResolvedValue(
      'abc123def456abc123def456abc123def456abc123def456abc123def456abc1'
    );
  });

  it('calls writeLevelFiles for flat level "context" with correct puml, svg, and meta including sourceHash', async () => {
    const repoPath = '/repo';
    const level = 'context';
    const svg = '<svg>context</svg>';

    await writeReefArtifacts(repoPath, level, svg);

    expect(mockWriteLevelFiles).toHaveBeenCalledOnce();
    const [calledRepoPath, calledLevel, calledPuml, calledSvg, calledMeta] =
      mockWriteLevelFiles.mock.calls[0];

    expect(calledRepoPath).toBe(repoPath);
    expect(calledLevel).toBe('context');
    expect(calledPuml).toBe('@startuml\nC4Context\n@enduml');
    expect(calledSvg).toBe(svg);
    expect(calledMeta).toMatchObject({
      level: 'context',
      sourceHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
      schemaVersion: 1,
    });
    expect(calledMeta.generatedAt).toBeDefined();
  });

  it('calls writeLevelFiles for flat level "container" with correct args', async () => {
    const repoPath = '/repo';
    const level = 'container';
    const svg = '<svg>container</svg>';

    await writeReefArtifacts(repoPath, level, svg);

    expect(mockWriteLevelFiles).toHaveBeenCalledOnce();
    expect(mockWriteSubDiagramFiles).not.toHaveBeenCalled();
  });

  it('calls writeSubDiagramFiles for nested level "component" with elementId as parentId', async () => {
    const repoPath = '/repo';
    const level = 'component';
    const svg = '<svg>component</svg>';
    const elementId = 'MainContainer';

    await writeReefArtifacts(repoPath, level, svg, elementId);

    expect(mockWriteSubDiagramFiles).toHaveBeenCalledOnce();
    const [calledRepoPath, calledLevel, calledParentId, calledPuml, calledSvg, calledMeta] =
      mockWriteSubDiagramFiles.mock.calls[0];

    expect(calledRepoPath).toBe(repoPath);
    expect(calledLevel).toBe('component');
    expect(calledParentId).toBe(elementId);
    expect(calledPuml).toBe('@startuml\nC4Context\n@enduml');
    expect(calledSvg).toBe(svg);
    expect(calledMeta).toMatchObject({
      level: 'component',
      schemaVersion: 1,
    });
    expect(mockWriteLevelFiles).not.toHaveBeenCalled();
  });

  it('skips .reef/ write and resolves when getDiagram returns null (no puml available)', async () => {
    mockGetDiagram.mockReturnValue(null);

    await expect(writeReefArtifacts('/repo', 'context', '<svg/>')).resolves.toBeUndefined();

    expect(mockWriteLevelFiles).not.toHaveBeenCalled();
    expect(mockWriteSubDiagramFiles).not.toHaveBeenCalled();
  });

  it('skips .reef/ write when getDiagram returns diagram without diagramContent', async () => {
    mockGetDiagram.mockReturnValue({ diagramContent: '', modelUsed: 'haiku', promptVersion: '1.0' });

    await expect(writeReefArtifacts('/repo', 'context', '<svg/>')).resolves.toBeUndefined();

    expect(mockWriteLevelFiles).not.toHaveBeenCalled();
  });

  it('does not throw when writeLevelFiles throws (non-fatal write failure)', async () => {
    mockWriteLevelFiles.mockRejectedValue(new Error('disk full'));

    await expect(writeReefArtifacts('/repo', 'context', '<svg/>')).resolves.toBeUndefined();
  });

  it('includes sourceHash in meta when filePaths are available', async () => {
    await writeReefArtifacts('/repo', 'context', '<svg/>');

    const calledMeta = mockWriteLevelFiles.mock.calls[0][4];
    expect(calledMeta.sourceHash).toBe(
      'abc123def456abc123def456abc123def456abc123def456abc123def456abc1'
    );
    expect(computeSourceHash).toHaveBeenCalledWith(['/repo/src/main.ts', '/repo/src/app.ts']);
  });

  it('omits sourceHash when no filePaths are available', async () => {
    vi.mocked(getAnalyzedFilePaths).mockReturnValue(undefined);

    await writeReefArtifacts('/repo', 'context', '<svg/>');

    const calledMeta = mockWriteLevelFiles.mock.calls[0][4];
    expect(calledMeta.sourceHash).toBeUndefined();
    expect(computeSourceHash).not.toHaveBeenCalled();
  });

  it('calls clearAnalyzedFilePaths after consuming file paths', async () => {
    await writeReefArtifacts('/repo', 'context', '<svg/>');

    expect(clearAnalyzedFilePaths).toHaveBeenCalledWith('/repo', 'context', undefined);
  });
});
