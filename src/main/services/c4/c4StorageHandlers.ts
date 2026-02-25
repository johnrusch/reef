import { ipcMain, BrowserWindow } from 'electron';
import { C4StorageService } from './c4StorageService';
import { MigrationService } from './migrationService';
import type { DiagramState, StoredDiagram } from '../../../shared/types/diagramState';
import type { C4Level } from './types/c4Types';

// Singleton instance
let storageService: C4StorageService | null = null;

export const getStorageService = (): C4StorageService => {
  if (!storageService) {
    storageService = new C4StorageService();
  }
  return storageService;
};

/**
 * Register all C4 storage IPC handlers
 * Called during app initialization in main.ts
 */
export function registerC4StorageHandlers(): void {
  // Initialize storage and run migration if needed
  ipcMain.handle('c4-storage:initialize', async () => {
    const migration = new MigrationService();

    if (migration.needsMigration()) {
      try {
        // Pass the storage service to migrate method so it can store diagrams
        migration.migrate(getStorageService());
        migration.cleanupV1Cache();
      } catch (error) {
        console.error('Migration failed:', error);
        // Continue anyway - diagrams will be marked as never_generated
      }
    }

    return { initialized: true };
  });

  // Get diagram
  ipcMain.handle('c4-storage:get-diagram', async (_, repoPath: string, level: string, elementId?: string) => {
    return getStorageService().getDiagram(repoPath, level as C4Level, elementId);
  });

  // Store diagram
  ipcMain.handle('c4-storage:store-diagram', async (_, diagram: StoredDiagram) => {
    getStorageService().storeDiagram(diagram);
    return { success: true };
  });

  // Update state
  ipcMain.handle('c4-storage:update-state', async (_, repoPath: string, level: string, state: DiagramState, elementId?: string, errorMessage?: string) => {
    getStorageService().updateState(repoPath, level as C4Level, state, elementId, errorMessage);

    // Notify all windows of state change
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('c4-storage:state-changed', {
        repoPath,
        level,
        elementId,
        state,
        errorMessage,
      });
    });

    return { success: true };
  });

  // Get state
  ipcMain.handle('c4-storage:get-state', async (_, repoPath: string, level: string, elementId?: string) => {
    return getStorageService().getState(repoPath, level as C4Level, elementId);
  });

  // Get all states for repo
  ipcMain.handle('c4-storage:get-repo-states', async (_, repoPath: string) => {
    const diagrams = getStorageService().getAllDiagramsForRepo(repoPath);
    return diagrams.map(d => ({
      repoPath: d.repoPath,
      level: d.level,
      elementId: d.elementId,
      state: d.state,
      errorMessage: d.errorMessage,
    }));
  });

  // Get storage stats (for Settings display)
  ipcMain.handle('c4-storage:get-stats', async () => {
    return getStorageService().getStorageStats();
  });

  // Clear all diagrams (for Settings "Clear All" button)
  ipcMain.handle('c4-storage:clear-all', async () => {
    getStorageService().clearAllDiagrams();
    return { success: true };
  });
}

/**
 * Cleanup storage service
 * Called during app shutdown in main.ts
 */
export function cleanupC4Storage(): void {
  if (storageService) {
    storageService.close();
    storageService = null;
  }
}
