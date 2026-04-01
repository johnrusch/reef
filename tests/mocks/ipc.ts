import { vi } from 'vitest';

// Mock IPC channel types
export type IPCChannel = 
  | 'git:status'
  | 'git:clone'
  | 'git:fetch'
  | 'git:pull'
  | 'git:push'
  | 'git:commit'
  | 'git:branch'
  | 'git:checkout'
  | 'github:auth'
  | 'github:repos'
  | 'github:user'
  | 'file:select-directory'
  | 'file:read'
  | 'file:write'
  | 'window:minimize'
  | 'window:maximize'
  | 'window:close'
  | 'settings:get'
  | 'settings:set'
  | 'workspace:load'
  | 'workspace:save'
  | 'database:query'
  | 'database:insert'
  | 'database:update'
  | 'database:delete';

// Mock IPC responses for different channels
export const mockIPCResponses: Record<IPCChannel, any> = {
  'git:status': {
    success: true,
    data: {
      files: [
        { path: 'src/component.ts', status: 'M' },
        { path: 'tests/component.test.ts', status: 'A' },
      ],
      ahead: 2,
      behind: 1,
      current: 'main',
      tracking: 'origin/main',
    },
  },

  'git:clone': {
    success: true,
    data: {
      message: 'Repository cloned successfully',
      path: '/path/to/cloned/repo',
    },
  },

  'git:fetch': {
    success: true,
    data: {
      message: 'Fetch completed',
      branches: ['main', 'develop'],
    },
  },

  'git:pull': {
    success: true,
    data: {
      message: 'Pull completed',
      changes: 5,
      insertions: 25,
      deletions: 3,
    },
  },

  'git:push': {
    success: true,
    data: {
      message: 'Push completed',
      pushed: ['main'],
    },
  },

  'git:commit': {
    success: true,
    data: {
      message: 'Commit created',
      hash: 'abc123def456',
      summary: {
        changes: 2,
        insertions: 15,
        deletions: 2,
      },
    },
  },

  'git:branch': {
    success: true,
    data: {
      current: 'main',
      all: ['main', 'develop', 'feature/test'],
      branches: {
        main: { current: true, commit: 'abc123' },
        develop: { current: false, commit: 'def456' },
        'feature/test': { current: false, commit: 'ghi789' },
      },
    },
  },

  'git:checkout': {
    success: true,
    data: {
      message: 'Switched to branch',
      branch: 'develop',
    },
  },

  'github:auth': {
    success: true,
    data: {
      token: 'gho_test_token_12345',
      user: {
        login: 'testuser',
        id: 12345,
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      },
    },
  },

  'github:repos': {
    success: true,
    data: [
      {
        id: 1,
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        description: 'A test repository',
        clone_url: 'https://github.com/testuser/test-repo.git',
        ssh_url: 'git@github.com:testuser/test-repo.git',
        stargazers_count: 50,
        forks_count: 10,
        updated_at: '2023-01-01T12:00:00Z',
      },
      {
        id: 2,
        name: 'another-repo',
        full_name: 'testuser/another-repo',
        description: 'Another test repository',
        clone_url: 'https://github.com/testuser/another-repo.git',
        ssh_url: 'git@github.com:testuser/another-repo.git',
        stargazers_count: 25,
        forks_count: 5,
        updated_at: '2023-01-02T08:00:00Z',
      },
    ],
  },

  'github:user': {
    success: true,
    data: {
      login: 'testuser',
      id: 12345,
      avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      name: 'Test User',
      email: 'test@example.com',
      public_repos: 25,
      followers: 100,
      following: 50,
    },
  },

  'file:select-directory': {
    success: true,
    data: {
      path: '/selected/directory/path',
      canceled: false,
    },
  },

  'file:read': {
    success: true,
    data: {
      content: 'File content goes here',
      encoding: 'utf8',
    },
  },

  'file:write': {
    success: true,
    data: {
      message: 'File written successfully',
      bytesWritten: 1024,
    },
  },

  'window:minimize': {
    success: true,
    data: { message: 'Window minimized' },
  },

  'window:maximize': {
    success: true,
    data: { message: 'Window maximized' },
  },

  'window:close': {
    success: true,
    data: { message: 'Window closed' },
  },

  'settings:get': {
    success: true,
    data: {
      theme: 'dark',
      autoFetch: true,
      defaultCloneDirectory: '/Users/test/Projects',
      gitPath: '/usr/bin/git',
    },
  },

  'settings:set': {
    success: true,
    data: { message: 'Settings saved successfully' },
  },

  'workspace:load': {
    success: true,
    data: {
      id: 'workspace-1',
      name: 'Main Workspace',
      repositories: [
        {
          id: 'repo-1',
          path: '/path/to/repo1',
          name: 'repo1',
        },
        {
          id: 'repo-2',
          path: '/path/to/repo2',
          name: 'repo2',
        },
      ],
      settings: {
        autoRefresh: true,
        refreshInterval: 30000,
      },
    },
  },

  'workspace:save': {
    success: true,
    data: { message: 'Workspace saved successfully' },
  },

  'database:query': {
    success: true,
    data: [
      { id: 1, name: 'Record 1', value: 'Value 1' },
      { id: 2, name: 'Record 2', value: 'Value 2' },
    ],
  },

  'database:insert': {
    success: true,
    data: {
      id: 3,
      message: 'Record inserted successfully',
    },
  },

  'database:update': {
    success: true,
    data: {
      message: 'Record updated successfully',
      rowsAffected: 1,
    },
  },

  'database:delete': {
    success: true,
    data: {
      message: 'Record deleted successfully',
      rowsAffected: 1,
    },
  },
};

