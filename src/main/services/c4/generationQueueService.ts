import { ipcMain, BrowserWindow, safeStorage } from 'electron';
import Store from 'electron-store';
import { C4AnalyzerService } from './c4AnalyzerService';
import { getStorageService } from './c4StorageHandlers';
import type { C4Level } from './types/c4Types';

const C4_LEVELS: C4Level[] = ['context', 'container', 'component', 'code'];

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

      for (let i = 0; i < C4_LEVELS.length; i++) {
        // Check cancellation before each level
        if (cancellationFlags.get(repoPath)) {
          cancellationFlags.delete(repoPath);
          // Clean up any partial results
          try {
            getStorageService().deleteDiagramsForRepo(repoPath);
          } catch (cleanupErr) {
            console.error('[GenerationQueue] Cleanup error after cancellation:', cleanupErr);
          }
          broadcastToAll('c4-generation:cancelled', { repoPath, repoName });
          return;
        }

        const level = C4_LEVELS[i];
        const percent = Math.round(((i + 1) / C4_LEVELS.length) * 100);

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
            percent,
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
