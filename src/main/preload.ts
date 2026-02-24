import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { DiagramOptions, DiagramResult, ExtractorOptions, ExtractionResult } from '../shared/types/diagram';

export interface DiagramSettings {
  defaultModel: 'haiku' | 'sonnet' | 'opus';
  autoGenerateOnLoad: boolean;
  defaultDiagramType: 'component' | 'class' | 'sequence' | 'c4-context' | 'c4-container' | 'c4-component' | 'c4-code';
  defaultDetailLevel: 'overview' | 'architectural' | 'detailed';
  excludedPatterns: string[];
  plantUmlServerUrl: string;
  maxTokenBudget: number;
  cacheEnabled: boolean;
  cacheDuration: number;
}

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
    revertLines: (repoPath: string, fileName: string, lineChanges: any) => Promise<boolean>;
  };
  github: {
    authenticate: (token: string) => Promise<boolean>;
    getUser: () => Promise<any>;
    getRepositories: () => Promise<any[]>;
    logout: () => Promise<boolean>;
    startOAuth: () => Promise<any>;
    getIssues: (owner: string, repo: string) => Promise<any[]>;
    getWorkflowRuns: (owner: string, repo: string) => Promise<any>;
  };
  diagram: {
    generate: (context: string, options: DiagramOptions) => Promise<DiagramResult>;
    setApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
    checkConfiguration: () => Promise<{ configured: boolean }>;
    getAvailableContainers: (repoPath: string) => Promise<{ success: boolean; containers: string[]; error?: string }>;
    getAvailableComponents: (repoPath: string) => Promise<{ success: boolean; components: string[]; error?: string }>;
  };
  context: {
    extract: (repoPath: string, options: ExtractorOptions) => Promise<ExtractionResult>;
  };
  plantuml: {
    generateSVG: (plantUmlText: string) => Promise<string>;
    checkJava: () => Promise<boolean>;
  };
  diagramSettings: {
    get: () => Promise<DiagramSettings>;
    set: (settings: DiagramSettings) => Promise<void>;
    reset: () => Promise<void>;
  };
  fileWatcher: {
    start: (repoPath: string, level: string) => Promise<{ success: boolean }>;
    stop: (repoPath: string, level: string) => Promise<{ success: boolean }>;
    checkStaleness: (repoPath: string, level: string) => Promise<boolean>;
  };
  cache: {
    clearAll: () => Promise<{ success: boolean }>;
  };
  c4Storage: {
    initialize: () => Promise<{ initialized: boolean }>;
    getDiagram: (repoPath: string, level: string, elementId?: string) => Promise<any>;
    storeDiagram: (diagram: any) => Promise<{ success: boolean }>;
    updateState: (repoPath: string, level: string, state: string, elementId?: string, errorMessage?: string) => Promise<{ success: boolean }>;
    getState: (repoPath: string, level: string, elementId?: string) => Promise<any>;
    getRepoStates: (repoPath: string) => Promise<any[]>;
    getStats: () => Promise<{ path: string; sizeBytes: number; diagramCount: number }>;
    clearAll: () => Promise<{ success: boolean }>;
    onStateChanged: (callback: (event: any, data: any) => void) => () => void;
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
    revertLines: (repoPath: string, fileName: string, lineChanges: any) =>
      ipcRenderer.invoke('git-revert-lines', repoPath, fileName, lineChanges),
  },
  github: {
    authenticate: (token: string) => ipcRenderer.invoke('github-auth', token),
    getUser: () => ipcRenderer.invoke('github-user'),
    getRepositories: () => ipcRenderer.invoke('github-repos'),
    logout: () => ipcRenderer.invoke('github-logout'),
    startOAuth: () => ipcRenderer.invoke('github-oauth-start'),
    getIssues: (owner: string, repo: string) => ipcRenderer.invoke('github-issues', owner, repo),
    getWorkflowRuns: (owner: string, repo: string) => ipcRenderer.invoke('github-workflow-runs', owner, repo),
  },
  diagram: {
    generate: (context: string, options: DiagramOptions) => ipcRenderer.invoke('diagram:generate', context, options),
    setApiKey: (apiKey: string) => ipcRenderer.invoke('diagram:set-api-key', apiKey),
    checkConfiguration: () => ipcRenderer.invoke('diagram:check-configuration'),
    getAvailableContainers: (repoPath: string) => ipcRenderer.invoke('diagram:get-available-containers', repoPath),
    getAvailableComponents: (repoPath: string) => ipcRenderer.invoke('diagram:get-available-components', repoPath),
  },
  context: {
    extract: (repoPath: string, options: ExtractorOptions) => ipcRenderer.invoke('context:extract', repoPath, options),
  },
  plantuml: {
    generateSVG: (plantUmlText: string) => ipcRenderer.invoke('plantuml:generate-svg', plantUmlText),
    checkJava: () => ipcRenderer.invoke('plantuml:check-java'),
  },
  diagramSettings: {
    get: () => ipcRenderer.invoke('diagram-settings:get'),
    set: (settings: DiagramSettings) => ipcRenderer.invoke('diagram-settings:set', settings),
    reset: () => ipcRenderer.invoke('diagram-settings:reset'),
  },
  fileWatcher: {
    start: (repoPath: string, level: string) =>
      ipcRenderer.invoke('fileWatcher:start', repoPath, level),
    stop: (repoPath: string, level: string) =>
      ipcRenderer.invoke('fileWatcher:stop', repoPath, level),
    checkStaleness: (repoPath: string, level: string) =>
      ipcRenderer.invoke('fileWatcher:checkStaleness', repoPath, level),
  },
  cache: {
    clearAll: () => ipcRenderer.invoke('cache:clearAll'),
  },
  c4Storage: {
    initialize: () => ipcRenderer.invoke('c4-storage:initialize'),
    getDiagram: (repoPath: string, level: string, elementId?: string) =>
      ipcRenderer.invoke('c4-storage:get-diagram', repoPath, level, elementId),
    storeDiagram: (diagram: any) =>
      ipcRenderer.invoke('c4-storage:store-diagram', diagram),
    updateState: (repoPath: string, level: string, state: string, elementId?: string, errorMessage?: string) =>
      ipcRenderer.invoke('c4-storage:update-state', repoPath, level, state, elementId, errorMessage),
    getState: (repoPath: string, level: string, elementId?: string) =>
      ipcRenderer.invoke('c4-storage:get-state', repoPath, level, elementId),
    getRepoStates: (repoPath: string) =>
      ipcRenderer.invoke('c4-storage:get-repo-states', repoPath),
    getStats: () => ipcRenderer.invoke('c4-storage:get-stats'),
    clearAll: () => ipcRenderer.invoke('c4-storage:clear-all'),

    // Event listener for state changes
    onStateChanged: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on('c4-storage:state-changed', callback);
      return () => ipcRenderer.removeListener('c4-storage:state-changed', callback);
    },
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