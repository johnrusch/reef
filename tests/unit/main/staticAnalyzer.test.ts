/**
 * Unit tests for StaticAnalyzerService
 *
 * Tests the ts-morph-based static code analysis functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { StaticAnalyzerService } from '../../../src/main/services/c4/staticAnalyzerService';
import { FunctionInfo } from '../../../src/main/services/c4/types/analysisTypes';
import { join } from 'path';

describe('StaticAnalyzerService', () => {
  let analyzer: StaticAnalyzerService;
  const fixtureRepoPath = join(__dirname, '../../fixtures/sample-repo');

  beforeAll(() => {
    analyzer = new StaticAnalyzerService();
  });

  it('extracts classes with methods and properties', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    expect(result.structure.classes).toHaveLength(3);

    // Find TestService class
    const testService = result.structure.classes.find(c => c.name === 'TestService');
    expect(testService).toBeDefined();
    expect(testService?.methods).toContain('addItem');
    expect(testService?.methods).toContain('getItems');
    expect(testService?.methods).toContain('getCount');
    expect(testService?.properties).toContain('data');
    expect(testService?.properties).toContain('count');
    expect(testService?.isExported).toBe(true);
    expect(testService?.isAbstract).toBe(false);

    // Find AbstractService class
    const abstractService = result.structure.classes.find(c => c.name === 'AbstractService');
    expect(abstractService).toBeDefined();
    expect(abstractService?.isAbstract).toBe(true);
    expect(abstractService?.implements).toContain('TestInterface');
  });

  it('extracts interfaces with properties', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    expect(result.structure.interfaces).toHaveLength(2);

    // Find TestInterface
    const testInterface = result.structure.interfaces.find(i => i.name === 'TestInterface');
    expect(testInterface).toBeDefined();
    expect(testInterface?.properties).toHaveLength(3);
    expect(testInterface?.properties.some(p => p.name === 'id' && !p.optional)).toBe(true);
    expect(testInterface?.properties.some(p => p.name === 'optional' && p.optional)).toBe(true);
    expect(testInterface?.isExported).toBe(true);

    // Find ExtendedInterface
    const extendedInterface = result.structure.interfaces.find(i => i.name === 'ExtendedInterface');
    expect(extendedInterface).toBeDefined();
    expect(extendedInterface?.extends).toContain('TestInterface');
  });

  it('extracts import declarations', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    expect(result.structure.imports.length).toBeGreaterThan(0);

    // Find the import from TestService to TestInterface
    const serviceImports = result.structure.imports.filter(
      imp => imp.file.includes('TestService.ts')
    );
    expect(serviceImports.length).toBeGreaterThan(0);

    const testInterfaceImport = serviceImports.find(
      imp => imp.namedImports.includes('TestInterface')
    );
    expect(testInterfaceImport).toBeDefined();
    expect(testInterfaceImport?.moduleSpecifier).toBe('../types/TestInterface');
  });

  it('detects technologies from package.json', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    expect(result.technologies).toContain('React');
    expect(result.technologies).toContain('Electron');
    expect(result.technologies).toContain('TypeScript');
    expect(result.technologies).toContain('Zustand');
    expect(result.technologies).toContain('Vitest');
  });

  it('finds entry points', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    expect(result.entryPoints.length).toBeGreaterThan(0);
    expect(result.entryPoints.some(ep => ep.includes('main.ts'))).toBe(true);
  });

  it('builds dependency graph', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    expect(result.dependencies.nodes.length).toBeGreaterThan(0);
    expect(result.dependencies.edges.length).toBeGreaterThan(0);

    // Verify nodes contain classes and interfaces
    const classNodes = result.dependencies.nodes.filter(n => n.type === 'class');
    expect(classNodes.length).toBe(3);

    const interfaceNodes = result.dependencies.nodes.filter(n => n.type === 'interface');
    expect(interfaceNodes.length).toBe(2);

    // Verify edges contain import relationships
    const edges = result.dependencies.edges;
    expect(edges.some(e => e.from.includes('TestService.ts'))).toBe(true);
  });

  it('handles missing tsconfig.json gracefully', async () => {
    const nonExistentPath = '/path/that/does/not/exist';
    const result = await analyzer.analyzeProject(nonExistentPath);

    expect(result.error).toBeDefined();
    expect(result.structure.classes).toHaveLength(0);
    expect(result.structure.interfaces).toHaveLength(0);
    expect(result.metadata.filesAnalyzed).toBe(0);
  });

  it('skips node_modules files', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    // Verify no files from node_modules are analyzed
    const allFiles = [
      ...result.structure.classes.map(c => c.file),
      ...result.structure.interfaces.map(i => i.file),
    ];

    expect(allFiles.every(f => !f.includes('node_modules'))).toBe(true);
  });

  it('provides accurate metadata', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    expect(result.metadata.filesAnalyzed).toBeGreaterThan(0);
    expect(result.metadata.totalFiles).toBeGreaterThan(0);
    expect(result.metadata.timestamp).toBeDefined();
    expect(result.metadata.duration).toBeGreaterThan(0);
  });

  it('handles maxFiles option', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath, { maxFiles: 1 });

    expect(result.error).toBeUndefined();
    expect(result.metadata.filesAnalyzed).toBe(1);
    expect(result.metadata.totalFiles).toBeGreaterThan(1);
  });

  it('handles includeTests option', async () => {
    const resultWithoutTests = await analyzer.analyzeProject(fixtureRepoPath, {
      includeTests: false,
    });

    const resultWithTests = await analyzer.analyzeProject(fixtureRepoPath, {
      includeTests: true,
    });

    // Both should work without error
    expect(resultWithoutTests.error).toBeUndefined();
    expect(resultWithTests.error).toBeUndefined();
  });

  // --- New enrichment tests (Task 1 & 2) ---

  it('AnalysisResult.structure has a functions array', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    expect(result.structure.functions).toBeDefined();
    expect(Array.isArray(result.structure.functions)).toBe(true);
  });

  it('FunctionInfo has required fields', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    const functions: FunctionInfo[] = result.structure.functions;
    expect(functions.length).toBeGreaterThan(0);

    const fn = functions[0];
    expect(fn).toHaveProperty('name');
    expect(fn).toHaveProperty('file');
    expect(fn).toHaveProperty('returnType');
    expect(fn).toHaveProperty('isAsync');
    expect(fn).toHaveProperty('isExported');
    expect(fn).toHaveProperty('isSignificant');
  });

  it('ClassInfo has decorators and description fields', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    const decoratedClass = result.structure.classes.find(c => c.name === 'DecoratedService');
    expect(decoratedClass).toBeDefined();
    expect(decoratedClass).toHaveProperty('decorators');
    expect(decoratedClass).toHaveProperty('description');
  });

  it('AnalysisResult.metadata has analysisQuality field', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    expect(result.metadata).toHaveProperty('analysisQuality');
    expect(result.metadata.analysisQuality).toBe('full-ast');
  });

  it('extracts decorators from classes', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    const decoratedService = result.structure.classes.find(c => c.name === 'DecoratedService');
    expect(decoratedService).toBeDefined();
    expect(decoratedService?.decorators).toContain('Injectable');
  });

  it('extracts JSDoc descriptions from classes', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    const decoratedService = result.structure.classes.find(c => c.name === 'DecoratedService');
    expect(decoratedService).toBeDefined();
    expect(typeof decoratedService?.description).toBe('string');
    expect(decoratedService?.description).not.toBe('');
  });

  it('extracts exported functions', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    const fnNames = result.structure.functions.map(f => f.name);
    expect(fnNames).toContain('useTestHook');
    expect(fnNames).toContain('formatValue');
  });

  it('classifies function significance correctly', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    const useTestHook = result.structure.functions.find(f => f.name === 'useTestHook');
    expect(useTestHook).toBeDefined();
    expect(useTestHook?.isSignificant).toBe(true);

    const formatValue = result.structure.functions.find(f => f.name === 'formatValue');
    expect(formatValue).toBeDefined();
    expect(formatValue?.isSignificant).toBe(false);
  });

  it('extracts function return types', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    const useTestHook = result.structure.functions.find(f => f.name === 'useTestHook');
    expect(useTestHook).toBeDefined();
    expect(useTestHook?.returnType).toBeDefined();
    expect(useTestHook?.returnType.length).toBeGreaterThan(0);
  });

  it('includes analysisQuality in metadata', async () => {
    const result = await analyzer.analyzeProject(fixtureRepoPath);

    expect(result.error).toBeUndefined();
    expect(result.metadata.analysisQuality).toBe('full-ast');
  });
});
