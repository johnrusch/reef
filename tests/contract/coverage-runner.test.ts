import { describe, test, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

describe('Coverage Runner Contract', () => {
  test('npm run test:coverage command should exist', async () => {
    try {
      const { stdout } = await execAsync('npm run test:coverage --dry-run');
      expect(stdout).toContain('coverage');
    } catch (error) {
      expect.fail(`test:coverage command not configured: ${error}`);
    }
  });

  test('coverage should generate HTML report', async () => {
    try {
      await execAsync('npm run test:coverage');
      
      // Check if coverage directory was created
      expect(existsSync('coverage')).toBe(true);
      expect(existsSync('coverage/index.html')).toBe(true);
    } catch (error: any) {
      // Expected to fail initially - no tests to generate coverage from
      expect.fail('No tests to generate coverage from - this failure is expected in TDD');
    }
  }, 30000);

  test('coverage should enforce minimum thresholds', async () => {
    try {
      const { stdout, stderr } = await execAsync('npm run test:coverage');
      
      // Should contain coverage metrics
      expect(stdout + stderr).toMatch(/statements.*%/i);
      expect(stdout + stderr).toMatch(/branches.*%/i);
      expect(stdout + stderr).toMatch(/functions.*%/i);
      expect(stdout + stderr).toMatch(/lines.*%/i);
    } catch (error: any) {
      // Check if it's a threshold failure (which would be good) or no tests
      if (error.stdout && error.stdout.includes('Coverage threshold')) {
        // This means coverage is working but thresholds not met - good!
        expect(true).toBe(true);
      } else {
        // No tests exist yet
        expect.fail('No tests to generate coverage from - this failure is expected in TDD');
      }
    }
  }, 30000);

  test('coverage should exclude test files and node_modules', async () => {
    try {
      const { stdout } = await execAsync('npm run test:coverage');
      
      // Coverage should not include test files themselves
      expect(stdout).not.toContain('tests/');
      expect(stdout).not.toContain('node_modules/');
    } catch (error: any) {
      // Expected to fail initially
      expect.fail('No tests to generate coverage from - this failure is expected in TDD');
    }
  }, 30000);
});