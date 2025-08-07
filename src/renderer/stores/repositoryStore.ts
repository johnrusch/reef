import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Repository } from './workspaceStore';

interface RepositoryDetailState {
  gitStatus: any | null;
  branches: any[];
  currentBranch: string;
  commits: any[];
  remoteInfo: any | null;
}

interface RepositoryState {
  repositories: Repository[];
  selectedRepositories: string[];
  isLoading: boolean;
  error: string | null;
  
  // Detail state for current repository
  detail: RepositoryDetailState;
  
  // Basic operations
  loadRepositories: () => Promise<void>;
  addRepository: (repository: Omit<Repository, 'id'>) => Promise<void>;
  removeRepository: (id: string) => Promise<void>;
  updateRepository: (id: string, updates: Partial<Repository>) => Promise<void>;
  toggleRepositorySelection: (id: string) => void;
  selectAllRepositories: () => void;
  deselectAllRepositories: () => void;
  refreshRepository: (id: string) => Promise<void>;
  refreshAllRepositories: () => Promise<void>;
  
  // Git operations
  fetchRepositoryDetails: (id: string) => Promise<void>;
  refreshStatus: (repoPath: string) => Promise<void>;
  switchBranch: (repoPath: string, branch: string) => Promise<void>;
  createBranch: (repoPath: string, branchName: string) => Promise<void>;
  deleteBranch: (repoPath: string, branchName: string) => Promise<void>;
  stageFiles: (repoPath: string, files: string[]) => Promise<void>;
  unstageFiles: (repoPath: string, files: string[]) => Promise<void>;
  commitChanges: (repoPath: string, message: string) => Promise<void>;
  fetchRemote: (repoPath: string) => Promise<void>;
  pullChanges: (repoPath: string) => Promise<void>;
  pushChanges: (repoPath: string) => Promise<void>;
  getCommitHistory: (repoPath: string, options?: any) => Promise<void>;
  getDiff: (repoPath: string, file?: string) => Promise<string>;
}

