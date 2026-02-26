import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDiagramStateStore } from '@renderer/stores/diagramStateStore';
import type { AffectedElement } from '@shared/types/changeTracking';

describe('diagramStateStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useDiagramStateStore());
    act(() => {
      result.current.states.clear();
      result.current.affectedElements.clear();
    });
  });

  describe('state retrieval', () => {
    it('returns never_generated for unknown entries', () => {
      const { result } = renderHook(() => useDiagramStateStore());
      const state = result.current.getState('/unknown/repo', 'context');
      expect(state).toBe('never_generated');
    });

    it('returns stored state for known entries', () => {
      const { result } = renderHook(() => useDiagramStateStore());

      act(() => {
        result.current.setState('/test/repo', 'context', 'fresh');
      });

      const state = result.current.getState('/test/repo', 'context');
      expect(state).toBe('fresh');
    });

    it('generates consistent keys from repoPath/level/elementId', () => {
      const { result } = renderHook(() => useDiagramStateStore());

      act(() => {
        result.current.setState('/test/repo', 'context', 'fresh');
        result.current.setState('/test/repo', 'context', 'stale', 'element-1');
      });

      // Root diagram (no elementId)
      const state1 = result.current.getState('/test/repo', 'context');
      expect(state1).toBe('fresh');

      // Drill-down diagram (with elementId)
      const state2 = result.current.getState('/test/repo', 'context', 'element-1');
      expect(state2).toBe('stale');

      // They should be different entries
      expect(state1).not.toBe(state2);
    });
  });

  describe('state mutations (STOR-04)', () => {
    it('setState creates new entry in store', () => {
      const { result } = renderHook(() => useDiagramStateStore());

      act(() => {
        result.current.setState('/test/repo', 'context', 'generating');
      });

      const entry = result.current.getEntry('/test/repo', 'context');
      expect(entry).toBeDefined();
      expect(entry?.state).toBe('generating');
      expect(entry?.repoPath).toBe('/test/repo');
      expect(entry?.level).toBe('context');
      expect(entry?.createdAt).toBeDefined();
      expect(entry?.updatedAt).toBeDefined();
    });

    it('setState updates existing entry', async () => {
      const { result } = renderHook(() => useDiagramStateStore());

      act(() => {
        result.current.setState('/test/repo', 'context', 'generating');
      });

      const firstEntry = result.current.getEntry('/test/repo', 'context');
      const firstCreatedAt = firstEntry?.createdAt;
      const firstUpdatedAt = firstEntry?.updatedAt;

      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      act(() => {
        result.current.setState('/test/repo', 'context', 'fresh');
      });

      const secondEntry = result.current.getEntry('/test/repo', 'context');
      expect(secondEntry?.state).toBe('fresh');
      expect(secondEntry?.createdAt).toBe(firstCreatedAt); // createdAt preserved
      expect(secondEntry?.updatedAt).not.toBe(firstUpdatedAt); // updatedAt changed
    });

    it('setState normalizes path separators', () => {
      const { result } = renderHook(() => useDiagramStateStore());

      act(() => {
        result.current.setState('C:\\Users\\test\\repo', 'context', 'fresh');
      });

      // Retrieve with forward slashes
      const state = result.current.getState('C:/Users/test/repo', 'context');
      expect(state).toBe('fresh');

      // Retrieve with original backslashes
      const state2 = result.current.getState('C:\\Users\\test\\repo', 'context');
      expect(state2).toBe('fresh');
    });
  });

  describe('transition helpers', () => {
    it('transitionToGenerating sets generating state', () => {
      const { result } = renderHook(() => useDiagramStateStore());

      act(() => {
        result.current.transitionToGenerating('/test/repo', 'context');
      });

      expect(result.current.getState('/test/repo', 'context')).toBe('generating');
    });

    it('transitionToFresh sets fresh state', () => {
      const { result } = renderHook(() => useDiagramStateStore());

      act(() => {
        result.current.transitionToFresh('/test/repo', 'context');
      });

      expect(result.current.getState('/test/repo', 'context')).toBe('fresh');
    });

    it('transitionToStale sets stale state', () => {
      const { result } = renderHook(() => useDiagramStateStore());

      act(() => {
        result.current.transitionToStale('/test/repo', 'context');
      });

      expect(result.current.getState('/test/repo', 'context')).toBe('stale');
    });

    it('transitionToError sets error state with message', () => {
      const { result } = renderHook(() => useDiagramStateStore());

      act(() => {
        result.current.transitionToError('/test/repo', 'context', 'Generation failed');
      });

      expect(result.current.getState('/test/repo', 'context')).toBe('error');

      const entry = result.current.getEntry('/test/repo', 'context');
      expect(entry?.errorMessage).toBe('Generation failed');
    });
  });

  describe('bulk operations', () => {
    it('loadStatesFromBackend replaces all states', () => {
      const { result } = renderHook(() => useDiagramStateStore());

      // Add some initial states
      act(() => {
        result.current.setState('/test/repo1', 'context', 'fresh');
        result.current.setState('/test/repo2', 'container', 'stale');
      });

      // Load new states from backend (replaces all)
      const backendStates = [
        {
          repoPath: '/new/repo1',
          level: 'context' as const,
          elementId: undefined,
          state: 'generating' as const,
          errorMessage: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          repoPath: '/new/repo2',
          level: 'container' as const,
          elementId: undefined,
          state: 'error' as const,
          errorMessage: 'Failed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      act(() => {
        result.current.loadStatesFromBackend(backendStates);
      });

      // Old states should be gone
      expect(result.current.getState('/test/repo1', 'context')).toBe('never_generated');
      expect(result.current.getState('/test/repo2', 'container')).toBe('never_generated');

      // New states should be present
      expect(result.current.getState('/new/repo1', 'context')).toBe('generating');
      expect(result.current.getState('/new/repo2', 'container')).toBe('error');
    });

    it('clearStatesForRepo removes matching entries', () => {
      const { result } = renderHook(() => useDiagramStateStore());

      // Add states for multiple repos
      act(() => {
        result.current.setState('/test/repo1', 'context', 'fresh');
        result.current.setState('/test/repo1', 'container', 'stale');
        result.current.setState('/test/repo2', 'context', 'generating');
      });

      // Clear states for repo1
      act(() => {
        result.current.clearStatesForRepo('/test/repo1');
      });

      // Repo1 states should be gone
      expect(result.current.getState('/test/repo1', 'context')).toBe('never_generated');
      expect(result.current.getState('/test/repo1', 'container')).toBe('never_generated');

      // Repo2 states should still exist
      expect(result.current.getState('/test/repo2', 'context')).toBe('generating');
    });
  });

  describe('affected elements (CHNG-05)', () => {
    const makeElements = (level: 'code' | 'component' | 'container' | 'context', isDirect = true): AffectedElement[] => [
      { level, elementId: `elem_${level}_1`, elementName: `Element 1`, isDirect },
    ];

    it('setAffectedElements stores elements for repo+level', () => {
      const { result } = renderHook(() => useDiagramStateStore());
      const elements = makeElements('code');

      act(() => {
        result.current.setAffectedElements('/test/repo', 'code', elements);
      });

      expect(result.current.getAffectedElements('/test/repo', 'code')).toEqual(elements);
    });

    it('getChangedElementCount returns count of direct elements at level', () => {
      const { result } = renderHook(() => useDiagramStateStore());

      const elements: AffectedElement[] = [
        { level: 'code', elementId: 'elem_a', elementName: 'A', isDirect: true },
        { level: 'code', elementId: 'elem_b', elementName: 'B', isDirect: true },
        { level: 'code', elementId: 'elem_c', elementName: 'C', isDirect: false },
      ];

      act(() => {
        result.current.setAffectedElements('/test/repo', 'code', elements);
      });

      expect(result.current.getChangedElementCount('/test/repo', 'code')).toBe(2);
    });

    it('clearAffectedElements removes elements for repo+level', () => {
      const { result } = renderHook(() => useDiagramStateStore());
      const elements = makeElements('component');

      act(() => {
        result.current.setAffectedElements('/test/repo', 'component', elements);
      });

      act(() => {
        result.current.clearAffectedElements('/test/repo', 'component');
      });

      expect(result.current.getAffectedElements('/test/repo', 'component')).toEqual([]);
    });

    it('transitionToFresh clears affected elements', () => {
      const { result } = renderHook(() => useDiagramStateStore());
      const elements = makeElements('container');

      act(() => {
        result.current.setAffectedElements('/test/repo', 'container', elements);
        result.current.transitionToFresh('/test/repo', 'container');
      });

      expect(result.current.getAffectedElements('/test/repo', 'container')).toEqual([]);
    });

    it('transitionToGenerating clears affected elements', () => {
      const { result } = renderHook(() => useDiagramStateStore());
      const elements = makeElements('component');

      act(() => {
        result.current.setAffectedElements('/test/repo', 'component', elements);
        result.current.transitionToGenerating('/test/repo', 'component');
      });

      expect(result.current.getAffectedElements('/test/repo', 'component')).toEqual([]);
    });

    it('clearStatesForRepo also clears affected elements', () => {
      const { result } = renderHook(() => useDiagramStateStore());
      const elements = makeElements('code');

      act(() => {
        result.current.setState('/test/repo1', 'code', 'stale');
        result.current.setAffectedElements('/test/repo1', 'code', elements);
        result.current.setState('/test/repo2', 'code', 'fresh');
        result.current.setAffectedElements('/test/repo2', 'code', makeElements('code'));
      });

      act(() => {
        result.current.clearStatesForRepo('/test/repo1');
      });

      // Repo1 states and affected elements should be gone
      expect(result.current.getState('/test/repo1', 'code')).toBe('never_generated');
      expect(result.current.getAffectedElements('/test/repo1', 'code')).toEqual([]);

      // Repo2 should still have its data
      expect(result.current.getState('/test/repo2', 'code')).toBe('fresh');
      expect(result.current.getAffectedElements('/test/repo2', 'code')).toHaveLength(1);
    });
  });
});
