import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('diagramStateStore', () => {
  describe('state retrieval', () => {
    it.todo('returns never_generated for unknown entries');
    it.todo('returns stored state for known entries');
    it.todo('generates consistent keys from repoPath/level/elementId');
  });

  describe('state mutations (STOR-04)', () => {
    it.todo('setState creates new entry in store');
    it.todo('setState updates existing entry');
    it.todo('setState normalizes path separators');
  });

  describe('transition helpers', () => {
    it.todo('transitionToGenerating sets generating state');
    it.todo('transitionToFresh sets fresh state');
    it.todo('transitionToStale sets stale state');
    it.todo('transitionToError sets error state with message');
  });

  describe('bulk operations', () => {
    it.todo('loadStatesFromBackend replaces all states');
    it.todo('clearStatesForRepo removes matching entries');
  });
});
