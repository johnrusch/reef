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
  dialog: {
    selectDirectory: () => Promise<string | null>;
  };
  git: {
    executeCommand: (repoPath: string, command: string[]) => Promise<string>;
    getRepositoryStatus: (repoPath: string) => Promise<any>;
    fetch: (repoPath: string) => Promise<boolean>;
    pull: (repoPath: string) => Promise<any>;
    push: (repoPath: string) => Promise<any>;
    commit: (repoPath: string, message: string, files?: string[]) => Promise<any>;
    getBranches: (repoPath: string) => Promise<any>;
    checkout: (repoPath: string, branch: string) => Promise<boolean>;
    getLog: (repoPath: string, options?: any) => Promise<any>;
    add: (repoPath: string, files: string[]) => Promise<void>;
    reset: (repoPath: string, files: string[]) => Promise<void>;
    diff: (repoPath: string, file?: string) => Promise<string>;
    createBranch: (repoPath: string, branchName: string) => Promise<void>;
    deleteBranch: (repoPath: string, branchName: string) => Promise<void>;
    getRemotes: (repoPath: string) => Promise<any>;
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
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
  },
  git: {
    executeCommand: (repoPath: string, command: string[]) =>
      ipcRenderer.invoke('git-execute', repoPath, command),
    getRepositoryStatus: (repoPath: string) =>
      ipcRenderer.invoke('git-status', repoPath),
    fetch: (repoPath: string) => ipcRenderer.invoke('git-fetch', repoPath),
    pull: (repoPath: string) => ipcRenderer.invoke('git-pull', repoPath),
    push: (repoPath: string) => ipcRenderer.invoke('git-push', repoPath),
    commit: (repoPath: string, message: string, files?: string[]) =>
      ipcRenderer.invoke('git-commit', repoPath, message, files),
    getBranches: (repoPath: string) => ipcRenderer.invoke('git-branches', repoPath),
    checkout: (repoPath: string, branch: string) =>
      ipcRenderer.invoke('git-checkout', repoPath, branch),
    getLog: (repoPath: string, options?: any) =>
      ipcRenderer.invoke('git-log', repoPath, options),
    add: (repoPath: string, files: string[]) =>
      ipcRenderer.invoke('git-add', repoPath, files),
    reset: (repoPath: string, files: string[]) =>
      ipcRenderer.invoke('git-reset', repoPath, files),
    diff: (repoPath: string, file?: string) =>
      ipcRenderer.invoke('git-diff', repoPath, file),
    createBranch: (repoPath: string, branchName: string) =>
      ipcRenderer.invoke('git-create-branch', repoPath, branchName),
    deleteBranch: (repoPath: string, branchName: string) =>
      ipcRenderer.invoke('git-delete-branch', repoPath, branchName),
    getRemotes: (repoPath: string) =>
      ipcRenderer.invoke('git-get-remotes', repoPath),
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