import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import GitService from './services/gitService';
import GitHubService from './services/githubService';
import './services/diagramGeneratorService';
import './services/contextExtractorService';
// Phase 2 services
import './services/cacheService';
import './services/tokenCounterService';
import './services/rateLimiterService';
import './services/contextExtractorServiceV2';
import './services/diagramGeneratorServiceV2';
// Import for side effects - registers IPC handlers
import './services/plantUmlService';
import './services/diagramSettingsService';
import { initializeFileWatcherService, getFileWatcherService } from './services/fileWatcherService';
import { C4CacheService } from './services/c4/c4CacheService';
import type { C4Level } from './services/c4/types/c4Types';

const appPath = app.getAppPath();
const isDev = process.env.NODE_ENV === 'development';

const store = new Store();

// Initialize services
new GitService();
new GitHubService();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(appPath, 'dist/preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1e1e1e',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(appPath, 'dist/renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Reef',
      submenu: [
        {
          label: 'About Reef',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-about');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-preferences');
            }
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Add Repository',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('add-repository');
            }
          },
        },
        {
          label: 'Clone Repository',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('clone-repository');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'New Workspace',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('new-workspace');
            }
          },
        },
        {
          label: 'Open Workspace',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-workspace');
            }
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Repository',
      submenu: [
        {
          label: 'Fetch All',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('fetch-all');
            }
          },
        },
        {
          label: 'Pull All',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('pull-all');
            }
          },
        },
        {
          label: 'Push All',
          accelerator: 'CmdOrCtrl+Shift+U',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('push-all');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Commit All',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('commit-all');
            }
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(process.platform === 'darwin'
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/reef-app/reef/wiki');
          },
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/reef-app/reef/issues');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  // Initialize file watcher service with cache service
  const cacheService = new C4CacheService();
  initializeFileWatcherService(cacheService);

  createWindow();
});

app.on('before-quit', () => {
  const fileWatcherService = getFileWatcherService();
  if (fileWatcherService) {
    fileWatcherService.stopAllWatchers();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('get-store', (_, key: string) => {
  return store.get(key);
});

ipcMain.handle('set-store', (_, key: string, value: any) => {
  store.set(key, value);
});

ipcMain.handle('delete-store', (_, key: string) => {
  store.delete(key);
});


ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('get-version', () => {
  return app.getVersion();
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Git Repository',
    buttonLabel: 'Select Repository',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// File watcher handlers
ipcMain.handle('fileWatcher:start', async (_, repoPath: string, level: string) => {
  try {
    const fileWatcherService = getFileWatcherService();
    if (fileWatcherService) {
      fileWatcherService.startWatching(repoPath, level as C4Level);
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    console.error('Error starting file watcher:', error);
    return { success: false };
  }
});

ipcMain.handle('fileWatcher:stop', async (_, repoPath: string, level: string) => {
  try {
    const fileWatcherService = getFileWatcherService();
    if (fileWatcherService) {
      fileWatcherService.stopWatching(repoPath, level as C4Level);
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    console.error('Error stopping file watcher:', error);
    return { success: false };
  }
});

ipcMain.handle('fileWatcher:checkStaleness', async (_, repoPath: string, level: string) => {
  try {
    const fileWatcherService = getFileWatcherService();
    if (fileWatcherService) {
      return fileWatcherService.checkStalenessOnStartup(repoPath, level as C4Level);
    }
    return false;
  } catch (error) {
    console.error('Error checking staleness:', error);
    return false;
  }
});

ipcMain.handle('cache:clearAll', async () => {
  try {
    const cacheService = new C4CacheService();
    cacheService.clearAllCache();
    return { success: true };
  } catch (error) {
    console.error('Error clearing cache:', error);
    return { success: false };
  }
});