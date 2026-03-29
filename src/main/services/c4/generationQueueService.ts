import { ipcMain, BrowserWindow, safeStorage } from 'electron';
import Store from 'electron-store';
import { C4AnalyzerService } from './c4AnalyzerService';
import { getStorageService } from './c4StorageHandlers';
import type { C4Level } from './types/c4Types';

const C4_LEVELS: C4Level[] = ['context', 'container', 'component', 'code'];

/**
 * Extract element IDs from a C4 PlantUML diagram's source.
 *
 * Used to discover container IDs (for component generation) and component IDs
 * (for code generation) from previously generated diagrams.
 *
 * @param diagramContent - PlantUML source text
 * @param level - The level to extract IDs for ('container' or 'component')
 * @returns Array of element ID strings (unique, order-preserved)
 */
export function extractElementIds(diagramContent: string, level: C4Level): string[] {
  const patterns: Partial<Record<C4Level, RegExp>> = {
    container: /(?:Container|ContainerDb|ContainerQueue|Container_Ext|Container_Boundary)\((\w+)/g,
    component: /(?:Component|ComponentDb|ComponentQueue|Component_Ext)\((\w+)/g,
  };
  const regex = patterns[level];
  if (!regex) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(diagramContent)) !== null) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

const cancellationFlags = new Map<string, boolean>();

let store: Store | null = null;

function getStore(): Store {
  if (!store) {
    store = new Store();
  }
  return store;
}

function getApiKey(): string | undefined {
  const s = getStore();
  const encryptedKey = s.get('anthropicApiKey') as string | undefined;
  if (encryptedKey && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'));
    } catch (error) {
      console.error('[GenerationQueue] Failed to decrypt API key:', error);
    }
  }
  return process.env.ANTHROPIC_API_KEY;
}

function broadcastToAll(channel: string, data: unknown): void {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send(channel, data);
  });
}

/**
 * Register all generation queue IPC handlers.
 * Called during app initialization in main.ts, after registerC4StorageHandlers().
 */
