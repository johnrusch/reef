import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export interface ReefAPI {
  store: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  platform: {
    get: () => Promise<NodeJS.Platform>;
  };
  app: {
    getVersion: () => Promise<string>;
  };
  git: {
    executeCommand: (repoPath: string, command: string[]) => Promise<string>;
    getRepositoryStatus: (repoPath: string) => Promise<any>;
  };
  github: {
    authenticate: (token: string) => Promise<boolean>;
    getUser: () => Promise<any>;
    getRepositories: () => Promise<any[]>;
    logout: () => Promise<boolean>;
    startOAuth: () => Promise<any>;
  };
  ipc: {
    on: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => void;
    off: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
  };
}

const reefAPI: ReefAPI = {
  store: {
    get: (key: string) => ipcRenderer.invoke('get-store', key),
    set: (key: string, value: any) => ipcRenderer.invoke('set-store', key, value),
    delete: (key: string) => ipcRenderer.invoke('delete-store', key),
  },
  platform: {
    get: () => ipcRenderer.invoke('get-platform'),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('get-version'),
  },
  git: {
    executeCommand: (repoPath: string, command: string[]) =>
      ipcRenderer.invoke('git-execute', repoPath, command),
    getRepositoryStatus: (repoPath: string) =>
      ipcRenderer.invoke('git-status', repoPath),
  },
  github: {
    authenticate: (token: string) => ipcRenderer.invoke('github-auth', token),
    getUser: () => ipcRenderer.invoke('github-user'),
    getRepositories: () => ipcRenderer.invoke('github-repos'),
    logout: () => ipcRenderer.invoke('github-logout'),
    startOAuth: () => ipcRenderer.invoke('github-oauth-start'),
  },
  ipc: {
    on: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
      ipcRenderer.on(channel, callback);
    },
    off: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, callback);
    },
    send: (channel: string, ...args: any[]) => {
      ipcRenderer.send(channel, ...args);
    },
  },
};

contextBridge.exposeInMainWorld('reef', reefAPI);

declare global {
  interface Window {
    reef: ReefAPI;
  }
}