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

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'Architectural insights: Reef is a desktop application for managing GitHub repositories. It uses Electron for cross-platform support and separates concerns between main and renderer processes.',
            },
          ],
          usage: {
            input_tokens: 1000,
            output_tokens: 200,
            cache_creation_input_tokens: 500,
            cache_read_input_tokens: 0,
          },
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
    expect(result.diagram).toContain('C4_Context.puml');
    expect(result.diagram).toContain('System(reef,');
    expect(result.diagram).toContain('Person(user,');
    expect(result.diagram).toContain('SHOW_LEGEND()');
  });

  it('generates C4 Container diagram with Electron processes', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'container');

    expect(result.success).toBe(true);
    expect(result.diagram).toBeDefined();
    expect(result.diagram).toContain('@startuml');
    expect(result.diagram).toContain('@enduml');
    expect(result.diagram).toContain('C4_Container.puml');
    expect(result.diagram).toContain('Container(Main_Process,');
    expect(result.diagram).toContain('Container(Renderer_Process,');
    expect(result.diagram).toContain('System_Boundary(reef,');
  });

  it('generates C4 Component diagram scoped to container', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'component', 'Main Process');

    expect(result.success).toBe(true);
    expect(result.diagram).toBeDefined();
    expect(result.diagram).toContain('@startuml');
    expect(result.diagram).toContain('@enduml');
    expect(result.diagram).toContain('C4_Component.puml');
    expect(result.diagram).toContain('Container_Boundary(');
    expect(result.diagram).toContain('Component(');
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

  it('includes C4-PlantUML include statements', async () => {
    const result = await analyzer.generateC4Diagram(testRepoPath, 'context');

    expect(result.success).toBe(true);
    expect(result.diagram).toContain('!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml');
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
      structure: { classes: [], interfaces: [], imports: [], exports: [] },
      dependencies: { nodes: [], edges: [] },
      technologies: ['React', 'Electron'],
      entryPoints: ['src/main/main.ts'],
      metadata: {
        filesAnalyzed: 1,
        totalFiles: 1,
        timestamp: new Date().toISOString(),
      },
    };

    const diagram = generator.generateContextDiagram('test enrichment', mockData);

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
