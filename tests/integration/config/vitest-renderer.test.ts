import { describe, test, expect } from 'vitest';
import { loadConfig } from 'vitest/config';

describe('Vitest Renderer Configuration Integration', () => {
  test('vitest.config.ts should load without errors', async () => {
    try {
      const config = await loadConfig({}, 'vitest.config.ts');
      expect(config).toBeDefined();
      expect(config.config).toBeDefined();
    } catch (error) {
      expect.fail(`Vitest renderer config failed to load: ${error}`);
    }
  });

  test('renderer config should use jsdom environment', async () => {
    const config = await loadConfig({}, 'vitest.config.ts');
    expect(config.config.test?.environment).toBe('jsdom');
  });

  test('renderer config should include React testing setup', async () => {
    const config = await loadConfig({}, 'vitest.config.ts');
    expect(config.config.test?.setupFiles).toContain('./tests/setup.ts');
  });

  test('renderer config should have path aliases configured', async () => {
    const config = await loadConfig({}, 'vitest.config.ts');
    const aliases = config.config.resolve?.alias as Record<string, string>;
    
    expect(aliases).toBeDefined();
    expect(aliases['@']).toContain('/src');
    expect(aliases['@renderer']).toContain('/src/renderer');
    expect(aliases['@main']).toContain('/src/main');
    expect(aliases['@shared']).toContain('/src/shared');
  });

  test('renderer config should target correct test files', async () => {
    const config = await loadConfig({}, 'vitest.config.ts');
    const include = config.config.test?.include;
    
    expect(include).toBeDefined();
    expect(include).toEqual(
      expect.arrayContaining([
        expect.stringContaining('tests/unit/renderer'),
        expect.stringContaining('tests/integration')
      ])
    );
  });

  test('renderer config should have coverage configuration', async () => {
    const config = await loadConfig({}, 'vitest.config.ts');
    const coverage = config.config.test?.coverage;
    
    expect(coverage).toBeDefined();
    expect(coverage?.provider).toBe('c8');
    expect(coverage?.reporter).toEqual(expect.arrayContaining(['text', 'html', 'json']));
    expect(coverage?.exclude).toEqual(
      expect.arrayContaining(['node_modules/', 'dist/', 'tests/'])
    );
  });
});