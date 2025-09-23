import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Electron APIs
const mockElectronAPI = {
  // Git operations
  getRepositoryStatus: vi.fn(),
  cloneRepository: vi.fn(),
  fetchRepository: vi.fn(),
  pullRepository: vi.fn(),
  
  // File system operations
  selectDirectory: vi.fn(),
  openFileExplorer: vi.fn(),
  
  // GitHub operations
  authenticateGitHub: vi.fn(),
  getUserRepositories: vi.fn(),
  
  // Window operations
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
  
  // Store operations
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
};

// Make electronAPI available globally for tests
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock IntersectionObserver for components that might use it
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for components that might use it
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});