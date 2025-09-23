import { describe, test, expect } from 'vitest';
import { loadConfig } from 'vitest/config';

describe('Vitest Main Process Configuration Integration', () => {
  test('vitest.config.main.ts should load without errors', async () => {
    try {
      const config = await loadConfig({}, 'vitest.config.main.ts');
      expect(config).toBeDefined();
      expect(config.config).toBeDefined();
    } catch (error) {
      expect.fail(`Vitest main config failed to load: ${error}`);
    }
  });

  test('main config should use node environment', async () => {
    const config = await loadConfig({}, 'vitest.config.main.ts');
    expect(config.config.test?.environment).toBe('node');
  });

  test('main config should target main process test files only', async () => {
    const config = await loadConfig({}, 'vitest.config.main.ts');
    const include = config.config.test?.include;
    
    expect(include).toBeDefined();
    expect(include).toEqual(['tests/unit/main/**/*.test.ts']);
  });

  test('main config should have path aliases configured', async () => {
    const config = await loadConfig({}, 'vitest.config.main.ts');
    const aliases = config.config.resolve?.alias as Record<string, string>;
    
    expect(aliases).toBeDefined();
    expect(aliases['@']).toContain('/src');
    expect(aliases['@main']).toContain('/src/main');
    expect(aliases['@shared']).toContain('/src/shared');
  });

  test('main config should exclude renderer files from coverage', async () => {
    const config = await loadConfig({}, 'vitest.config.main.ts');
    const coverage = config.config.test?.coverage;
    
    expect(coverage).toBeDefined();
    expect(coverage?.exclude).toEqual(
      expect.arrayContaining(['src/renderer/'])
    );
  });

  test('main config should have appropriate esbuild target', async () => {
    const config = await loadConfig({}, 'vitest.config.main.ts');
    expect(config.config.esbuild?.target).toBe('node16');
  });
});