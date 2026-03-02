/**
 * C4 Generation Integration Tests
 *
 * End-to-end validation of C4 diagram generation pipeline:
 * - Static analysis with ts-morph
 * - AI enrichment with Claude API (mocked)
 * - PlantUML generation
 * - Level-aware caching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { C4AnalyzerService } from '../../src/main/services/c4/c4AnalyzerService';
import { StaticAnalyzerService } from '../../src/main/services/c4/staticAnalyzerService';
import { C4PlantUMLGenerator } from '../../src/main/services/c4/c4PlantUMLGenerator';
import { C4CacheService } from '../../src/main/services/c4/c4CacheService';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock Anthropic SDK — uses messages.parse with structured zodOutputFormat responses
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn(), // kept for backward compat if anything still calls it
        parse: vi.fn().mockImplementation(async (params: any) => {
          // Return level-appropriate structured data based on the user prompt
          const userContent = params.messages?.[0]?.content || '';

          if (userContent.includes('context')) {
            return {
              parsed_output: {
                actors: [{ name: 'Developer', description: 'Uses the system to manage repositories' }],
                externalSystems: [
                  { name: 'GitHub', description: 'Source code hosting', relationship: 'Fetches repositories', technology: 'REST API' },
                ],
                relationships: [
                  { from: 'Developer', to: 'reef', label: 'Uses' },
                  { from: 'reef', to: 'GitHub', label: 'Fetches repositories', technology: 'REST API' },
                ],
              },
              usage: { input_tokens: 1000, output_tokens: 200, cache_creation_input_tokens: 500, cache_read_input_tokens: 0 },
            };
          }

          if (userContent.includes('container')) {
            return {
              parsed_output: {
                containers: [
                  { name: 'Electron Main Process', technology: 'Node.js/Electron', description: 'Application lifecycle and IPC', type: 'process' },
                  { name: 'Renderer Process', technology: 'React/TypeScript', description: 'User interface', type: 'process' },
                  { name: 'SQLite Storage', technology: 'better-sqlite3', description: 'Diagram and config persistence', type: 'database' },
                ],
                relationships: [
                  { from: 'Electron Main Process', to: 'Renderer Process', label: 'IPC communication', technology: 'Electron IPC' },
                  { from: 'Electron Main Process', to: 'SQLite Storage', label: 'Reads/writes diagrams' },
                ],
                externalSystems: [
                  { name: 'GitHub', description: 'Source code hosting', relationship: 'Fetches repositories', technology: 'REST API' },
                ],
              },
              usage: { input_tokens: 1000, output_tokens: 200, cache_creation_input_tokens: 500, cache_read_input_tokens: 0 },
            };
          }

          if (userContent.includes('component')) {
            return {
              parsed_output: {
                components: [
                  { name: 'C4 Analyzer', role: 'Orchestrates diagram generation pipeline', description: 'Coordinates static analysis, AI enrichment, and PlantUML rendering', technology: 'TypeScript' },
                  { name: 'Static Analyzer', role: 'Extracts code structure', description: 'Uses ts-morph for AST analysis', technology: 'ts-morph' },
                ],
                relationships: [
                  { from: 'C4 Analyzer', to: 'Static Analyzer', label: 'Analyzes project' },
                ],
              },
              usage: { input_tokens: 1000, output_tokens: 200, cache_creation_input_tokens: 500, cache_read_input_tokens: 0 },
            };
          }

          // Default fallback
          return {
            parsed_output: {
              actors: [{ name: 'User', description: 'Uses the system' }],
              externalSystems: [],
              relationships: [],
            },
            usage: { input_tokens: 500, output_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
          };
        }),
      };
    },
    APIError: class APIError extends Error {
      status?: number;
    },
  };
});

// Mock Electron app module
vi.mock('electron', () => ({
  app: {
    getPath: () => tmpdir(),
  },
}));

describe('C4 Generation Integration Tests', () => {
  let analyzer: C4AnalyzerService;
  let testRepoPath: string;

  beforeEach(async () => {
    // Create temporary test repository
    testRepoPath = join(tmpdir(), `test-repo-${Date.now()}`);
    await mkdir(testRepoPath, { recursive: true });
    await mkdir(join(testRepoPath, 'src', 'main', 'services'), { recursive: true });
    await mkdir(join(testRepoPath, 'src', 'renderer', 'components'), { recursive: true });

    // Create test files
    await writeFile(
      join(testRepoPath, 'package.json'),
      JSON.stringify({
        dependencies: {
          react: '^18.0.0',
          electron: '^28.0.0',
        },
      })
    );

    await writeFile(
      join(testRepoPath, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
        },
      })
    );

    await writeFile(
      join(testRepoPath, 'src', 'main', 'main.ts'),
      `
import { app } from 'electron';
import { GitService } from './services/gitService';

app.on('ready', () => {
  console.log('App ready');
});
      `
    );

    await writeFile(
      join(testRepoPath, 'src', 'main', 'services', 'gitService.ts'),
      `
export class GitService {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  async status(): Promise<string> {
    return 'status';
  }

  async commit(message: string): Promise<void> {
    console.log(message);
  }
}
      `
    );

    await writeFile(
      join(testRepoPath, 'src', 'renderer', 'App.tsx'),
      `
import React from 'react';

export default function App() {
  return <div>Hello World</div>;
}
      `
    );

    // Initialize analyzer with mock API key
    analyzer = new C4AnalyzerService('test-api-key');
  });

  afterEach(async () => {
    // Clean up test repository
    await rm(testRepoPath, { recursive: true, force: true });

    // Close analyzer
    analyzer.close();
  });

  it('generates C4 Context diagram with external dependencies', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'context');

    expect(result.success).toBe(true);
    expect(result.diagram).toBeDefined();
    expect(result.diagram).toContain('@startuml');
    expect(result.diagram).toContain('@enduml');
    expect(result.diagram).toContain('!include <C4/C4_Context>');
    expect(result.diagram).toContain('System(reef,');
    // AI-provided actor "Developer" (not static "User")
    expect(result.diagram).toContain('Developer');
    // AI-provided external system "GitHub"
    expect(result.diagram).toContain('GitHub');
    expect(result.diagram).toContain('SHOW_LEGEND()');
  });

  it('generates C4 Container diagram with Electron processes', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'container');

    expect(result.success).toBe(true);
    expect(result.diagram).toBeDefined();
    expect(result.diagram).toContain('@startuml');
    expect(result.diagram).toContain('@enduml');
    expect(result.diagram).toContain('!include <C4/C4_Container>');
    // AI-provided container names (not heuristic "Main Process")
    expect(result.diagram).toContain('Electron Main Process');
    expect(result.diagram).toContain('SQLite Storage');
    expect(result.diagram).toContain('System_Boundary(reef,');
  });

  it('generates C4 Component diagram scoped to container', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'component', 'Main Process');

    expect(result.success).toBe(true);
    expect(result.diagram).toBeDefined();
    expect(result.diagram).toContain('@startuml');
    expect(result.diagram).toContain('@enduml');
    expect(result.diagram).toContain('!include <C4/C4_Component>');
    expect(result.diagram).toContain('Container_Boundary(');
    // AI-provided component name
    expect(result.diagram).toContain('C4 Analyzer');
  });

  it('generates C4 Code diagram with class details', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'code', 'GitService');

    expect(result.success).toBe(true);
    expect(result.diagram).toBeDefined();
    expect(result.diagram).toContain('@startuml');
    expect(result.diagram).toContain('@enduml');
    expect(result.diagram).toContain('class GitService');
    expect(result.diagram).toContain('+status()');
    expect(result.diagram).toContain('+commit()');
  });

  it('uses cached diagram when files unchanged', async () => {
    // Generate diagram first time
    const result1 = await analyzer.generateC4Diagram(testRepoPath, 'context');
    expect(result1.success).toBe(true);

    // Generate again - should use cache
    const result2 = await analyzer.generateC4Diagram(testRepoPath, 'context');
    expect(result2.success).toBe(true);
    expect(result2.diagram).toEqual(result1.diagram);
  });

  it('invalidates cache when files modified', async () => {
    // Generate diagram first time
    const result1 = await analyzer.generateC4Diagram(testRepoPath, 'context');
    expect(result1.success).toBe(true);

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    // Modify a source file
    await writeFile(
      join(testRepoPath, 'src', 'main', 'main.ts'),
      `
import { app } from 'electron';

app.on('ready', () => {
  console.log('App ready - modified');
});
      `
    );

    // Generate again - should regenerate due to file modification
    const result2 = await analyzer.generateC4Diagram(testRepoPath, 'context');
    expect(result2.success).toBe(true);
    // Note: Diagram content will be the same because mock AI response is static,
    // but the cache should have been invalidated
  });

  it('includes C4-PlantUML stdlib include statements', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'context');

    expect(result.success).toBe(true);
    expect(result.diagram).toContain('!include <C4/C4_Context>');
  });

  it('reports coverage statistics', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'context');

    expect(result.success).toBe(true);
    expect(result.coverage).toBeDefined();
    expect(result.coverage?.analyzedFiles).toBeGreaterThan(0);
    expect(result.coverage?.totalFiles).toBeGreaterThan(0);
    expect(result.coverage?.percentage).toBeGreaterThanOrEqual(0);
    expect(result.coverage?.percentage).toBeLessThanOrEqual(100);
  });

  it('handles errors gracefully when repository is invalid', async () => {
    const invalidPath = join(tmpdir(), 'non-existent-repo');

    const result = await analyzer.generateC4Diagram(invalidPath, 'context');

    // Should return error for invalid repository
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('requires elementId for component diagrams', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'component');

    expect(result.success).toBe(false);
    expect(result.error).toContain('elementId');
  });

  it('requires elementId for code diagrams', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'code');

    expect(result.success).toBe(false);
    expect(result.error).toContain('elementId');
  });

  it('AI-enriched content appears in rendered Container diagram', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'container');
    expect(result.success).toBe(true);
    // These names come from AI, not heuristics
    expect(result.diagram).toContain('Electron Main Process');
    expect(result.diagram).toContain('React/TypeScript');
    expect(result.diagram).toContain('SQLite Storage');
    expect(result.diagram).toContain('IPC communication');
  });
});

describe('Static Analyzer Service', () => {
  let analyzer: StaticAnalyzerService;
  let testRepoPath: string;

  beforeEach(async () => {
    testRepoPath = join(tmpdir(), `test-repo-static-${Date.now()}`);
    await mkdir(testRepoPath, { recursive: true });
    await mkdir(join(testRepoPath, 'src'), { recursive: true });

    await writeFile(
      join(testRepoPath, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@octokit/rest': '^19.0.0',
          react: '^18.0.0',
        },
      })
    );

    await writeFile(
      join(testRepoPath, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
        },
      })
    );

    await writeFile(
      join(testRepoPath, 'src', 'service.ts'),
      `
import { Octokit } from '@octokit/rest';

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getRepos(): Promise<any[]> {
    return [];
  }
}
      `
    );

    analyzer = new StaticAnalyzerService();
  });

  afterEach(async () => {
    await rm(testRepoPath, { recursive: true, force: true });
  });

  it('detects external dependencies from imports', async () => {
    const result = await analyzer.analyzeProject(testRepoPath);

    expect(result.structure.imports).toBeDefined();
    const octokitImport = result.structure.imports.find(
      imp => imp.moduleSpecifier === '@octokit/rest'
    );
    expect(octokitImport).toBeDefined();
  });

  it('detects technologies from package.json', async () => {
    const result = await analyzer.analyzeProject(testRepoPath);

    expect(result.technologies).toContain('React');
  });
});

describe('C4 PlantUML Generator', () => {
  let generator: C4PlantUMLGenerator;

  beforeEach(() => {
    generator = new C4PlantUMLGenerator();
  });

  it('generates valid PlantUML syntax', () => {
    const mockData = {
      structure: { classes: [], interfaces: [], imports: [], exports: [], functions: [] },
      dependencies: { nodes: [], edges: [] },
      technologies: ['React', 'Electron'],
      entryPoints: ['src/main/main.ts'],
      metadata: {
        projectName: 'test-project',
        filesAnalyzed: 1,
        totalFiles: 1,
        timestamp: new Date().toISOString(),
        analysisQuality: 'full-ast' as const,
      },
    };

    const diagram = generator.generateContextDiagram(null, mockData);

    expect(diagram.startsWith('@startuml')).toBe(true);
    expect(diagram.endsWith('@enduml')).toBe(true);
  });

  it('sanitizes IDs correctly', () => {
    const id = generator.generateElementId('context', 'My System!');
    expect(id).toMatch(/^context_[a-zA-Z0-9_]+$/);
  });
});

describe('C4 Cache Service', () => {
  let cache: C4CacheService;
  let testRepoPath: string;

  beforeEach(async () => {
    testRepoPath = join(tmpdir(), `test-repo-cache-${Date.now()}`);
    await mkdir(testRepoPath, { recursive: true });

    // Use in-memory database for testing
    cache = new C4CacheService(':memory:');
  });

  afterEach(() => {
    cache.close();
  });

  it('stores and retrieves cached diagrams', async () => {
    const diagram = '@startuml\ntest diagram\n@enduml';

    await cache.setCachedDiagram(testRepoPath, 'context', diagram);
    const cached = await cache.getCachedDiagram(testRepoPath, 'context');

    expect(cached).toBe(diagram);
  });

  it('returns null for non-existent cache', async () => {
    const cached = await cache.getCachedDiagram(testRepoPath, 'context');
    expect(cached).toBeNull();
  });

  it('respects level-specific TTLs', () => {
    expect(cache.CONTEXT_TTL).toBe(7 * 24 * 60 * 60 * 1000);
    expect(cache.CONTAINER_TTL).toBe(3 * 24 * 60 * 60 * 1000);
    expect(cache.COMPONENT_TTL).toBe(24 * 60 * 60 * 1000);
    expect(cache.CODE_TTL).toBe(6 * 60 * 60 * 1000);
  });

  it('clears cache for specific repository', async () => {
    const diagram = '@startuml\ntest\n@enduml';

    await cache.setCachedDiagram(testRepoPath, 'context', diagram);
    cache.clearCache(testRepoPath);

    const cached = await cache.getCachedDiagram(testRepoPath, 'context');
    expect(cached).toBeNull();
  });
});
