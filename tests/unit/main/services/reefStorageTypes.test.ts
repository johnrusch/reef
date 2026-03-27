import { describe, it, expect } from 'vitest';
import { ReefMetaSchema } from '@main/services/reef/reefStorageTypes';

describe('ReefMetaSchema', () => {
  const baseValid = {
    schemaVersion: 1 as const,
    level: 'context' as const,
    generatedAt: '2026-01-01T00:00:00Z',
  };

  describe('sourceHash field', () => {
    it('parses successfully when sourceHash is a 64-char hex string', () => {
      const input = {
        ...baseValid,
        sourceHash: 'a'.repeat(64),
      };

      const result = ReefMetaSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceHash).toBe('a'.repeat(64));
      }
    });

    it('parses successfully when sourceHash is omitted (backward compatibility)', () => {
      const result = ReefMetaSchema.safeParse(baseValid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceHash).toBeUndefined();
      }
    });

    it('parses successfully when sourceHash is a real SHA-256 hex string', () => {
      const sha256Hex = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const input = { ...baseValid, sourceHash: sha256Hex };

      const result = ReefMetaSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceHash).toBe(sha256Hex);
      }
    });
  });
});
