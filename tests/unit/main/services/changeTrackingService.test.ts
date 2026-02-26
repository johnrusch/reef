import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChangeTrackingService, sanitizeId } from '@main/services/changeTrackingService';
import type { C4StorageService } from '@main/services/c4/c4StorageService';

// Mock electron BrowserWindow
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

// Helper to create a mock C4StorageService
function createMockStorage(initialState = 'fresh') {
  return {
    upsertChangeTracking: vi.fn(),
    updateState: vi.fn(),
    getState: vi.fn(() => initialState),
    getDiagram: vi.fn(() => null),
    storeDiagram: vi.fn(),
    close: vi.fn(),
  } as unknown as C4StorageService;
}

describe('ChangeTrackingService', () => {
  let storage: ReturnType<typeof createMockStorage>;
  let service: ChangeTrackingService;

  beforeEach(() => {
    vi.useFakeTimers();
    storage = createMockStorage();
    service = new ChangeTrackingService(storage as unknown as C4StorageService, 1000);
  });

  afterEach(() => {
    service.shutdown();
    vi.useRealTimers();
  });

  describe('CHNG-01: marks diagram stale when file change recorded', () => {
    it('calls updateState with stale after debounce timer fires', () => {
      service.recordChange('/repo', 'component', '/repo/src/main/services/gitService.ts');

      // No flush yet
      expect(storage.updateState).not.toHaveBeenCalled();

      // Advance timer by 1000ms
      vi.advanceTimersByTime(1000);

      expect(storage.updateState).toHaveBeenCalledWith('/repo', 'component', 'stale');
    });
  });

  describe('CHNG-02: file-to-element mapping', () => {
    it('maps code-level file to filename element', () => {
      const elements = (service as any).mapFilesToElements(
        '/repo',
        'code',
        ['/repo/src/main/services/gitService.ts']
      );

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        level: 'code',
        elementId: 'gitService',
        elementName: 'gitService',
        isDirect: true,
      });
    });

    it('maps component-level file to directory element', () => {
      const elements = (service as any).mapFilesToElements(
        '/repo',
        'component',
        ['/repo/src/main/services/gitService.ts']
      );

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        level: 'component',
        elementId: 'Services',
        elementName: 'Services',
        isDirect: true,
      });
    });

    it('maps container-level file to Main Process', () => {
      const elements = (service as any).mapFilesToElements(
        '/repo',
        'container',
        ['/repo/src/main/services/foo.ts']
      );

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        level: 'container',
        elementId: 'Main_Process',
        elementName: 'Main Process',
        isDirect: true,
      });
    });

    it('maps container-level file to Renderer Process', () => {
      const elements = (service as any).mapFilesToElements(
        '/repo',
        'container',
        ['/repo/src/renderer/components/App.tsx']
      );

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        level: 'container',
        elementId: 'Renderer_Process',
        elementName: 'Renderer Process',
        isDirect: true,
      });
    });

    it('context level returns empty elements array', () => {
      const elements = (service as any).mapFilesToElements(
        '/repo',
        'context',
        ['/repo/src/main/services/gitService.ts']
      );

      expect(elements).toHaveLength(0);
    });

    it('deduplicates elements with same elementId', () => {
      const elements = (service as any).mapFilesToElements(
        '/repo',
        'component',
        [
          '/repo/src/main/services/gitService.ts',
          '/repo/src/main/services/githubService.ts',
        ]
      );

      // Both files map to the same "Services" component — should be deduplicated
      expect(elements).toHaveLength(1);
      expect(elements[0].elementId).toBe('Services');
    });
  });

  describe('CHNG-03: hierarchy propagation', () => {
    it('propagates code change to component and container levels', () => {
      const directElements = [
        { level: 'code' as const, elementId: 'gitService', elementName: 'gitService', isDirect: true },
      ];

      const all = (service as any).propagateUp(directElements);

      // Should have the original code element + propagated component + container
      expect(all).toHaveLength(3);

      const levels = all.map((e: any) => e.level);
      expect(levels).toContain('code');
      expect(levels).toContain('component');
      expect(levels).toContain('container');

      // Propagated entries should have isDirect: false
      const propagated = all.filter((e: any) => !e.isDirect);
      expect(propagated).toHaveLength(2);
      expect(propagated.every((e: any) => e.isDirect === false)).toBe(true);
    });

    it('propagates component change to container only', () => {
      const directElements = [
        { level: 'component' as const, elementId: 'Services', elementName: 'Services', isDirect: true },
      ];

      const all = (service as any).propagateUp(directElements);

      expect(all).toHaveLength(2);
      const levels = all.map((e: any) => e.level);
      expect(levels).toContain('component');
      expect(levels).toContain('container');

      const propagated = all.filter((e: any) => !e.isDirect);
      expect(propagated).toHaveLength(1);
      expect(propagated[0].level).toBe('container');
    });

    it('does not propagate container level further', () => {
      const directElements = [
        { level: 'container' as const, elementId: 'Main_Process', elementName: 'Main Process', isDirect: true },
      ];

      const all = (service as any).propagateUp(directElements);

      // Container doesn't propagate, so just the original
      expect(all).toHaveLength(1);
    });
  });

  describe('CHNG-04: debounce behavior', () => {
    it('debounces multiple rapid changes into a single flush', () => {
      service.recordChange('/repo', 'component', '/repo/src/main/services/file1.ts');
      service.recordChange('/repo', 'component', '/repo/src/main/services/file2.ts');
      service.recordChange('/repo', 'component', '/repo/src/main/services/file3.ts');
      service.recordChange('/repo', 'component', '/repo/src/main/services/file4.ts');
      service.recordChange('/repo', 'component', '/repo/src/main/services/file5.ts');

      vi.advanceTimersByTime(1000);

      // Only one flush should have occurred
      expect(storage.updateState).toHaveBeenCalledTimes(1);
      // upsertChangeTracking should have been called with all 5 files
      expect(storage.upsertChangeTracking).toHaveBeenCalledTimes(1);
      const callArgs = (storage.upsertChangeTracking as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[2]).toHaveLength(5); // changedFiles array
    });

    it('resets debounce timer on each new change', () => {
      service.recordChange('/repo', 'component', '/repo/src/main/services/file1.ts');

      // Advance 500ms — no flush yet
      vi.advanceTimersByTime(500);
      expect(storage.updateState).not.toHaveBeenCalled();

      // Another change — resets the timer
      service.recordChange('/repo', 'component', '/repo/src/main/services/file2.ts');

      // Advance another 500ms (only 500ms since last change) — still no flush
      vi.advanceTimersByTime(500);
      expect(storage.updateState).not.toHaveBeenCalled();

      // Advance another 500ms (now 1000ms since last change) — flush!
      vi.advanceTimersByTime(500);
      expect(storage.updateState).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pitfall 2: skips state update when diagram is generating', () => {
    it('does not call updateState when state is generating, but still upserts change tracking', () => {
      const generatingStorage = createMockStorage('generating');
      const svc = new ChangeTrackingService(generatingStorage as unknown as C4StorageService, 1000);

      svc.recordChange('/repo', 'component', '/repo/src/main/services/gitService.ts');
      vi.advanceTimersByTime(1000);

      // updateState should NOT be called — state is 'generating'
      expect(generatingStorage.updateState).not.toHaveBeenCalled();

      // upsertChangeTracking SHOULD still be called
      expect(generatingStorage.upsertChangeTracking).toHaveBeenCalledTimes(1);

      svc.shutdown();
    });
  });

  describe('shutdown: clears all timers', () => {
    it('clears pending timers so no flush occurs after shutdown', () => {
      service.recordChange('/repo', 'component', '/repo/src/main/services/gitService.ts');

      // Shutdown before timer fires
      service.shutdown();

      // Advance past the debounce window
      vi.advanceTimersByTime(2000);

      // No flush should have occurred
      expect(storage.updateState).not.toHaveBeenCalled();
      expect(storage.upsertChangeTracking).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeId utility', () => {
    it('replaces non-alphanumeric characters with underscores', () => {
      expect(sanitizeId('hello-world')).toBe('hello_world');
      expect(sanitizeId('foo.bar')).toBe('foo_bar');
    });

    it('prepends underscore to names starting with digit', () => {
      expect(sanitizeId('1service')).toBe('_1service');
    });

    it('leaves valid identifiers unchanged', () => {
      expect(sanitizeId('Services')).toBe('Services');
      expect(sanitizeId('Main_Process')).toBe('Main_Process');
    });
  });

  describe('computeElementCounts', () => {
    it('counts direct elements per level', () => {
      const elements = [
        { level: 'container' as const, elementId: 'Main_Process', elementName: 'Main Process', isDirect: true },
        { level: 'component' as const, elementId: 'Services', elementName: 'Services', isDirect: true },
        { level: 'component' as const, elementId: 'Components', elementName: 'Components', isDirect: true },
        { level: 'code' as const, elementId: 'gitService', elementName: 'gitService', isDirect: false }, // propagated, not direct
      ];

      const counts = service.computeElementCounts(elements);

      expect(counts).toEqual({ container: 1, component: 2 });
    });
  });
});
