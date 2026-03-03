/**
 * Unit tests for ElementIdRegistry and shared sanitizeId/deriveContainerPath utilities (13-01)
 *
 * TDD RED phase: defines expected behavior before implementation.
 *
 * Tests:
 * - Test 1: sanitizeId("Main Process") returns "Main_Process"
 * - Test 2: sanitizeId("123invalid") returns "_123invalid" (leading digit prefixed)
 * - Test 3: sanitizeId("already_valid") returns "already_valid"
 * - Test 4: register() then getContainerPath() returns registered path
 * - Test 5: getContainerPath() for unregistered ID returns null
 * - Test 6: getHumanName() for registered ID returns human name
 * - Test 7: clear() empties all entries
 * - Test 8: deriveContainerPath("Main Process", staticData with entryPoints ["src/main/main.ts"]) returns "src/main"
 * - Test 9: deriveContainerPath("API Server", staticData with entryPoints ["src/api/index.ts"]) returns "src/api"
 * - Test 10: deriveContainerPath("Unknown_Thing", staticData) falls back to normalized lowercase
 * - Test 11: deriveContainerPath uses classes as secondary source when entryPoints don't match
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeId, ElementIdRegistry, deriveContainerPath } from '../../../../src/main/services/c4/elementIdRegistry';
import type { AnalysisResult } from '../../../../src/main/services/c4/types/analysisTypes';

// ---- Mock static analysis data helpers ----

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
    technologies: ['TypeScript'],
    entryPoints: [],
    metadata: {
      projectName: 'test-project',
      filesAnalyzed: 1,
      totalFiles: 5,
      timestamp: new Date().toISOString(),
      analysisQuality: 'full-ast',
    },
    ...overrides,
  };
}

// ---- sanitizeId tests ----

describe('sanitizeId', () => {
  it('Test 1: sanitizeId("Main Process") returns "Main_Process"', () => {
    expect(sanitizeId('Main Process')).toBe('Main_Process');
  });

  it('Test 2: sanitizeId("123invalid") returns "_123invalid" (leading digit prefixed)', () => {
    expect(sanitizeId('123invalid')).toBe('_123invalid');
  });

  it('Test 3: sanitizeId("already_valid") returns "already_valid"', () => {
    expect(sanitizeId('already_valid')).toBe('already_valid');
  });
});

// ---- ElementIdRegistry tests ----

describe('ElementIdRegistry', () => {
  let registry: ElementIdRegistry;

  beforeEach(() => {
    registry = new ElementIdRegistry();
  });

  it('Test 4: register() then getContainerPath() returns the registered path', () => {
    registry.register('Main_Process', 'Main Process', 'src/main', 'container');
    expect(registry.getContainerPath('Main_Process')).toBe('src/main');
  });

  it('Test 5: getContainerPath() for unregistered ID returns null', () => {
    expect(registry.getContainerPath('nonexistent_id')).toBeNull();
  });

  it('Test 6: getHumanName() for registered ID returns human name', () => {
    registry.register('Renderer_Process', 'Renderer Process', 'src/renderer', 'container');
    expect(registry.getHumanName('Renderer_Process')).toBe('Renderer Process');
  });

  it('Test 7: clear() empties all entries', () => {
    registry.register('Main_Process', 'Main Process', 'src/main', 'container');
    registry.register('Renderer_Process', 'Renderer Process', 'src/renderer', 'container');
    registry.clear();
    expect(registry.getContainerPath('Main_Process')).toBeNull();
    expect(registry.getContainerPath('Renderer_Process')).toBeNull();
  });
});

// ---- deriveContainerPath tests ----

describe('deriveContainerPath', () => {
  it('Test 8: deriveContainerPath("Main Process", staticData with entryPoints ["src/main/main.ts"]) returns "src/main"', () => {
    const staticData = makeStaticData({
      entryPoints: ['src/main/main.ts', 'src/renderer/App.tsx'],
    });
    const result = deriveContainerPath('Main Process', staticData);
    expect(result).toBe('src/main');
  });

  it('Test 9: deriveContainerPath("API Server", staticData with entryPoints ["src/api/index.ts"]) returns "src/api" (non-Electron repo)', () => {
    const staticData = makeStaticData({
      entryPoints: ['src/api/index.ts', 'src/client/main.ts'],
    });
    const result = deriveContainerPath('API Server', staticData);
    expect(result).toBe('src/api');
  });

  it('Test 10: deriveContainerPath("Unknown_Thing", staticData) falls back to normalized lowercase', () => {
    const staticData = makeStaticData({
      entryPoints: ['src/main/main.ts'],
    });
    const result = deriveContainerPath('Unknown_Thing', staticData);
    // Falls back to containerName.toLowerCase().replace(/\s+/g, '/')
    expect(result).toBe('unknown_thing');
  });

  it('Test 11: deriveContainerPath uses classes as secondary source when entryPoints do not match', () => {
    const staticData = makeStaticData({
      entryPoints: ['src/unrelated/index.ts'],
      structure: {
        classes: [
          {
            name: 'AuthController',
            file: 'src/auth/controller.ts',
            methods: ['login', 'logout'],
            properties: [],
            isExported: true,
            implements: [],
            decorators: [],
          },
        ],
        interfaces: [],
        imports: [],
        exports: [],
        functions: [],
      },
    });
    const result = deriveContainerPath('Auth Service', staticData);
    // Should match 'auth' from class file path since 'auth' includes 'auth'
    expect(result).toBe('src/auth');
  });
});
