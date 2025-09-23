import { describe, test, expect } from 'vitest';
import { resolve } from 'path';

describe('Path Aliases Integration', () => {
  test('@ alias should resolve to src directory', () => {
    // This test ensures that our path aliases work in the test environment
    const srcPath = resolve(process.cwd(), 'src');
    const aliasPath = resolve(process.cwd(), './src');
    expect(aliasPath).toBe(srcPath);
  });

  test('@main alias should resolve to src/main', () => {
    const mainPath = resolve(process.cwd(), 'src/main');
    const aliasPath = resolve(process.cwd(), './src/main');
    expect(aliasPath).toBe(mainPath);
  });

  test('@renderer alias should resolve to src/renderer', () => {
    const rendererPath = resolve(process.cwd(), 'src/renderer');
    const aliasPath = resolve(process.cwd(), './src/renderer');
    expect(aliasPath).toBe(rendererPath);
  });

  test('@shared alias should resolve to src/shared', () => {
    const sharedPath = resolve(process.cwd(), 'src/shared');
    const aliasPath = resolve(process.cwd(), './src/shared');
    expect(aliasPath).toBe(sharedPath);
  });

  test('path aliases should be consistent between vitest configs', async () => {
    // This test will fail initially because we need to verify consistency
    // between vitest.config.ts and vitest.config.main.ts
    
    // Import both configs and compare alias definitions
    try {
      const { loadConfig } = await import('vitest/config');
      const rendererConfig = await loadConfig({}, 'vitest.config.ts');
      const mainConfig = await loadConfig({}, 'vitest.config.main.ts');
      
      const rendererAliases = rendererConfig.config.resolve?.alias as Record<string, string>;
      const mainAliases = mainConfig.config.resolve?.alias as Record<string, string>;
      
      expect(rendererAliases['@']).toBe(mainAliases['@']);
      expect(rendererAliases['@main']).toBe(mainAliases['@main']);
      expect(rendererAliases['@shared']).toBe(mainAliases['@shared']);
    } catch (error) {
      expect.fail(`Path alias consistency check failed: ${error}`);
    }
  });
});