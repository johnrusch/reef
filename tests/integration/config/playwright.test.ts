import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Playwright Configuration Integration', () => {
  test('playwright.config.ts should exist and be valid', () => {
    try {
      const configPath = resolve(process.cwd(), 'playwright.config.ts');
      const configContent = readFileSync(configPath, 'utf-8');
      expect(configContent).toContain('defineConfig');
      expect(configContent).toContain('testDir');
    } catch (error) {
      expect.fail(`Playwright config file not found or invalid: ${error}`);
    }
  });

  test('playwright config should target E2E test directory', async () => {
    const configPath = resolve(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    expect(configContent).toContain('./tests/e2e');
  });

  test('playwright config should have Electron project configuration', async () => {
    const configPath = resolve(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    expect(configContent).toContain('electron');
  });

  test('playwright config should have appropriate timeout settings', async () => {
    const configPath = resolve(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    expect(configContent).toMatch(/timeout.*30000/);
  });

  test('playwright config should enable screenshots on failure', async () => {
    const configPath = resolve(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    expect(configContent).toContain('screenshot');
    expect(configContent).toContain('only-on-failure');
  });

  test('playwright config should have web server configuration', async () => {
    const configPath = resolve(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    expect(configContent).toContain('webServer');
    expect(configContent).toContain('npm run build');
  });
});