import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Repository {
  id: string;
  name: string;
  path: string;
  url?: string;
  currentBranch?: string;
  status?: {
    ahead: number;
    behind: number;
    modified: number;
    staged: number;
    untracked: number;
  };
  lastFetch?: Date;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  repositories: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  addRepositoryToWorkspace: (workspaceId: string, repositoryId: string) => Promise<void>;
  removeRepositoryFromWorkspace: (workspaceId: string, repositoryId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    (set, get) => ({
      workspaces: [],
      activeWorkspace: null,
      isLoading: false,
      error: null,

      loadWorkspaces: async () => {
        set({ isLoading: true, error: null });
        try {
          const workspaces = await window.reef.store.get('workspaces') || [];
          set({ workspaces, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createWorkspace: async (workspace) => {
        const newWorkspace: Workspace = {
          ...workspace,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const workspaces = [...get().workspaces, newWorkspace];
        await window.reef.store.set('workspaces', workspaces);
        set({ workspaces });
      },

      updateWorkspace: async (id, updates) => {
        const workspaces = get().workspaces.map(w =>
          w.id === id ? { ...w, ...updates, updatedAt: new Date() } : w
        );
        await window.reef.store.set('workspaces', workspaces);
        set({ workspaces });
      },

      deleteWorkspace: async (id) => {
        const workspaces = get().workspaces.filter(w => w.id !== id);
        await window.reef.store.set('workspaces', workspaces);
        set({ workspaces });
        
        if (get().activeWorkspace?.id === id) {
          set({ activeWorkspace: null });
        }
      },

      setActiveWorkspace: (workspace) => {
        set({ activeWorkspace: workspace });
      },

      addRepositoryToWorkspace: async (workspaceId, repositoryId) => {
        const workspace = get().workspaces.find(w => w.id === workspaceId);
        if (!workspace) return;
        
        if (!workspace.repositories.includes(repositoryId)) {
          await get().updateWorkspace(workspaceId, {
            repositories: [...workspace.repositories, repositoryId],
          });
        }
      },

      removeRepositoryFromWorkspace: async (workspaceId, repositoryId) => {
        const workspace = get().workspaces.find(w => w.id === workspaceId);
        if (!workspace) return;
        
        await get().updateWorkspace(workspaceId, {
          repositories: workspace.repositories.filter(id => id !== repositoryId),
        });
      },
    }),
    {
      name: 'workspace-storage',
    }
  )
);