import { useMemo, useState, useEffect } from 'react';
import Fuse from 'fuse.js';

export interface SearchItem {
  id: string;
  name: string;
  level: 'context' | 'container' | 'component' | 'code';
  path: string[];
  elementId?: string;
}

const DEBOUNCE_MS = 300;

export const useFuzzySearch = <T extends SearchItem>(
  items: T[],
  query: string
): T[] => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Memoize Fuse instance to avoid recreating on every render
  const fuse = useMemo(() => new Fuse(items, {
    keys: [
      { name: 'name', weight: 2 },
      { name: 'id', weight: 1.5 },
      { name: 'path', weight: 1 },
    ],
    threshold: 0.4,        // Fuzzy matching tolerance
    includeScore: true,
    ignoreLocation: true,  // Match anywhere in string
    minMatchCharLength: 1,
  }), [items]);

  // Perform search
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items;
    }
    return fuse.search(debouncedQuery).map(result => result.item);
  }, [debouncedQuery, fuse, items]);

  return results;
};
