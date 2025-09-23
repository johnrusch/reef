import { vi } from 'vitest';

// Mock Electron main process APIs
export const mockElectronMain = {
  app: {
    quit: vi.fn(),
    getPath: vi.fn().mockReturnValue('/mock/path'),
    whenReady: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    dock: {
      setIcon: vi.fn(),
      setBadge: vi.fn(),
    },
  },
  
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadFile: vi.fn(),
    loadURL: vi.fn(),
    on: vi.fn(),
    webContents: {
      openDevTools: vi.fn(),
      send: vi.fn(),
      on: vi.fn(),
    },
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    isMaximized: vi.fn().mockReturnValue(false),
    setTitle: vi.fn(),
    setSize: vi.fn(),
    getSize: vi.fn().mockReturnValue([1200, 800]),
    center: vi.fn(),
  })),

  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },

  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: ['/mock/selected/path'],
    }),
    showSaveDialog: vi.fn().mockResolvedValue({
      canceled: false,
      filePath: '/mock/save/path',
    }),
    showMessageBox: vi.fn().mockResolvedValue({
      response: 0,
    }),
    showErrorBox: vi.fn(),
  },

  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
    openPath: vi.fn().mockResolvedValue(''),
    showItemInFolder: vi.fn(),
  },

  Menu: {
    setApplicationMenu: vi.fn(),
    buildFromTemplate: vi.fn().mockReturnValue({
      popup: vi.fn(),
    }),
  },

  MenuItem: vi.fn(),

  Notification: vi.fn().mockImplementation(() => ({
    show: vi.fn(),
    on: vi.fn(),
  })),

  nativeTheme: {
    shouldUseDarkColors: false,
    on: vi.fn(),
  },

  screen: {
    getPrimaryDisplay: vi.fn().mockReturnValue({
      workAreaSize: { width: 1920, height: 1080 },
    }),
    getAllDisplays: vi.fn().mockReturnValue([]),
    on: vi.fn(),
  },
};

// Mock Electron renderer process APIs
export const mockElectronRenderer = {
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    postMessage: vi.fn(),
  },

  webFrame: {
    setZoomLevel: vi.fn(),
    getZoomLevel: vi.fn().mockReturnValue(0),
    setZoomFactor: vi.fn(),
    getZoomFactor: vi.fn().mockReturnValue(1),
  },

  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },

  clipboard: {
    writeText: vi.fn(),
    readText: vi.fn().mockReturnValue(''),
    writeHTML: vi.fn(),
    readHTML: vi.fn().mockReturnValue(''),
    writeImage: vi.fn(),
    readImage: vi.fn(),
    clear: vi.fn(),
  },

  crashReporter: {
    start: vi.fn(),
  },
};

// Mock electron-store
export const mockElectronStore = vi.fn().mockImplementation(() => ({
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn().mockReturnValue(false),
  delete: vi.fn(),
  clear: vi.fn(),
  size: 0,
  store: {},
  path: '/mock/store/path',
  onDidChange: vi.fn(),
  onDidAnyChange: vi.fn(),
}));

