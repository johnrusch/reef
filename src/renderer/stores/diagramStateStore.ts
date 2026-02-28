import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DiagramState, DiagramStateEntry } from '@shared/types/diagramState';
import type { C4Level } from '@main/services/c4/types/c4Types';
import type { AffectedElement } from '@shared/types/changeTracking';

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

  /** Map of "repoPath:level:" -> affected element list */
  affectedElements: Map<string, AffectedElement[]>;

  /** Set affected elements for a repo+level (called on enriched state-changed event) */
  setAffectedElements: (repoPath: string, level: C4Level, elements: AffectedElement[]) => void;

  /** Get count of direct changed elements at a specific level */
  getChangedElementCount: (repoPath: string, level: C4Level) => number;

  /** Get affected elements for a repo+level */
  getAffectedElements: (repoPath: string, level: C4Level) => AffectedElement[];

  /** Clear affected elements for a repo+level (called on fresh/generating transition) */
  clearAffectedElements: (repoPath: string, level: C4Level) => void;

  /** Map of "repoPath:level:" -> list of changed file paths (for tooltip display) */
  changedFiles: Map<string, string[]>;

  /** Set changed files for a repo+level (called on enriched state-changed event) */
  setChangedFiles: (repoPath: string, level: C4Level, files: string[]) => void;

  /** Get changed files for a repo+level */
  getChangedFiles: (repoPath: string, level: C4Level) => string[];
}

export const useDiagramStateStore = create<DiagramStateStore>()(
  devtools(
    (set, get) => ({
      states: new Map(),
      affectedElements: new Map(),
      changedFiles: new Map(),

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
        get().clearAffectedElements(repoPath, level);
        const key = generateKey(repoPath, level);
        set((prev) => {
          const newMap = new Map(prev.changedFiles);
          newMap.delete(key);
          return { changedFiles: newMap };
        });
      },

      transitionToFresh: (repoPath, level, elementId) => {
        get().setState(repoPath, level, 'fresh', elementId);
        get().clearAffectedElements(repoPath, level);
        const key = generateKey(repoPath, level);
        set((prev) => {
          const newMap = new Map(prev.changedFiles);
          newMap.delete(key);
          return { changedFiles: newMap };
        });
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

          const newAffected = new Map(prev.affectedElements);
          for (const [key] of newAffected.entries()) {
            if (key.startsWith(normalizedPath + ':')) {
              newAffected.delete(key);
            }
          }

          const newChangedFiles = new Map(prev.changedFiles);
          for (const [key] of newChangedFiles.entries()) {
            if (key.startsWith(normalizedPath + ':')) {
              newChangedFiles.delete(key);
            }
          }

          return { states: newStates, affectedElements: newAffected, changedFiles: newChangedFiles };
        });
      },
      setAffectedElements: (repoPath, level, elements) => {
        const key = generateKey(repoPath, level);
        set((prev) => {
          const newMap = new Map(prev.affectedElements);
          newMap.set(key, elements);
          return { affectedElements: newMap };
        });
      },

      getChangedElementCount: (repoPath, level) => {
        const key = generateKey(repoPath, level);
        const elements = get().affectedElements.get(key) || [];
        return elements.filter(e => e.level === level && e.isDirect).length;
      },

      getAffectedElements: (repoPath, level) => {
        const key = generateKey(repoPath, level);
        return get().affectedElements.get(key) || [];
      },

      clearAffectedElements: (repoPath, level) => {
        const key = generateKey(repoPath, level);
        set((prev) => {
          const newMap = new Map(prev.affectedElements);
          newMap.delete(key);
          return { affectedElements: newMap };
        });
      },

      setChangedFiles: (repoPath, level, files) => {
        const key = generateKey(repoPath, level);
        set((prev) => {
          const newMap = new Map(prev.changedFiles);
          newMap.set(key, files);
          return { changedFiles: newMap };
        });
      },

      getChangedFiles: (repoPath, level) => {
        const key = generateKey(repoPath, level);
        return get().changedFiles.get(key) || [];
      },
    }),
    {
      name: 'diagram-state-storage',
    }
  )
);
