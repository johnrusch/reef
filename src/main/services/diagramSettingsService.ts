import { ipcMain } from 'electron';
import Store from 'electron-store';

interface DiagramSettings {
  defaultModel: 'haiku' | 'sonnet' | 'opus';
  autoGenerateOnLoad: boolean;
  defaultDiagramType: 'component' | 'class' | 'sequence';
  defaultDetailLevel: 'overview' | 'architectural' | 'detailed';
  excludedPatterns: string[];
  plantUmlServerUrl: string;
  maxTokenBudget: number;
  cacheEnabled: boolean;
  cacheDuration: number;
}

class DiagramSettingsService {
  private store: Store;
  private readonly SETTINGS_KEY = 'diagramSettings';
  
  constructor() {
    // Initialize electron-store with encryption for sensitive settings
    this.store = new Store({
      encryptionKey: 'reef-diagram-settings-key', // In production, use a more secure key
      name: 'diagram-settings',
    });
    
    this.registerHandlers();
  }
  
  private registerHandlers() {
    ipcMain.handle('diagram-settings:get', async () => {
      return this.getSettings();
    });
    
    ipcMain.handle('diagram-settings:set', async (_, settings: DiagramSettings) => {
      return this.setSettings(settings);
    });
    
    ipcMain.handle('diagram-settings:reset', async () => {
      return this.resetSettings();
    });
  }
  
  private getSettings(): DiagramSettings {
    const defaultSettings: DiagramSettings = {
      defaultModel: 'haiku',
      autoGenerateOnLoad: false,
      defaultDiagramType: 'component',
      defaultDetailLevel: 'overview',
      excludedPatterns: ['node_modules/**', 'dist/**', 'build/**', '*.test.*', '*.spec.*'],
      plantUmlServerUrl: '', // Empty by default - require explicit configuration
      maxTokenBudget: 15000,
      cacheEnabled: true,
      cacheDuration: 86400000, // 24 hours in ms
    };
    
    return this.store.get(this.SETTINGS_KEY, defaultSettings) as DiagramSettings;
  }
  
  private setSettings(settings: DiagramSettings): void {
    // Validate settings before saving
    if (settings.plantUmlServerUrl && !this.isValidUrl(settings.plantUmlServerUrl)) {
      throw new Error('Invalid PlantUML server URL');
    }
    
    if (settings.maxTokenBudget < 1000 || settings.maxTokenBudget > 100000) {
      throw new Error('Token budget must be between 1,000 and 100,000');
    }
    
    this.store.set(this.SETTINGS_KEY, settings);
  }
  
  private resetSettings(): void {
    this.store.delete(this.SETTINGS_KEY);
  }
  
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

// Create and export instance to ensure handlers are registered
const diagramSettingsService = new DiagramSettingsService();
export { diagramSettingsService };