export function registerGenerationQueueHandlers(): void {
  ipcMain.handle('c4-generation:enqueue', async (_event, repoPath: string, repoName: string) => {
    // Return immediately — generation runs in a detached async IIFE
    void (async () => {
      cancellationFlags.delete(repoPath);

      const apiKey = getApiKey();
      if (!apiKey) {
        broadcastToAll('c4-generation:complete', {
          repoPath,
          repoName,
          success: false,
          errorMessage: 'Anthropic API key not configured. Please set your API key in Settings.',
          completedLevels: [],
        });
        return;
      }

      const analyzer = new C4AnalyzerService(apiKey);
      const completedLevels: string[] = [];

      // Broadcast initial progress
      broadcastToAll('c4-generation:progress', {
        repoPath,
        repoName,
        currentLevel: 'context',
        percent: 0,
      });

      // --- Phase 1: Generate context and container (no elementId required) ---
      for (const level of ['context', 'container'] as C4Level[]) {
        // Check cancellation before each level
        if (cancellationFlags.get(repoPath)) {
          cancellationFlags.delete(repoPath);
          try {
            getStorageService().deleteDiagramsForRepo(repoPath);
          } catch (cleanupErr) {
            console.error('[GenerationQueue] Cleanup error after cancellation:', cleanupErr);
          }
          broadcastToAll('c4-generation:cancelled', { repoPath, repoName });
          return;
        }

        try {
          // Emit 'generating' state before starting each level.
          // Note (Pitfall 2): updateState may UPDATE zero rows if no diagram_storage row exists
          // yet for this level (first-ever generation). This is acceptable — the IPC broadcast
          // still fires and the renderer's Zustand store updates to 'generating'. The 'fresh'
          // state fires after storeDiagram() creates the row, so that call is safe.
          getStorageService().updateState(repoPath, level, 'generating');
          getStorageService().clearChangeTracking(repoPath, level);
          broadcastToAll('c4-storage:state-changed', { repoPath, level, state: 'generating' });

          await analyzer.generateC4Diagram(repoPath, level);
          completedLevels.push(level);

          // Emit 'fresh' state after each level completes
          getStorageService().updateState(repoPath, level, 'fresh');
          getStorageService().clearChangeTracking(repoPath, level);
          broadcastToAll('c4-storage:state-changed', { repoPath, level, state: 'fresh' });

          broadcastToAll('c4-generation:progress', {
            repoPath,
            repoName,
            currentLevel: level,
            percent: level === 'context' ? 25 : 50,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`[GenerationQueue] Failed to generate ${level} diagram:`, errorMessage);
          getStorageService().updateState(repoPath, level, 'error', undefined, errorMessage);
          broadcastToAll('c4-storage:state-changed', { repoPath, level, state: 'error', errorMessage });
          broadcastToAll('c4-generation:complete', {
            repoPath,
            repoName,
            success: false,
            errorMessage,
            completedLevels,
          });
          return;
        }
      }

      // --- Phase 2: Discover container elements and generate component + code ---
      const containerDiagram = getStorageService().getDiagram(repoPath, 'container');
      const containerElementIds = containerDiagram
        ? extractElementIds(containerDiagram.diagramContent, 'container')
        : [];

      let componentStep = 0;
      const totalComponentSteps = containerElementIds.length;

      for (const containerId of containerElementIds) {
        if (cancellationFlags.get(repoPath)) {
          cancellationFlags.delete(repoPath);
          broadcastToAll('c4-generation:cancelled', { repoPath, repoName });
          return;
        }

        try {
          getStorageService().updateState(repoPath, 'component', 'generating', containerId);
          broadcastToAll('c4-storage:state-changed', { repoPath, level: 'component', state: 'generating', elementId: containerId });

          await analyzer.generateC4Diagram(repoPath, 'component', containerId);

          getStorageService().updateState(repoPath, 'component', 'fresh', containerId);
          broadcastToAll('c4-storage:state-changed', { repoPath, level: 'component', state: 'fresh', elementId: containerId });
          completedLevels.push(`component:${containerId}`);

          componentStep++;
          broadcastToAll('c4-generation:progress', {
            repoPath,
            repoName,
            currentLevel: 'component',
            percent: Math.round(50 + (componentStep / Math.max(totalComponentSteps, 1)) * 25),
          });

          // Discover component elements for code generation
          const componentDiagram = getStorageService().getDiagram(repoPath, 'component', containerId);
          const componentElementIds = componentDiagram
            ? extractElementIds(componentDiagram.diagramContent, 'component')
            : [];

          for (const componentId of componentElementIds) {
            if (cancellationFlags.get(repoPath)) break;
            try {
              getStorageService().updateState(repoPath, 'code', 'generating', componentId);
              broadcastToAll('c4-storage:state-changed', { repoPath, level: 'code', state: 'generating', elementId: componentId });

              await analyzer.generateC4Diagram(repoPath, 'code', componentId);

              getStorageService().updateState(repoPath, 'code', 'fresh', componentId);
              broadcastToAll('c4-storage:state-changed', { repoPath, level: 'code', state: 'fresh', elementId: componentId });
              completedLevels.push(`code:${componentId}`);
            } catch (err) {
              console.error(`[GenerationQueue] Failed to generate code for ${componentId}:`, err);
              // Non-fatal: continue with other components
            }
          }
        } catch (err) {
          console.error(`[GenerationQueue] Failed to generate component for ${containerId}:`, err);
          // Non-fatal: continue with other containers
        }
      }

      broadcastToAll('c4-generation:progress', {
        repoPath,
        repoName,
        currentLevel: 'code',
        percent: 100,
      });

      // All levels completed successfully
      broadcastToAll('c4-generation:complete', {
        repoPath,
        repoName,
        success: true,
        completedLevels,
      });
    })();

    return { queued: true };
  });

  ipcMain.handle('c4-generation:cancel', async (_event, repoPath: string) => {
    cancellationFlags.set(repoPath, true);
    return { cancelled: true };
  });

  ipcMain.handle('c4-generation:get-cost-estimate', async (_event, _repoPath: string) => {
    const tokensPerLevel = 15000;
    const levels = 4;
    const totalTokens = tokensPerLevel * levels;
    const estimatedCost = 0.03; // ~$0.008 per level x 4
    return {
      totalTokens,
      estimatedCost,
      levels,
      summary: `Estimated: ~${(totalTokens / 1000).toFixed(0)}k tokens (~$${estimatedCost.toFixed(2)})`,
    };
  });
}
