import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

/**
 * Compute a SHA-256 hash over the contents of the given source files.
 * Files are sorted by path before hashing to ensure determinism.
 * Missing files (ENOENT) are silently skipped.
 *
 * Per D-03: hash only the files the static analyzer actually read.
 * Per D-04: the analyzer tracks which files it reads; this list feeds the hash.
 */
export async function computeSourceHash(filePaths: string[]): Promise<string> {
  const sorted = [...filePaths].sort();
  const hash = createHash('sha256');

  for (const fp of sorted) {
    try {
      const content = await readFile(fp, 'utf8');
      // Include the path in the hash so renaming a file changes the hash
      hash.update(fp);
      hash.update(content);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw err;
    }
  }

  return hash.digest('hex');
}
