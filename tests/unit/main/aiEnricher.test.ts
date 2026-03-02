/**
 * Unit tests for AIEnricherService
 *
 * Tests structured output (ENRCH-02) and framework-aware prompts (ENRCH-04).
 * Mocks @anthropic-ai/sdk to stub messages.parse with zodOutputFormat.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextLevelSchema, ContainerLevelSchema, ComponentLevelSchema } from '../../../src/main/services/c4/types/enrichmentTypes';
import type { AnalysisResult } from '../../../src/main/services/c4/types/analysisTypes';

// ---------- Mock @anthropic-ai/sdk ----------

const mockContextOutput = {
  actors: [{ name: 'Developer', description: 'Uses the application' }],
  externalSystems: [{ name: 'GitHub API', description: 'Source code hosting', relationship: 'reads from', technology: 'REST' }],
  relationships: [{ from: 'Developer', to: 'System', label: 'uses' }],
};

const mockContainerOutput = {
  containers: [{ name: 'Main Process', technology: 'Node.js', description: 'Electron main', type: 'process' as const }],
  relationships: [{ from: 'Main Process', to: 'Renderer Process', label: 'IPC', technology: 'Electron IPC' }],
  externalSystems: [{ name: 'GitHub API', description: 'Version control API', relationship: 'reads from' }],
};

const mockComponentOutput = {
  components: [{ name: 'AuthService', role: 'Authentication', description: 'Handles auth flows', technology: 'JWT' }],
  relationships: [{ from: 'AuthService', to: 'UserStore', label: 'updates', technology: 'Zustand' }],
};

let mockParsedOutput: unknown = mockContextOutput;

const mockParseImpl = vi.fn().mockImplementation(async () => ({
  parsed_output: mockParsedOutput,
  usage: {
    input_tokens: 500,
    output_tokens: 100,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      parse: mockParseImpl,
    };
  },
  APIError: class APIError extends Error {
    status?: number;
  },
}));

vi.mock('@anthropic-ai/sdk/helpers/zod', () => ({
  zodOutputFormat: vi.fn().mockReturnValue({ type: 'json_schema', json_schema: {} }),
}));

// ---------- Helpers ----------

function makeStaticData(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    structure: {
      classes: [],
      interfaces: [],
      imports: [],
      exports: [],
      functions: [],
    },
    dependencies: { nodes: [], edges: [] },
    technologies: ['Electron', 'React', 'TypeScript'],
    entryPoints: ['src/main.ts'],
    metadata: {
      projectName: 'reef',
      filesAnalyzed: 10,
      totalFiles: 15,
      timestamp: new Date().toISOString(),
      analysisQuality: 'full-ast',
    },
    ...overrides,
  };
}

// ---------- Test Suite ----------

describe('Enrichment Type Schemas (ENRCH-02)', () => {
  it('Test 1: ContextLevelSchema validates a well-formed context-level response', () => {
    const result = ContextLevelSchema.safeParse(mockContextOutput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actors).toHaveLength(1);
      expect(result.data.externalSystems).toHaveLength(1);
      expect(result.data.relationships).toHaveLength(1);
    }
  });

  it('Test 2: ContainerLevelSchema validates a well-formed container-level response', () => {
    const result = ContainerLevelSchema.safeParse(mockContainerOutput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.containers).toHaveLength(1);
      expect(result.data.containers[0].type).toBe('process');
    }
  });

  it('Test 3: ComponentLevelSchema validates a well-formed component-level response', () => {
    const result = ComponentLevelSchema.safeParse(mockComponentOutput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.components).toHaveLength(1);
      expect(result.data.components[0].role).toBe('Authentication');
    }
  });

  it('Test 4: Each schema rejects missing required fields', () => {
    const badContext = ComponentLevelSchema.safeParse({ actors: [] }); // Missing components
    expect(badContext.success).toBe(false);

    const badContainer = ContainerLevelSchema.safeParse({ containers: 'not-an-array' });
    expect(badContainer.success).toBe(false);

    const badComponent = ContextLevelSchema.safeParse({ externalSystems: [], relationships: [] }); // Missing actors
    expect(badComponent.success).toBe(false);
  });
});

describe('AIEnricherService structured output (ENRCH-02)', () => {
  beforeEach(() => {
    mockParseImpl.mockClear();
    mockParsedOutput = mockContextOutput;
  });

  it('Test 5: enrichArchitecture() returns a structured object, not a string', async () => {
    const { AIEnricherService } = await import('../../../src/main/services/c4/aiEnricherService');
    const service = new AIEnricherService('test-api-key');
    const staticData = makeStaticData();

    const result = await service.enrichArchitecture(staticData, 'context');

    // Must NOT be a string
    expect(typeof result).not.toBe('string');
    // Must be an object with expected structure
    expect(result).toHaveProperty('actors');
    expect(result).toHaveProperty('externalSystems');
    expect(result).toHaveProperty('relationships');
  });

  it('Test 6: enrichArchitecture() throws descriptive error when parsed_output is null', async () => {
    mockParsedOutput = null;
    mockParseImpl.mockResolvedValueOnce({
      parsed_output: null,
      usage: { input_tokens: 100, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    });

    const { AIEnricherService } = await import('../../../src/main/services/c4/aiEnricherService');
    const service = new AIEnricherService('test-api-key');
    const staticData = makeStaticData();

    await expect(service.enrichArchitecture(staticData, 'context')).rejects.toThrow(
      'AI enrichment returned invalid structured output'
    );
  });
});

describe('AIEnricherService framework-aware prompts (ENRCH-04)', () => {
  beforeEach(() => {
    mockParseImpl.mockClear();
    mockParsedOutput = mockContextOutput;
  });

  it('Test 7: Framework-aware prompt for Electron app includes "Main Process" context', async () => {
    const { AIEnricherService } = await import('../../../src/main/services/c4/aiEnricherService');
    const service = new AIEnricherService('test-api-key');
    const electronData = makeStaticData({ technologies: ['Electron', 'React', 'TypeScript'] });

    await service.enrichArchitecture(electronData, 'container');

    expect(mockParseImpl).toHaveBeenCalledTimes(1);
    const callArgs = mockParseImpl.mock.calls[0][0];
    const systemContent = JSON.stringify(callArgs.system);
    expect(systemContent).toContain('Main Process');
  });

  it('Test 8: Framework-aware prompt for React app (non-Electron) differs from Express app prompt', async () => {
    const { AIEnricherService } = await import('../../../src/main/services/c4/aiEnricherService');
    const service = new AIEnricherService('test-api-key');

    const reactData = makeStaticData({ technologies: ['React', 'TypeScript'] });
    const expressData = makeStaticData({ technologies: ['Express', 'Node.js'] });

    // Call for React
    await service.enrichArchitecture(reactData, 'container');
    const reactCallArgs = mockParseImpl.mock.calls[0][0];
    const reactSystemContent = JSON.stringify(reactCallArgs.system);

    // Call for Express
    await service.enrichArchitecture(expressData, 'container');
    const expressCallArgs = mockParseImpl.mock.calls[1][0];
    const expressSystemContent = JSON.stringify(expressCallArgs.system);

    // Prompts must differ
    expect(reactSystemContent).not.toBe(expressSystemContent);
    // React prompt should mention React app
    expect(reactSystemContent).toContain('React');
    // Express prompt should mention Express
    expect(expressSystemContent).toContain('Express');
    // And they should NOT cross-contaminate
    expect(reactSystemContent).not.toContain('Express.js API server');
    expect(expressSystemContent).not.toContain('browser SPA');
  });
});
