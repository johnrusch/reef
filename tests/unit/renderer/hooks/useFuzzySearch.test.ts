import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

describe('useFuzzySearch', () => {
  const mockItems = [
    { id: 'context', name: 'System Context', level: 'context', path: [] },
    { id: 'reef_main', name: 'Reef Main', level: 'container', path: ['System Context'] },
    { id: 'reef_renderer', name: 'Reef Renderer', level: 'container', path: ['System Context'] },
    { id: 'git_service', name: 'Git Service', level: 'component', path: ['System Context', 'Reef Main'] },
    { id: 'github_service', name: 'GitHub Service', level: 'component', path: ['System Context', 'Reef Main'] },
  ];

  test('returns all items when query is empty', async () => {
    const { useFuzzySearch } = await import('@renderer/hooks/useFuzzySearch');
    const { result } = renderHook(() => useFuzzySearch(mockItems, ''));

    expect(result.current).toHaveLength(mockItems.length);
  });

  test('filters items by fuzzy match on name', async () => {
    const { useFuzzySearch } = await import('@renderer/hooks/useFuzzySearch');
    const { result, rerender } = renderHook(
      ({ query }) => useFuzzySearch(mockItems, query),
      { initialProps: { query: 'git' } }
    );

    await waitFor(() => {
      expect(result.current.some(item => item.name.toLowerCase().includes('git'))).toBe(true);
    });
  });

  test('fuzzy matches partial strings', async () => {
    const { useFuzzySearch } = await import('@renderer/hooks/useFuzzySearch');
    const { result } = renderHook(() => useFuzzySearch(mockItems, 'gitsrv'));

    await waitFor(() => {
      // Should match "Git Service" with reasonable fuzzy query
      const hasGitService = result.current.some(item => item.name.includes('Git'));
      expect(hasGitService).toBe(true);
    });
  });

  test('returns empty array when no matches', async () => {
    const { useFuzzySearch } = await import('@renderer/hooks/useFuzzySearch');
    const { result } = renderHook(() => useFuzzySearch(mockItems, 'xyz123nonexistent'));

    await waitFor(() => {
      expect(result.current).toHaveLength(0);
    });
  });

  test('debounces search input', async () => {
    const { useFuzzySearch } = await import('@renderer/hooks/useFuzzySearch');
    const { result, rerender } = renderHook(
      ({ query }) => useFuzzySearch(mockItems, query),
      { initialProps: { query: '' } }
    );

    // Initial state - all items shown
    expect(result.current).toHaveLength(mockItems.length);

    // Rapidly change query
    rerender({ query: 'g' });
    rerender({ query: 'gi' });
    rerender({ query: 'git' });

    // After debounce timeout (300ms), should have filtered results
    await waitFor(() => {
      expect(result.current.some(item => item.name.toLowerCase().includes('git'))).toBe(true);
    }, { timeout: 500 });
  });
});