// Mock error responses
export const mockIPCErrors: Record<string, any> = {
  unauthorized: {
    success: false,
    error: 'Unauthorized access',
    code: 'AUTH_ERROR',
  },
  
  notFound: {
    success: false,
    error: 'Resource not found',
    code: 'NOT_FOUND',
  },
  
  networkError: {
    success: false,
    error: 'Network connection failed',
    code: 'NETWORK_ERROR',
  },
  
  gitError: {
    success: false,
    error: 'Git operation failed',
    code: 'GIT_ERROR',
    details: 'Repository is not a git repository',
  },
  
  fileSystemError: {
    success: false,
    error: 'File system operation failed',
    code: 'FS_ERROR',
    details: 'Permission denied',
  },
  
  databaseError: {
    success: false,
    error: 'Database operation failed',
    code: 'DB_ERROR',
    details: 'Connection timeout',
  },
};

// Mock IPC main process
export const mockIPCMain = {
  handle: vi.fn(),
  handleOnce: vi.fn(),
  removeHandler: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
  emit: vi.fn(),
  eventNames: vi.fn().mockReturnValue([]),
  listenerCount: vi.fn().mockReturnValue(0),
  listeners: vi.fn().mockReturnValue([]),
  rawListeners: vi.fn().mockReturnValue([]),
  setMaxListeners: vi.fn(),
  getMaxListeners: vi.fn().mockReturnValue(10),
  prependListener: vi.fn(),
  prependOnceListener: vi.fn(),
  off: vi.fn(),
};

// Mock IPC renderer process
export const mockIPCRenderer = {
  invoke: vi.fn(),
  send: vi.fn(),
  sendSync: vi.fn(),
  sendTo: vi.fn(),
  sendToHost: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
  postMessage: vi.fn(),
  eventNames: vi.fn().mockReturnValue([]),
  listenerCount: vi.fn().mockReturnValue(0),
  listeners: vi.fn().mockReturnValue([]),
  rawListeners: vi.fn().mockReturnValue([]),
  setMaxListeners: vi.fn(),
  getMaxListeners: vi.fn().mockReturnValue(10),
  prependListener: vi.fn(),
  prependOnceListener: vi.fn(),
  off: vi.fn(),
};

// Setup default invoke handler
mockIPCRenderer.invoke.mockImplementation((channel: IPCChannel, ...args: any[]) => {
  const response = mockIPCResponses[channel];
  if (response) {
    return Promise.resolve(response);
  }
  return Promise.reject(new Error(`Unknown IPC channel: ${channel}`));
});

// Mock WebContents for main process tests
export const mockWebContents = {
  send: vi.fn(),
  sendToFrame: vi.fn(),
  postMessage: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
  executeJavaScript: vi.fn().mockResolvedValue(undefined),
  insertCSS: vi.fn().mockResolvedValue(''),
  removeInsertedCSS: vi.fn(),
  openDevTools: vi.fn(),
  closeDevTools: vi.fn(),
  isDevToolsOpened: vi.fn().mockReturnValue(false),
  setWindowOpenHandler: vi.fn(),
  setUserAgent: vi.fn(),
  getUserAgent: vi.fn().mockReturnValue('test-user-agent'),
  session: {
    cookies: {
      get: vi.fn().mockResolvedValue([]),
      set: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue(),
    },
    clearStorageData: vi.fn().mockResolvedValue(),
  },
};

