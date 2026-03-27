import { z } from 'zod';

export const REEF_SCHEMA_VERSION = 1 as const;
export const REEF_DIR = '.reef';

export const ReefMetaSchema = z.object({
  schemaVersion: z.literal(REEF_SCHEMA_VERSION),
  level: z.enum(['context', 'container', 'component', 'code']),
  generatedAt: z.string(),
  modelUsed: z.string().optional(),
  promptVersion: z.string().optional(),
  tokensUsed: z.number().optional(),
});

export type ReefMetaJson = z.infer<typeof ReefMetaSchema>;

// Flat levels get files directly in .reef/ (per D-01)
export const FLAT_LEVELS = ['context', 'container'] as const;
export type FlatLevel = typeof FLAT_LEVELS[number];

// Nested levels get subdirectories keyed by parent element ID (per D-02)
export const NESTED_LEVELS = ['component', 'code'] as const;
export type NestedLevel = typeof NESTED_LEVELS[number];
