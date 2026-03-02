/**
 * Unit tests for C4PlantUMLGenerator enrichment data consumption (12-02)
 *
 * TDD RED phase tests — these tests define the expected behavior when
 * C4PlantUMLGenerator consumes typed AI enrichment data instead of ignoring it.
 *
 * Tests from plan 12-02 Task 1 behavior spec:
 * - Test 1: Container diagram contains AI-provided container name "Electron Main Process"
 * - Test 2: Container diagram contains AI-provided technology labels
 * - Test 3: Container diagram contains AI-provided relationship labels with technology
 * - Test 4: Component diagram contains AI-provided component names and roles
 * - Test 5: Context diagram contains AI-provided actors and external systems
 * - Test 6: When enrichedData has empty containers array, falls back to static heuristic detectContainers()
 * - Test 7: When enrichedData is null, falls back to static heuristics for all fields
 * - Test 8: Code diagram still uses static analysis only (enrichedData passed but not consumed)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { C4PlantUMLGenerator } from '../../../src/main/services/c4/c4PlantUMLGenerator';
import type { AnalysisResult } from '../../../src/main/services/c4/types/analysisTypes';
import type {
  EnrichedContextLevel,
  EnrichedContainerLevel,
  EnrichedComponentLevel,
  EnrichedArchitecture,
} from '../../../src/main/services/c4/types/enrichmentTypes';

// ---- Mock static analysis data ----

function makeStaticData(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    structure: {
      classes: [
        {
          name: 'GitService',
          file: 'src/main/services/gitService.ts',
          methods: ['status', 'commit'],
          properties: [],
          isExported: true,
          implements: [],
        },
      ],
      interfaces: [],
      imports: [
        { file: 'src/main/services/gitService.ts', moduleSpecifier: '@octokit/rest', namedImports: [], defaultImport: 'Octokit' },
      ],
      exports: [],
      functions: [],
    },
    dependencies: { nodes: [], edges: [] },
    technologies: ['Electron', 'React', 'TypeScript'],
    entryPoints: ['src/main/main.ts', 'src/renderer/App.tsx'],
    metadata: {
      projectName: 'reef',
      filesAnalyzed: 5,
      totalFiles: 10,
      timestamp: new Date().toISOString(),
      analysisQuality: 'full-ast',
    },
    ...overrides,
  };
}

// ---- Mock enrichment data ----

const aiContainerData: EnrichedContainerLevel = {
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
};

const aiContextData: EnrichedContextLevel = {
  actors: [{ name: 'Developer', description: 'Uses the system to manage repositories' }],
  externalSystems: [
    { name: 'GitHub', description: 'Source code hosting', relationship: 'Fetches repositories', technology: 'REST API' },
  ],
  relationships: [
    { from: 'Developer', to: 'reef', label: 'Uses' },
    { from: 'reef', to: 'GitHub', label: 'Fetches repositories', technology: 'REST API' },
  ],
};

const aiComponentData: EnrichedComponentLevel = {
  components: [
    { name: 'C4 Analyzer', role: 'Orchestrates diagram generation pipeline', description: 'Coordinates static analysis, AI enrichment, and PlantUML rendering', technology: 'TypeScript' },
    { name: 'Static Analyzer', role: 'Extracts code structure', description: 'Uses ts-morph for AST analysis', technology: 'ts-morph' },
  ],
  relationships: [
    { from: 'C4 Analyzer', to: 'Static Analyzer', label: 'Analyzes project' },
  ],
};

// ---- Test suite ----

describe('C4PlantUMLGenerator - AI enrichment data consumption (12-02)', () => {
  let generator: C4PlantUMLGenerator;
  let staticData: AnalysisResult;

  beforeEach(() => {
    generator = new C4PlantUMLGenerator();
    staticData = makeStaticData();
  });

  it('Test 1: Container diagram contains AI-provided container name "Electron Main Process"', () => {
    const diagram = generator.generateContainerDiagram(aiContainerData, staticData);

    // AI-provided name should appear (not heuristic "Main Process")
    expect(diagram).toContain('Electron Main Process');
  });

  it('Test 2: Container diagram contains AI-provided technology labels in Container() calls', () => {
    const diagram = generator.generateContainerDiagram(aiContainerData, staticData);

    expect(diagram).toContain('Node.js/Electron');
    expect(diagram).toContain('React/TypeScript');
    expect(diagram).toContain('better-sqlite3');
  });

  it('Test 3: Container diagram contains AI-provided relationship labels with technology', () => {
    const diagram = generator.generateContainerDiagram(aiContainerData, staticData);

    expect(diagram).toContain('IPC communication');
    expect(diagram).toContain('Reads/writes diagrams');
  });

  it('Test 4: Component diagram contains AI-provided component names and roles', () => {
    const diagram = generator.generateComponentDiagram(aiComponentData, staticData, 'Main Process');

    expect(diagram).toContain('C4 Analyzer');
    expect(diagram).toContain('Static Analyzer');
  });

  it('Test 5: Context diagram contains AI-provided actors and external systems', () => {
    const diagram = generator.generateContextDiagram(aiContextData, staticData);

    // AI-provided actor "Developer" (not static "User")
    expect(diagram).toContain('Developer');
    // AI-provided external system "GitHub" relationship
    expect(diagram).toContain('GitHub');
  });

  it('Test 6: When enrichedData has empty containers array, falls back to static heuristic detectContainers()', () => {
    const emptyContainerData: EnrichedContainerLevel = {
      containers: [],
      relationships: [],
      externalSystems: [],
    };
    const diagram = generator.generateContainerDiagram(emptyContainerData, staticData);

    // Should fall back to static heuristics: "Main Process" and "Renderer Process"
    expect(diagram).toContain('Main_Process');
    expect(diagram).toContain('Renderer_Process');
  });

  it('Test 7: When enrichedData is null, falls back to static heuristics for all fields', () => {
    const diagram = generator.generateContainerDiagram(null, staticData);

    // Should fall back to static heuristics: "Main Process" and "Renderer Process"
    expect(diagram).toContain('Main_Process');
    expect(diagram).toContain('Renderer_Process');
  });

  it('Test 8: Code diagram accepts enrichedData parameter but uses static analysis only', () => {
    const anyEnrichment: EnrichedArchitecture = aiContainerData;
    const diagram = generator.generateCodeDiagram(anyEnrichment, staticData, 'GitService');

    // Should still generate a code-level diagram using static analysis
    expect(diagram).toContain('@startuml');
    expect(diagram).toContain('@enduml');
    expect(diagram).toContain('class GitService');
  });

  it('Container diagram uses ContainerDb() macro for AI-provided database containers', () => {
    const diagram = generator.generateContainerDiagram(aiContainerData, staticData);

    // SQLite Storage is type 'database', should use ContainerDb()
    expect(diagram).toContain('ContainerDb(');
    expect(diagram).toContain('SQLite Storage');
  });

  it('Container diagram includes AI-provided external systems', () => {
    const diagram = generator.generateContainerDiagram(aiContainerData, staticData);

    expect(diagram).toContain('System_Ext(GitHub,');
  });
});
