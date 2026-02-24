import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DiagramState, DiagramStateEntry } from '@shared/types/diagramState';
import type { C4Level } from '@main/services/c4/types/c4Types';

/**
 * Key generation helper for Map storage
 * Normalizes paths to forward slashes for cross-platform consistency
 */
const generateKey = (repoPath: string, level: C4Level, elementId?: string): string => {
  const normalizedPath = repoPath.replace(/\\/g, '/');
  return `${normalizedPath}:${level}:${elementId || ''}`;
};

/**
 * Diagram State Store
 *
 * Centralized state machine for managing diagram lifecycle states across the application.
 * Stores state in memory for fast UI updates, syncs with backend storage via IPC.
 */
interface DiagramStateStore {
  /** State map: key format is "repoPath:level:elementId" */
  states: Map<string, DiagramStateEntry>;

  /** Get current state for a diagram (returns 'never_generated' if not found) */
  getState: (repoPath: string, level: C4Level, elementId?: string) => DiagramState;

  /** Get full state entry for a diagram */
  getEntry: (repoPath: string, level: C4Level, elementId?: string) => DiagramStateEntry | undefined;

  /** Set state for a diagram (creates or updates entry) */
  setState: (repoPath: string, level: C4Level, state: DiagramState, elementId?: string, errorMessage?: string) => void;

  /** Type-safe transition helpers */
  transitionToGenerating: (repoPath: string, level: C4Level, elementId?: string) => void;
  transitionToFresh: (repoPath: string, level: C4Level, elementId?: string) => void;
  transitionToStale: (repoPath: string, level: C4Level, elementId?: string) => void;
  transitionToError: (repoPath: string, level: C4Level, errorMessage: string, elementId?: string) => void;

  /** Bulk operations */
  loadStatesFromBackend: (entries: DiagramStateEntry[]) => void;
  clearStatesForRepo: (repoPath: string) => void;
}

export const useDiagramStateStore = create<DiagramStateStore>()(
  devtools(
    (set, get) => ({
      states: new Map(),

      getState: (repoPath, level, elementId) => {
        const key = generateKey(repoPath, level, elementId);
        const entry = get().states.get(key);
        return entry?.state || 'never_generated';
      },

      getEntry: (repoPath, level, elementId) => {
        const key = generateKey(repoPath, level, elementId);
        return get().states.get(key);
      },

      setState: (repoPath, level, state, elementId, errorMessage) => {
        const key = generateKey(repoPath, level, elementId);
        const now = new Date().toISOString();

        set((prev) => {
          const newStates = new Map(prev.states);
          const existing = newStates.get(key);

          newStates.set(key, {
            repoPath: repoPath.replace(/\\/g, '/'),
            level,
            elementId,
            state,
            errorMessage,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
          });

          return { states: newStates };
        });
      },

      transitionToGenerating: (repoPath, level, elementId) => {
        get().setState(repoPath, level, 'generating', elementId);
      },

      transitionToFresh: (repoPath, level, elementId) => {
        get().setState(repoPath, level, 'fresh', elementId);
      },

      transitionToStale: (repoPath, level, elementId) => {
        get().setState(repoPath, level, 'stale', elementId);
      },

      transitionToError: (repoPath, level, errorMessage, elementId) => {
        get().setState(repoPath, level, 'error', elementId, errorMessage);
      },

      loadStatesFromBackend: (entries) => {
        set(() => {
          const newStates = new Map<string, DiagramStateEntry>();

          for (const entry of entries) {
            const key = generateKey(entry.repoPath, entry.level, entry.elementId);
            newStates.set(key, entry);
          }

          return { states: newStates };
        });
      },

      clearStatesForRepo: (repoPath) => {
        const normalizedPath = repoPath.replace(/\\/g, '/');

        set((prev) => {
          const newStates = new Map(prev.states);

          // Remove all entries matching the repo path prefix
          for (const [key, entry] of newStates.entries()) {
            if (entry.repoPath === normalizedPath) {
              newStates.delete(key);
            }
          }

          return { states: newStates };
        });
      },
    }),
    {
      name: 'diagram-state-storage',
    }
  )
);
