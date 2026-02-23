import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NavigationLevel {
  level: 'context' | 'container' | 'component' | 'code';
  elementId?: string;  // undefined for context level
  elementName: string; // Human-readable name for breadcrumb display
}

interface NavigationState {
  stack: NavigationLevel[];
  repositoryPath: string | null;

  // Computed
  currentLevel: () => NavigationLevel;
  canDrillDown: () => boolean;
  canDrillUp: () => boolean;

  // Actions
  push: (level: NavigationLevel) => void;
  pop: () => void;
  navigateTo: (index: number) => void;
  reset: (repositoryPath?: string) => void;
  setRepository: (path: string) => void;
}

const LEVEL_ORDER = ['context', 'container', 'component', 'code'] as const;

export const getNextLevel = (current: NavigationLevel['level']): NavigationLevel['level'] | null => {
  const currentIndex = LEVEL_ORDER.indexOf(current);
  return currentIndex < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[currentIndex + 1] : null;
};

const initialStack: NavigationLevel[] = [
  { level: 'context', elementName: 'System Context' }
];

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      stack: initialStack,
      repositoryPath: null,

      // Computed getters
      currentLevel: () => {
        const { stack } = get();
        return stack[stack.length - 1];
      },

      canDrillDown: () => {
        const currentLevel = get().currentLevel();
        return currentLevel.level !== 'code';
      },

      canDrillUp: () => {
        const { stack } = get();
        return stack.length > 1;
      },

      // Actions
      push: (level: NavigationLevel) => {
        set((state) => ({
          stack: [...state.stack, level]
        }));
      },

      pop: () => {
        set((state) => {
          if (state.stack.length <= 1) {
            return state; // Don't pop if only context level remains
          }
          return {
            stack: state.stack.slice(0, -1)
          };
        });
      },

      navigateTo: (index: number) => {
        set((state) => {
          // Validate index
          if (index < 0 || index >= state.stack.length) {
            return state;
          }
          return {
            stack: state.stack.slice(0, index + 1)
          };
        });
      },

      reset: (repositoryPath?: string) => {
        set({
          stack: initialStack,
          repositoryPath: repositoryPath || get().repositoryPath
        });
      },

      setRepository: (path: string) => {
        const currentPath = get().repositoryPath;

        // Reset navigation when switching repositories
        if (path !== currentPath) {
          set({
            repositoryPath: path,
            stack: initialStack
          });
        }
      },
    }),
    {
      name: 'diagram-navigation',
      // Only persist stack and repositoryPath
      partialize: (state) => ({
        stack: state.stack,
        repositoryPath: state.repositoryPath
      }),
      // Clear persisted state on load if repository changed
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Will be handled by setRepository when DiagramViewer mounts
        }
      }
    }
  )
);