// Helper functions for test scenarios
export const setupIPCMocks = () => {
  // Setup main process mocks
  mockIPCMain.handle.mockImplementation((channel: IPCChannel, _handler: (...args: unknown[]) => unknown) => {
    // Store the handler for testing purposes
    return;
  });

  // Setup renderer process mocks
  mockIPCRenderer.invoke.mockImplementation((channel: IPCChannel, ...args: any[]) => {
    const response = mockIPCResponses[channel];
    if (response) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`Unknown IPC channel: ${channel}`));
  });

  return {
    mockIPCMain,
    mockIPCRenderer,
    mockWebContents,
  };
};

export const createIPCErrorMock = (channel: IPCChannel, errorType: keyof typeof mockIPCErrors) => {
  mockIPCRenderer.invoke.mockImplementation((ch: IPCChannel, ...args: any[]) => {
    if (ch === channel) {
      return Promise.reject(mockIPCErrors[errorType]);
    }
    const response = mockIPCResponses[ch];
    if (response) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`Unknown IPC channel: ${ch}`));
  });
};

export const createIPCTimeoutMock = (channel: IPCChannel, timeoutMs: number = 5000) => {
  mockIPCRenderer.invoke.mockImplementation((ch: IPCChannel, ...args: any[]) => {
    if (ch === channel) {
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`IPC call to ${channel} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });
    }
    const response = mockIPCResponses[ch];
    if (response) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`Unknown IPC channel: ${ch}`));
  });
};

export const createIPCDelayMock = (channel: IPCChannel, delayMs: number = 1000) => {
  mockIPCRenderer.invoke.mockImplementation((ch: IPCChannel, ...args: any[]) => {
    if (ch === channel) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockIPCResponses[ch]);
        }, delayMs);
      });
    }
    const response = mockIPCResponses[ch];
    if (response) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`Unknown IPC channel: ${ch}`));
  });
};

export const createCustomIPCResponse = (channel: IPCChannel, customResponse: any) => {
  const originalImplementation = mockIPCRenderer.invoke.getMockImplementation();
  
  mockIPCRenderer.invoke.mockImplementation((ch: IPCChannel, ...args: any[]) => {
    if (ch === channel) {
      return Promise.resolve(customResponse);
    }
    return originalImplementation ? originalImplementation(ch, ...args) : Promise.reject(new Error(`Unknown IPC channel: ${ch}`));
  });
};

// Event emitter helpers
export const emitIPCEvent = (channel: string, ...args: any[]) => {
  const listeners = mockIPCRenderer.listeners(channel);
  listeners.forEach(listener => {
    if (typeof listener === 'function') {
      listener(...args);
    }
  });
};

export const emitMainProcessEvent = (channel: string, ...args: any[]) => {
  const listeners = mockIPCMain.listeners(channel);
  listeners.forEach(listener => {
    if (typeof listener === 'function') {
      listener(...args);
    }
  });
};

// Reset all IPC mocks
export const resetIPCMocks = () => {
  Object.values(mockIPCMain).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear();
    }
  });

  Object.values(mockIPCRenderer).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear();
    }
  });

  Object.values(mockWebContents).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear();
    }
  });

  // Restore default invoke implementation
  mockIPCRenderer.invoke.mockImplementation((channel: IPCChannel, ...args: any[]) => {
    const response = mockIPCResponses[channel];
    if (response) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`Unknown IPC channel: ${channel}`));
  });
};

// Integration test helpers
export const createIPCIntegrationTest = (
  mainHandler: (channel: string, handler: (...args: unknown[]) => unknown) => void,
  rendererInvoke: (channel: string, ...args: any[]) => Promise<any>
) => {
  const testChannel = 'test:integration' as IPCChannel;
  
  return {
    setupHandler: (handler: (...args: unknown[]) => unknown) => {
      mainHandler(testChannel, handler);
    },
    invoke: (...args: any[]) => {
      return rendererInvoke(testChannel, ...args);
    },
    cleanup: () => {
      mockIPCMain.removeHandler(testChannel);
    },
  };
};

// Export types and constants
export type { IPCChannel };
export { mockIPCResponses, mockIPCErrors };