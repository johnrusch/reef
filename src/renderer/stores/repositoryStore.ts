import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Repository } from './workspaceStore';

interface RepositoryState {
  repositories: Repository[];
  selectedRepositories: string[];
  isLoading: boolean;
  error: string | null;
  loadRepositories: () => Promise<void>;
  addRepository: (repository: Omit<Repository, 'id'>) => Promise<void>;
  removeRepository: (id: string) => Promise<void>;
  updateRepository: (id: string, updates: Partial<Repository>) => Promise<void>;
  toggleRepositorySelection: (id: string) => void;
  selectAllRepositories: () => void;
  deselectAllRepositories: () => void;
  refreshRepository: (id: string) => Promise<void>;
  refreshAllRepositories: () => Promise<void>;
}

export const useRepositoryStore = create<RepositoryState>()(
  devtools(
    (set, get) => ({
      repositories: [],
      selectedRepositories: [],
      isLoading: false,
      error: null,

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
    }),
    {
      name: 'repository-storage',
    }
  )
);