export const useRepositoryStore = create<RepositoryState>()(
  devtools(
    (set, get) => ({
      repositories: [],
      selectedRepositories: [],
      isLoading: false,
      error: null,
      
      detail: {
        gitStatus: null,
        branches: [],
        currentBranch: '',
        commits: [],
        remoteInfo: null,
      },

      loadRepositories: async () => {
        set({ isLoading: true, error: null });
        try {
          const repositories = await window.reef.store.get('repositories') || [];
          set({ repositories, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addRepository: async (repository) => {
        const newRepository: Repository = {
          ...repository,
          id: crypto.randomUUID(),
        };
        
        const repositories = [...get().repositories, newRepository];
        await window.reef.store.set('repositories', repositories);
        set({ repositories });
      },

      removeRepository: async (id) => {
        const repositories = get().repositories.filter(r => r.id !== id);
        await window.reef.store.set('repositories', repositories);
        set({ 
          repositories,
          selectedRepositories: get().selectedRepositories.filter(sid => sid !== id),
        });
      },

      updateRepository: async (id, updates) => {
        const repositories = get().repositories.map(r =>
          r.id === id ? { ...r, ...updates } : r
        );
        await window.reef.store.set('repositories', repositories);
        set({ repositories });
      },

      toggleRepositorySelection: (id) => {
        const selected = get().selectedRepositories;
        if (selected.includes(id)) {
          set({ selectedRepositories: selected.filter(sid => sid !== id) });
        } else {
          set({ selectedRepositories: [...selected, id] });
        }
      },

      selectAllRepositories: () => {
        set({ selectedRepositories: get().repositories.map(r => r.id) });
      },

      deselectAllRepositories: () => {
        set({ selectedRepositories: [] });
      },

      refreshRepository: async (id) => {
        try {
          const repository = get().repositories.find(r => r.id === id);
          if (!repository) return;
          
          const status = await window.reef.git.getRepositoryStatus(repository.path);
          await get().updateRepository(id, { 
            status,
            lastFetch: new Date(),
          });
        } catch (error) {
          console.error(`Failed to refresh repository ${id}:`, error);
        }
      },

      refreshAllRepositories: async () => {
        set({ isLoading: true });
        const promises = get().repositories.map(r => get().refreshRepository(r.id));
        await Promise.allSettled(promises);
        set({ isLoading: false });
      },
      
      // Git operations
      fetchRepositoryDetails: async (id: string) => {
        const repository = get().repositories.find(r => r.id === id);
        if (!repository) return;
        
        try {
          const [status, branches, commits] = await Promise.all([
            window.reef.git.getRepositoryStatus(repository.path),
            window.reef.git.getBranches(repository.path),
            window.reef.git.getLog(repository.path, { maxCount: 100 }),
          ]);
          
          set({
            detail: {
              gitStatus: status,
              branches: branches.all || [],
              currentBranch: branches.current || '',
              commits: commits.all || [],
              remoteInfo: null,
            },
          });
        } catch (error) {
          console.error('Failed to fetch repository details:', error);
        }
      },
      
      refreshStatus: async (repoPath: string) => {
        try {
          const status = await window.reef.git.getRepositoryStatus(repoPath);
          set(state => ({
            detail: {
              ...state.detail,
              gitStatus: status,
            },
          }));
        } catch (error) {
          console.error('Failed to refresh status:', error);
        }
      },
      
      switchBranch: async (repoPath: string, branch: string) => {
        await window.reef.git.checkout(repoPath, branch);
        await get().refreshStatus(repoPath);
        const branches = await window.reef.git.getBranches(repoPath);
        set(state => ({
          detail: {
            ...state.detail,
            currentBranch: branches.current || '',
            branches: branches.all || [],
          },
        }));
      },
      
      createBranch: async (repoPath: string, branchName: string) => {
        await window.reef.git.createBranch(repoPath, branchName);
        const branches = await window.reef.git.getBranches(repoPath);
        set(state => ({
          detail: {
            ...state.detail,
            currentBranch: branchName,
            branches: branches.all || [],
          },
        }));
      },
      
      deleteBranch: async (repoPath: string, branchName: string) => {
        await window.reef.git.deleteBranch(repoPath, branchName);
        const branches = await window.reef.git.getBranches(repoPath);
        set(state => ({
          detail: {
            ...state.detail,
            branches: branches.all || [],
          },
        }));
      },
      
      stageFiles: async (repoPath: string, files: string[]) => {
        await window.reef.git.add(repoPath, files);
        await get().refreshStatus(repoPath);
      },
      
      unstageFiles: async (repoPath: string, files: string[]) => {
        await window.reef.git.reset(repoPath, files);
        await get().refreshStatus(repoPath);
      },
      
      commitChanges: async (repoPath: string, message: string) => {
        await window.reef.git.commit(repoPath, message);
        await get().refreshStatus(repoPath);
        const commits = await window.reef.git.getLog(repoPath, { maxCount: 100 });
        set(state => ({
          detail: {
            ...state.detail,
            commits: commits.all || [],
          },
        }));
      },
      
      fetchRemote: async (repoPath: string) => {
        await window.reef.git.fetch(repoPath);
        await get().refreshStatus(repoPath);
      },
      
      pullChanges: async (repoPath: string) => {
        await window.reef.git.pull(repoPath);
        await get().refreshStatus(repoPath);
        const commits = await window.reef.git.getLog(repoPath, { maxCount: 100 });
        set(state => ({
          detail: {
            ...state.detail,
            commits: commits.all || [],
          },
        }));
      },
      
      pushChanges: async (repoPath: string) => {
        await window.reef.git.push(repoPath);
        await get().refreshStatus(repoPath);
      },
      
      getCommitHistory: async (repoPath: string, options?: any) => {
        const commits = await window.reef.git.getLog(repoPath, options);
        set(state => ({
          detail: {
            ...state.detail,
            commits: commits.all || [],
          },
        }));
      },
      
      getDiff: async (repoPath: string, file?: string) => {
        return await window.reef.git.diff(repoPath, file);
      },
    }),
    {
      name: 'repository-storage',
    }
  )
);