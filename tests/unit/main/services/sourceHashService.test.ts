import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { computeSourceHash } from '@main/services/reef/sourceHashService';

describe('computeSourceHash', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'source-hash-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns a 64-character hex string (SHA-256) for two files', async () => {
    const fileA = join(tmpDir, 'a.ts');
    const fileB = join(tmpDir, 'b.ts');
    await writeFile(fileA, 'export const a = 1;', 'utf8');
    await writeFile(fileB, 'export const b = 2;', 'utf8');

    const hash = await computeSourceHash([fileA, fileB]);

    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it('is deterministic — same files produce same hash', async () => {
    const fileA = join(tmpDir, 'a.ts');
    const fileB = join(tmpDir, 'b.ts');
    await writeFile(fileA, 'export const a = 1;', 'utf8');
    await writeFile(fileB, 'export const b = 2;', 'utf8');

    const hash1 = await computeSourceHash([fileA, fileB]);
    const hash2 = await computeSourceHash([fileA, fileB]);

    expect(hash1).toBe(hash2);
  });

  it('produces a different hash when file contents change', async () => {
    const fileA = join(tmpDir, 'a.ts');
    await writeFile(fileA, 'export const a = 1;', 'utf8');
    const hashBefore = await computeSourceHash([fileA]);

    await writeFile(fileA, 'export const a = 99;', 'utf8');
    const hashAfter = await computeSourceHash([fileA]);

    expect(hashBefore).not.toBe(hashAfter);
  });

  it('sorts file paths before hashing so order does not matter', async () => {
    const fileA = join(tmpDir, 'a.ts');
    const fileB = join(tmpDir, 'b.ts');
    await writeFile(fileA, 'const a = 1;', 'utf8');
    await writeFile(fileB, 'const b = 2;', 'utf8');

    const hashAB = await computeSourceHash([fileA, fileB]);
    const hashBA = await computeSourceHash([fileB, fileA]);

    expect(hashAB).toBe(hashBA);
  });

  it('returns a consistent hash for an empty file list', async () => {
    const hash1 = await computeSourceHash([]);
    const hash2 = await computeSourceHash([]);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('skips files that do not exist (ENOENT) without throwing', async () => {
    const existingFile = join(tmpDir, 'exists.ts');
    const missingFile = join(tmpDir, 'does-not-exist.ts');
    await writeFile(existingFile, 'export const x = 1;', 'utf8');

    // Should not throw even though missingFile does not exist
    const hash = await computeSourceHash([existingFile, missingFile]);

    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(64);

    // Hash should equal hash with only the existing file
    const hashExistingOnly = await computeSourceHash([existingFile]);
    expect(hash).toBe(hashExistingOnly);
  });
});