// Mock preload API that gets exposed to renderer
export const mockElectronAPI = {
  // Git operations
  getRepositoryStatus: vi.fn().mockResolvedValue({
    files: [],
    ahead: 0,
    behind: 0,
    current: 'main',
    tracking: 'origin/main',
  }),
  cloneRepository: vi.fn().mockResolvedValue({ success: true }),
  fetchRepository: vi.fn().mockResolvedValue({ success: true }),
  pullRepository: vi.fn().mockResolvedValue({ success: true }),
  pushRepository: vi.fn().mockResolvedValue({ success: true }),
  commitChanges: vi.fn().mockResolvedValue({ success: true }),
  createBranch: vi.fn().mockResolvedValue({ success: true }),
  switchBranch: vi.fn().mockResolvedValue({ success: true }),
  mergeBranch: vi.fn().mockResolvedValue({ success: true }),

  // File system operations
  selectDirectory: vi.fn().mockResolvedValue('/mock/selected/directory'),
  openFileExplorer: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('file contents'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  fileExists: vi.fn().mockResolvedValue(true),
  createDirectory: vi.fn().mockResolvedValue(undefined),

  // GitHub operations
  authenticateGitHub: vi.fn().mockResolvedValue({
    success: true,
    token: 'mock-token',
  }),
  getUserRepositories: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'test-repo',
      full_name: 'testuser/test-repo',
      clone_url: 'https://github.com/testuser/test-repo.git',
    },
  ]),
  getRepositoryDetails: vi.fn().mockResolvedValue({
    id: 1,
    name: 'test-repo',
    description: 'Test repository',
    stargazers_count: 10,
  }),

  // Window operations
  minimizeWindow: vi.fn().mockResolvedValue(undefined),
  maximizeWindow: vi.fn().mockResolvedValue(undefined),
  closeWindow: vi.fn().mockResolvedValue(undefined),
  restoreWindow: vi.fn().mockResolvedValue(undefined),
  toggleDevTools: vi.fn().mockResolvedValue(undefined),

  // Store operations
  getSettings: vi.fn().mockResolvedValue({}),
  saveSettings: vi.fn().mockResolvedValue(undefined),
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),

  // Workspace operations
  getWorkspaces: vi.fn().mockResolvedValue([]),
  saveWorkspace: vi.fn().mockResolvedValue(undefined),
  deleteWorkspace: vi.fn().mockResolvedValue(undefined),

  // Database operations
  initializeDatabase: vi.fn().mockResolvedValue(undefined),
  executeQuery: vi.fn().mockResolvedValue([]),
  insertRecord: vi.fn().mockResolvedValue({ id: 1 }),
  updateRecord: vi.fn().mockResolvedValue(undefined),
  deleteRecord: vi.fn().mockResolvedValue(undefined),

  // Notification operations
  showNotification: vi.fn().mockResolvedValue(undefined),
  showErrorDialog: vi.fn().mockResolvedValue(undefined),
  showConfirmDialog: vi.fn().mockResolvedValue(true),

  // System operations
  getSystemInfo: vi.fn().mockResolvedValue({
    platform: 'darwin',
    arch: 'x64',
    version: '10.15.7',
  }),
  openExternal: vi.fn().mockResolvedValue(undefined),
  showInFolder: vi.fn().mockResolvedValue(undefined),

  // Event handlers
  onRepositoryChange: vi.fn(),
  onSettingsChange: vi.fn(),
  onWindowFocus: vi.fn(),
  onWindowBlur: vi.fn(),
  removeAllListeners: vi.fn(),
};

// Helper to reset all mocks
export const resetElectronMocks = () => {
  Object.values(mockElectronMain).forEach(mockObj => {
    if (typeof mockObj === 'object' && mockObj !== null) {
      Object.values(mockObj).forEach(mock => {
        if (vi.isMockFunction(mock)) {
          mock.mockClear();
        }
      });
    }
  });

  Object.values(mockElectronRenderer).forEach(mockObj => {
    if (typeof mockObj === 'object' && mockObj !== null) {
      Object.values(mockObj).forEach(mock => {
        if (vi.isMockFunction(mock)) {
          mock.mockClear();
        }
      });
    }
  });

  Object.values(mockElectronAPI).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};

// Setup function for tests
export const setupElectronMocks = () => {
  // Mock the electron module for main process tests
  vi.mock('electron', () => mockElectronMain);
  
  // Mock electron-store
  vi.mock('electron-store', () => ({
    default: mockElectronStore,
  }));

  // Make electronAPI available globally for renderer tests
  if (typeof global !== 'undefined') {
    (global as any).electronAPI = mockElectronAPI;
  }
  
  if (typeof window !== 'undefined') {
    (window as any).electronAPI = mockElectronAPI;
  }

  return {
    mockElectronMain,
    mockElectronRenderer,
    mockElectronAPI,
    mockElectronStore,
  };
};