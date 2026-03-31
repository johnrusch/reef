/**
 * Unit tests for C4PlantUMLGenerator.generateCodeDiagram (23-02)
 *
 * TDD RED phase tests — these tests define the expected behavior for the rewritten
 * generateCodeDiagram method with directory matching, stereotyped rendering, and empty fallback.
 *
 * Tests from plan 23-02 Task 1 behavior spec:
 * - Test 1: When componentId matches a componentGroup.rawName, diagram includes exported classes from that group
 * - Test 2: Exported functions render as `class FuncName <<function>>` with parameters and returnType
 * - Test 3: React components render as `class CompName <<component>>` with props
 * - Test 4: Exported enums render as `class EnumName <<enumeration>>` with members
 * - Test 5: Non-exported classes, functions, and enums are excluded
 * - Test 6: Subdirectory files are included recursively
 * - Test 7: Usage relationships shown between all element types including functions
 * - Test 8: When component has no exportable elements, diagram contains a note listing files
 * - Test 9: Existing enrichment test signature still works (enrichedData accepted, unused)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { C4PlantUMLGenerator } from '../../../src/main/services/c4/c4PlantUMLGenerator';
import type { AnalysisResult } from '../../../src/main/services/c4/types/analysisTypes';
import type { EnrichedArchitecture } from '../../../src/main/services/c4/types/enrichmentTypes';

// ---- Mock static analysis data ----

function makeStaticData(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    structure: {
      classes: [
        {
          name: 'AuthService',
          file: 'src/main/services/auth/authService.ts',
          methods: ['login', 'logout'],
          properties: ['token'],
          isExported: true,
          implements: [],
          decorators: [],
        },
        {
          name: 'PrivateHelper',
          file: 'src/main/services/auth/helpers.ts',
          methods: ['sanitize'],
          properties: [],
          isExported: false,
          implements: [],
          decorators: [],
        },
      ],
      interfaces: [],
      imports: [
        {
          file: 'src/main/services/auth/authService.ts',
          moduleSpecifier: './tokenStore',
          namedImports: ['TokenStore'],
          isTypeOnly: false,
        },
      ],
      exports: [],
      functions: [
        {
          name: 'validateToken',
          file: 'src/main/services/auth/authService.ts',
          returnType: 'boolean',
          isAsync: false,
          isExported: true,
          isSignificant: true,
          parameters: [
            { name: 'token', type: 'string' },
            { name: 'expiresAt', type: 'number' },
          ],
        },
        {
          name: 'internalHelper',
          file: 'src/main/services/auth/authService.ts',
          returnType: 'void',
          isAsync: false,
          isExported: false,
          isSignificant: false,
          parameters: [],
        },
        {
          name: 'UserCard',
          file: 'src/renderer/components/UserCard.tsx',
          returnType: 'JSX.Element',
          isAsync: false,
          isExported: true,
          isSignificant: true,
          parameters: [
            { name: 'props', type: 'UserCardProps' },
          ],
        },
        {
          name: 'parseConfig',
          file: 'src/main/services/c4/subdir/configParser.ts',
          returnType: 'Config',
          isAsync: false,
          isExported: true,
          isSignificant: true,
          parameters: [
            { name: 'raw', type: 'string' },
          ],
        },
      ],
      enums: [
        {
          name: 'AuthStatus',
          file: 'src/main/services/auth/authService.ts',
          members: ['PENDING', 'AUTHENTICATED', 'EXPIRED'],
          isExported: true,
          isConst: false,
        },
        {
          name: 'InternalState',
          file: 'src/main/services/auth/authService.ts',
          members: ['INIT', 'DONE'],
          isExported: false,
          isConst: false,
        },
      ],
    },
    dependencies: { nodes: [], edges: [] },
    technologies: ['Electron', 'React', 'TypeScript'],
    entryPoints: ['src/main/main.ts'],
    metadata: {
      projectName: 'reef',
      filesAnalyzed: 10,
      totalFiles: 20,
      timestamp: new Date().toISOString(),
      analysisQuality: 'full-ast',
    },
    componentGroups: [
      {
        rawName: 'auth',
        label: 'Auth Services',
        files: [
          'src/main/services/auth/authService.ts',
          'src/main/services/auth/helpers.ts',
        ],
        classCount: 2,
        functionCount: 2,
      },
      {
        rawName: 'c4',
        label: 'C4 Services',
        files: [
          'src/main/services/c4/c4PlantUMLGenerator.ts',
        ],
        classCount: 1,
        functionCount: 0,
      },
      {
        rawName: 'emptyComponent',
        label: 'Empty Component',
        files: [
          'src/main/services/emptyComponent/types.d.ts',
          'src/main/services/emptyComponent/config.json',
          'src/main/services/emptyComponent/README.md',
        ],
        classCount: 0,
        functionCount: 0,
      },
    ],
    ...overrides,
  };
}

// ---- Test suite ----

describe('C4PlantUMLGenerator - generateCodeDiagram (23-02)', () => {
  let generator: C4PlantUMLGenerator;
  let staticData: AnalysisResult;

  beforeEach(() => {
    generator = new C4PlantUMLGenerator();
    staticData = makeStaticData();
  });

  it('Test 1: When componentId matches componentGroup.rawName, diagram includes exported classes from that group (D-04)', () => {
    const diagram = generator.generateCodeDiagram(null, staticData, 'auth');

    // Should include AuthService class (exported, in auth group files)
    expect(diagram).toContain('class AuthService');
    // Should NOT include class from a different component
    expect(diagram).not.toContain('UserCard');
  });

  it('Test 2: Exported functions render as stereotyped <<function>> classes with parameters and returnType (D-01)', () => {
    const diagram = generator.generateCodeDiagram(null, staticData, 'auth');

    // validateToken is exported and in auth group
    expect(diagram).toContain('class validateToken <<function>>');
    // Parameters shown as properties
    expect(diagram).toContain('+token: string');
    expect(diagram).toContain('+expiresAt: number');
    // Return type shown after separator
    expect(diagram).toContain('+returns: boolean');
  });

  it('Test 3: React components (JSX return type) render as <<component>> stereotype with props (D-02)', () => {
    const componentData = makeStaticData({
      componentGroups: [
        {
          rawName: 'components',
          label: 'React Components',
          files: ['src/renderer/components/UserCard.tsx'],
          classCount: 0,
          functionCount: 1,
        },
      ],
    });

    const diagram = generator.generateCodeDiagram(null, componentData, 'components');

    // UserCard has JSX.Element return type and capital letter — should be <<component>>
    expect(diagram).toContain('class UserCard <<component>>');
    expect(diagram).toContain('+props: UserCardProps');
    // Should NOT have returnType as regular <<function>>
    expect(diagram).not.toContain('class UserCard <<function>>');
  });

  it('Test 4: Exported enums render as <<enumeration>> with member values listed (D-03)', () => {
    const diagram = generator.generateCodeDiagram(null, staticData, 'auth');

    // AuthStatus is exported
    expect(diagram).toContain('class AuthStatus <<enumeration>>');
    expect(diagram).toContain('PENDING');
    expect(diagram).toContain('AUTHENTICATED');
    expect(diagram).toContain('EXPIRED');
  });

  it('Test 5: Non-exported classes, functions, and enums are excluded (D-06)', () => {
    const diagram = generator.generateCodeDiagram(null, staticData, 'auth');

    // PrivateHelper class is not exported
    expect(diagram).not.toContain('class PrivateHelper');
    // internalHelper function is not exported
    expect(diagram).not.toContain('class internalHelper');
    // InternalState enum is not exported
    expect(diagram).not.toContain('class InternalState');
  });

  it('Test 6: Subdirectory files are included recursively when they share directory prefix (D-05)', () => {
    // c4 component group has files in src/main/services/c4/
    // parseConfig is in src/main/services/c4/subdir/configParser.ts
    // which starts with the same directory prefix
    const diagram = generator.generateCodeDiagram(null, staticData, 'c4');

    // parseConfig should be included because it's in a subdirectory of c4's file prefix
    expect(diagram).toContain('class parseConfig <<function>>');
  });

  it('Test 7: Usage relationships (import-based arrows) shown between all element types including functions (D-07)', () => {
    // AuthService imports TokenStore, but TokenStore is not in scope, so no arrow
    // Let's add a cross-reference: make AuthService import validateToken to test same-scope relations
    const dataWithCrossRef = makeStaticData({
      structure: {
        ...makeStaticData().structure,
        imports: [
          {
            file: 'src/main/services/auth/authService.ts',
            moduleSpecifier: './validators',
            namedImports: ['AuthStatus'],
            isTypeOnly: false,
          },
        ],
      },
    });

    const diagram = generator.generateCodeDiagram(null, dataWithCrossRef, 'auth');

    // AuthService imports AuthStatus which is in the same scope
    expect(diagram).toContain('AuthService --> AuthStatus : uses');
  });

  it('Test 8: When component has no exportable elements, diagram contains a note listing files and types (D-08)', () => {
    const diagram = generator.generateCodeDiagram(null, staticData, 'emptyComponent');

    // Should contain a note about no diagrammable elements
    expect(diagram).toContain('No diagrammable code elements found');
    // Should contain file count info
    expect(diagram).toContain('3 files');
  });

  it('Test 9: Existing enrichment test compatibility — accepts enrichedData parameter but uses static analysis only', () => {
    const anyEnrichment = {} as EnrichedArchitecture;
    const diagram = generator.generateCodeDiagram(anyEnrichment, staticData, 'auth');

    // Should still generate a code-level diagram
    expect(diagram).toContain('@startuml');
    expect(diagram).toContain('@enduml');
    expect(diagram).toContain('class AuthService');
  });
});
