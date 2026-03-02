/**
 * Enrichment Type Definitions
 *
 * Zod schemas for validating structured AI output from AIEnricherService.
 * Each schema corresponds to a C4 level that uses AI enrichment (context,
 * container, component — code level uses static analysis only).
 */

import { z } from 'zod';

// Context level: actors, external systems, and their relationships to the target system
export const ContextLevelSchema = z.object({
  actors: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
  externalSystems: z.array(z.object({
    name: z.string(),
    description: z.string(),
    relationship: z.string(),
    technology: z.string().optional(),
  })),
  relationships: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
    technology: z.string().optional(),
  })),
});

// Container level: deployable units, databases, relationships
export const ContainerLevelSchema = z.object({
  containers: z.array(z.object({
    name: z.string(),
    technology: z.string(),
    description: z.string(),
    type: z.enum(['process', 'database', 'queue', 'storage']),
  })),
  relationships: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
    technology: z.string().optional(),
  })),
  externalSystems: z.array(z.object({
    name: z.string(),
    description: z.string(),
    relationship: z.string(),
    technology: z.string().optional(),
  })),
});

// Component level: logical groupings within a container
export const ComponentLevelSchema = z.object({
  components: z.array(z.object({
    name: z.string(),
    role: z.string(),
    description: z.string(),
    technology: z.string().optional(),
  })),
  relationships: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string(),
    technology: z.string().optional(),
  })),
});

// Inferred TypeScript types
export type EnrichedContextLevel = z.infer<typeof ContextLevelSchema>;
export type EnrichedContainerLevel = z.infer<typeof ContainerLevelSchema>;
export type EnrichedComponentLevel = z.infer<typeof ComponentLevelSchema>;

// Union type for the return value of enrichArchitecture()
export type EnrichedArchitecture = EnrichedContextLevel | EnrichedContainerLevel | EnrichedComponentLevel;
