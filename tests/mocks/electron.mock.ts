import { vi } from 'vitest';

export const mockElectronApp = {
  getPath: vi.fn((name: string) => {
    if (name === 'userData') return '/tmp/test-user-data';
    return '/tmp/test';
  }),
};

export const mockElectronStore = {
  get: vi.fn(),
  set: vi.fn(),
};

// Export default mock setup function
export function setupElectronMocks() {
  vi.mock('electron', () => ({
    app: mockElectronApp,
  }));
}
