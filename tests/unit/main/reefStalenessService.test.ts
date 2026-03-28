/**
 * Unit tests for ReefStalenessService
 *
 * Tests hash-based staleness detection with debounced file change handling.
 * Per plan 20-01: debounce, hash comparison, missing meta handling, per-level independence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------- Mocks ----------

vi.mock('../../../src/main/services/reef/sourceHashService', () => ({
  computeSourceHash: vi.fn(),
}));

vi.mock('../../../src/main/services/c4/c4AnalyzerService', () => ({
  getAnalyzedFilePaths: vi.fn(),
}));

// Mock fs/promises for getWatchPathFiles
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({ isFile: () => false, isDirectory: () => false, mtimeMs: 0 }),
  };
});

import { computeSourceHash } from '../../../src/main/services/reef/sourceHashService';
import { getAnalyzedFilePaths } from '../../../src/main/services/c4/c4AnalyzerService';
import type { ReefStorageService } from '../../../src/main/services/reef/reefStorageService';
import { ReefStalenessService } from '../../../src/main/services/reef/reefStalenessService';

const mockComputeSourceHash = vi.mocked(computeSourceHash);
const mockGetAnalyzedFilePaths = vi.mocked(getAnalyzedFilePaths);

function makeMockStorage(sourceHash?: string): ReefStorageService {
  return {
    readMeta: vi.fn().mockResolvedValue(
      sourceHash !== undefined
        ? { schemaVersion: 1, level: 'context', generatedAt: '2026-01-01T00:00:00Z', sourceHash }
        : { schemaVersion: 1, level: 'context', generatedAt: '2026-01-01T00:00:00Z' }
    ),
  } as unknown as ReefStorageService;
}

function makeNullMetaStorage(): ReefStorageService {
  return {
    readMeta: vi.fn().mockResolvedValue(null),
  } as unknown as ReefStorageService;
}

describe('ReefStalenessService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Default: analyzed file paths not in cache
    mockGetAnalyzedFilePaths.mockReturnValue(undefined);
    // Default: computeSourceHash returns a hash
    mockComputeSourceHash.mockResolvedValue('abc123');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Test 1: Debounce — multiple calls within 2s result in only one hash comparison
  describe('scheduleCheck debounce', () => {
    it('calls checkStaleness only once when scheduleCheck is called multiple times within 2.5s', async () => {
      const onStale = vi.fn();
      const storage = makeMockStorage('old-hash');
      mockComputeSourceHash.mockResolvedValue('new-hash');
      mockGetAnalyzedFilePaths.mockReturnValue(['/repo/src/main.ts']);

      const service = new ReefStalenessService(storage, onStale);

      // Call scheduleCheck 3 times rapidly
      service.scheduleCheck('/repo', 'context');
      service.scheduleCheck('/repo', 'context');
      service.scheduleCheck('/repo', 'context');

      // No hash comparison yet — debounce hasn't fired
      expect(storage.readMeta).not.toHaveBeenCalled();

      // Advance past debounce window
      await vi.advanceTimersByTimeAsync(2600);

      // Only one call to readMeta (one hash comparison)
      expect(storage.readMeta).toHaveBeenCalledTimes(1);
      expect(onStale).toHaveBeenCalledTimes(1);

      service.dispose();
    });

    it('fires separate checks for different repoPath:level combinations', async () => {
      const onStale = vi.fn();
      const storage = makeMockStorage('old-hash');
      mockComputeSourceHash.mockResolvedValue('new-hash');
      mockGetAnalyzedFilePaths.mockReturnValue(['/repo/src/main.ts']);

      const service = new ReefStalenessService(storage, onStale);

      service.scheduleCheck('/repo', 'context');
      service.scheduleCheck('/repo', 'container');

      await vi.advanceTimersByTimeAsync(2600);

      // Two distinct debounce keys → two calls
      expect(storage.readMeta).toHaveBeenCalledTimes(2);

      service.dispose();
    });
  });

  // Test 2: Stale detection — different hash triggers onStale callback
  describe('checkStaleness', () => {
    it('calls onStale when current hash differs from stored hash', async () => {
      const onStale = vi.fn();
      const storage = makeMockStorage('stored-hash-abc');
      mockComputeSourceHash.mockResolvedValue('current-hash-xyz');
      mockGetAnalyzedFilePaths.mockReturnValue(['/repo/src/main.ts', '/repo/src/app.ts']);

      const service = new ReefStalenessService(storage, onStale);

      const result = await service.checkStaleness('/repo', 'context');

      expect(result).toBe(true);
      expect(onStale).toHaveBeenCalledWith('/repo', 'context');
      expect(onStale).toHaveBeenCalledTimes(1);

      service.dispose();
    });

    // Test 3: Fresh stays fresh — same hash does NOT trigger callback
    it('does not call onStale when current hash matches stored hash', async () => {
      const onStale = vi.fn();
      const storage = makeMockStorage('same-hash');
      mockComputeSourceHash.mockResolvedValue('same-hash');
      mockGetAnalyzedFilePaths.mockReturnValue(['/repo/src/main.ts']);

      const service = new ReefStalenessService(storage, onStale);

      const result = await service.checkStaleness('/repo', 'context');

      expect(result).toBe(false);
      expect(onStale).not.toHaveBeenCalled();

      service.dispose();
    });

    // Test 4: Missing meta — no callback fires
    it('returns false and does not call onStale when readMeta returns null', async () => {
      const onStale = vi.fn();
      const storage = makeNullMetaStorage();
      mockComputeSourceHash.mockResolvedValue('some-hash');

      const service = new ReefStalenessService(storage, onStale);

      const result = await service.checkStaleness('/repo', 'context');

      expect(result).toBe(false);
      expect(onStale).not.toHaveBeenCalled();
      // computeSourceHash should not even be called if meta is null
      expect(computeSourceHash).not.toHaveBeenCalled();

      service.dispose();
    });

    // Test 5: Missing sourceHash in meta — no callback fires
    it('returns false when meta exists but sourceHash is undefined', async () => {
      const onStale = vi.fn();
      // makeMockStorage with no argument produces meta without sourceHash
      const storage = {
        readMeta: vi.fn().mockResolvedValue({
          schemaVersion: 1,
          level: 'context',
          generatedAt: '2026-01-01T00:00:00Z',
          // sourceHash intentionally absent
        }),
      } as unknown as ReefStorageService;

      const service = new ReefStalenessService(storage, onStale);

      const result = await service.checkStaleness('/repo', 'context');

      expect(result).toBe(false);
      expect(onStale).not.toHaveBeenCalled();

      service.dispose();
    });

    // Test 6: Per-level independence — context check only reads context meta
    it('checks only the specified level (per-level independence)', async () => {
      const onStale = vi.fn();
      const readMetaMock = vi.fn().mockImplementation(async (_repoPath: string, level: string) => {
        if (level === 'context') {
          return { schemaVersion: 1, level: 'context', generatedAt: '2026-01-01', sourceHash: 'old-context' };
        }
        return null;
      });
      const storage = { readMeta: readMetaMock } as unknown as ReefStorageService;
      mockComputeSourceHash.mockResolvedValue('new-context');
      mockGetAnalyzedFilePaths.mockReturnValue(['/repo/src/main.ts']);

      const service = new ReefStalenessService(storage, onStale);

      // Only check context level
      await service.checkStaleness('/repo', 'context');

      // readMeta called only once, with 'context' level
      expect(readMetaMock).toHaveBeenCalledTimes(1);
      expect(readMetaMock).toHaveBeenCalledWith('/repo', 'context', undefined);

      // container not checked
      expect(readMetaMock).not.toHaveBeenCalledWith('/repo', 'container', undefined);

      service.dispose();
    });
  });

  // Test: dispose clears all pending timers
  describe('dispose', () => {
    it('cancels pending debounce timers on dispose', async () => {
      const onStale = vi.fn();
      const storage = makeMockStorage('old-hash');
      mockComputeSourceHash.mockResolvedValue('new-hash');
      mockGetAnalyzedFilePaths.mockReturnValue(['/repo/src/main.ts']);

      const service = new ReefStalenessService(storage, onStale);

      service.scheduleCheck('/repo', 'context');

      // Dispose before debounce fires
      service.dispose();

      // Advance past debounce — should NOT fire
      await vi.advanceTimersByTimeAsync(3000);

      expect(storage.readMeta).not.toHaveBeenCalled();
      expect(onStale).not.toHaveBeenCalled();
    });
  });
});
