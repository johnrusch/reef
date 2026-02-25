import React, { useState, useEffect } from 'react';
import { Sparkles, DollarSign, ToggleLeft, ToggleRight, Info, HardDrive, Database } from 'lucide-react';
import type { DiagramType, DetailLevel, ModelType } from '../DiagramViewer/DiagramViewer';
import { useDiagramStateStore } from '../../stores/diagramStateStore';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface DiagramSettingsProps {
  onSettingsChange?: (settings: DiagramSettings) => void;
}

export interface DiagramSettings {
  defaultModel: ModelType;
  autoGenerateOnLoad: boolean;
  defaultDiagramType: DiagramType;
  defaultDetailLevel: DetailLevel;
  excludedPatterns: string[];
  plantUmlServerUrl: string;
  maxTokenBudget: number;
  cacheEnabled: boolean;
  cacheDuration: number;
  autoGenerateOnRepoAdd: 'prompt' | 'always' | 'never';
}

export const DiagramSettings: React.FC<DiagramSettingsProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<DiagramSettings>({
    defaultModel: 'haiku',
    autoGenerateOnLoad: false,
    defaultDiagramType: 'component',
    defaultDetailLevel: 'overview',
    excludedPatterns: ['node_modules/**', 'dist/**', 'build/**', '*.test.*', '*.spec.*'],
    plantUmlServerUrl: 'http://localhost:8080/plantuml',
    maxTokenBudget: 15000,
    cacheEnabled: true,
    cacheDuration: 86400000, // 24 hours in ms
    autoGenerateOnRepoAdd: 'prompt',
  });

  const [newPattern, setNewPattern] = useState('');
  const [showCostEstimate, setShowCostEstimate] = useState(false);
  const [storageStats, setStorageStats] = useState<{
    path: string;
    sizeBytes: number;
    diagramCount: number;
  } | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    try {
      const stats = await window.reef.c4Storage.getStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const stored = await window.reef.diagramSettings.get();
      if (stored) {
        setSettings(stored);
        // Also update localStorage for PlantUMLRenderer compatibility
        if (stored.plantUmlServerUrl) {
          localStorage.setItem('plantUmlServerUrl', stored.plantUmlServerUrl);
        }
      }
    } catch (error) {
      console.error('Failed to load diagram settings:', error);
    }
  };

  const saveSettings = async (newSettings: DiagramSettings) => {
    try {
      await window.reef.diagramSettings.set(newSettings);
      // Also update localStorage for PlantUMLRenderer compatibility
      if (newSettings.plantUmlServerUrl) {
        localStorage.setItem('plantUmlServerUrl', newSettings.plantUmlServerUrl);
      } else {
        localStorage.removeItem('plantUmlServerUrl');
      }
      setSettings(newSettings);
      onSettingsChange?.(newSettings);
    } catch (error) {
      console.error('Failed to save diagram settings:', error);
    }
  };

  const updateSetting = <K extends keyof DiagramSettings>(
    key: K,
    value: DiagramSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const addExcludedPattern = () => {
    if (newPattern && !settings.excludedPatterns.includes(newPattern)) {
      const newPatterns = [...settings.excludedPatterns, newPattern];
      updateSetting('excludedPatterns', newPatterns);
      setNewPattern('');
    }
  };

  const removeExcludedPattern = (pattern: string) => {
    const newPatterns = settings.excludedPatterns.filter(p => p !== pattern);
    updateSetting('excludedPatterns', newPatterns);
  };

  const estimateMonthlyCost = (): string => {
    const avgDiagramsPerDay = settings.autoGenerateOnLoad ? 10 : 3;
    const tokensPerDiagram = settings.maxTokenBudget;
    const modelCosts = {
      haiku: 0.25 / 1000000,
      sonnet: 3 / 1000000,
      opus: 15 / 1000000,
    };

    const dailyCost = avgDiagramsPerDay * tokensPerDiagram * modelCosts[settings.defaultModel];
    const monthlyCost = dailyCost * 30;

    if (monthlyCost < 0.01) return '<$0.01';
    if (monthlyCost < 1) return `~$${monthlyCost.toFixed(2)}`;
    return `~$${Math.round(monthlyCost)}`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    setShowClearConfirm(false);

    try {
      await window.reef.c4Storage.clearAll();

      // CRITICAL: Sync frontend state store to prevent UI desync
      useDiagramStateStore.getState().states.clear();

      // Refresh stats
      const newStats = await window.reef.c4Storage.getStats();
      setStorageStats(newStats);
    } catch (error) {
      console.error('Clear failed:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-200">AI Diagram Settings</h3>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Default AI Model
          </label>
          <select
            value={settings.defaultModel}
            onChange={(e) => updateSetting('defaultModel', e.target.value as ModelType)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm"
          >
            <option value="haiku">Claude 3 Haiku (Fast & Economical)</option>
            <option value="sonnet">Claude 3.5 Sonnet (Balanced)</option>
            <option value="opus">Claude 3 Opus (Most Capable)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Model used for generating architectural diagrams
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-400">
              Auto-generate on Repository Load
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Automatically create diagrams when opening repositories
            </p>
          </div>
          <button
            onClick={() => updateSetting('autoGenerateOnLoad', !settings.autoGenerateOnLoad)}
            className="relative"
          >
            {settings.autoGenerateOnLoad ? (
              <ToggleRight className="w-8 h-8 text-blue-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-500" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Default Diagram Type
            </label>
            <select
              value={settings.defaultDiagramType}
              onChange={(e) => updateSetting('defaultDiagramType', e.target.value as DiagramType)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm"
            >
              <option value="component">Component Diagram</option>
              <option value="class">Class Diagram</option>
              <option value="sequence">Sequence Diagram</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Default Detail Level
            </label>
            <select
              value={settings.defaultDetailLevel}
              onChange={(e) => updateSetting('defaultDetailLevel', e.target.value as DetailLevel)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm"
            >
              <option value="overview">Overview</option>
              <option value="architectural">Architectural</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Excluded File Patterns
          </label>
          <div className="space-y-2">
            {settings.excludedPatterns.map((pattern, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-900 px-3 py-2 rounded">
                <code className="text-sm text-gray-300">{pattern}</code>
                <button
                  onClick={() => removeExcludedPattern(pattern)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="e.g., **/*.min.js"
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm"
                onKeyPress={(e) => e.key === 'Enter' && addExcludedPattern()}
              />
              <button
                onClick={addExcludedPattern}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
              >
                Add Pattern
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            PlantUML Server URL
          </label>
          <div className="space-y-2">
            <select
              value={settings.plantUmlServerUrl}
              onChange={(e) => updateSetting('plantUmlServerUrl', e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm"
            >
              <option value="http://localhost:8080/plantuml">Local Server (Recommended)</option>
              <option value="https://www.plantuml.com/plantuml">Public Server (plantuml.com)</option>
              <option value="custom">Custom URL...</option>
            </select>
            
            {settings.plantUmlServerUrl === 'custom' && (
              <input
                type="text"
                placeholder="Enter custom PlantUML server URL"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm"
                onChange={(e) => updateSetting('plantUmlServerUrl', e.target.value)}
              />
            )}
          </div>
          
          {settings.plantUmlServerUrl === 'http://localhost:8080/plantuml' && (
            <p className="text-xs text-gray-500 mt-1">
              Start local server: <code className="bg-gray-800 px-1 rounded">docker run -d -p 8080:8080 plantuml/plantuml-server</code>
            </p>
          )}
          
          {settings.plantUmlServerUrl === 'https://www.plantuml.com/plantuml' && (
            <p className="text-xs text-yellow-500 mt-1">
              ⚠️ Warning: Diagram data will be sent to external servers. Use local server for sensitive data.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Token Budget
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5000"
              max="50000"
              step="5000"
              value={settings.maxTokenBudget}
              onChange={(e) => updateSetting('maxTokenBudget', parseInt(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <span className="text-sm text-gray-300 w-20 text-right">
              {(settings.maxTokenBudget / 1000).toFixed(0)}k tokens
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Higher token budgets allow for more detailed diagrams but increase costs
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-400">
              Enable Diagram Caching
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Store generated diagrams locally for faster loading
            </p>
          </div>
          <button
            onClick={() => updateSetting('cacheEnabled', !settings.cacheEnabled)}
            className="relative"
          >
            {settings.cacheEnabled ? (
              <ToggleRight className="w-8 h-8 text-blue-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-500" />
            )}
          </button>
        </div>

        {settings.cacheEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Cache Duration
            </label>
            <select
              value={settings.cacheDuration}
              onChange={(e) => updateSetting('cacheDuration', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm"
            >
              <option value="3600000">1 Hour</option>
              <option value="21600000">6 Hours</option>
              <option value="86400000">24 Hours</option>
              <option value="604800000">1 Week</option>
              <option value="2592000000">30 Days</option>
            </select>
          </div>
        )}

        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <button
            onClick={() => setShowCostEstimate(!showCostEstimate)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-gray-300">Estimated Monthly Cost</span>
            </div>
            <span className="text-sm text-gray-400">{estimateMonthlyCost()}</span>
          </button>
          
          {showCostEstimate && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                Based on {settings.autoGenerateOnLoad ? '~10' : '~3'} diagrams/day with {settings.defaultModel} model
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Haiku estimate:</span>
                  <span className="text-gray-400">{'<$1/month'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Sonnet estimate:</span>
                  <span className="text-gray-400">$2-5/month</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Opus estimate:</span>
                  <span className="text-gray-400">$10-25/month</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
          <Info className="w-4 h-4 text-blue-400 mt-0.5" />
          <div className="text-xs text-gray-400">
            <p className="font-medium text-blue-400 mb-1">Keyboard Shortcuts</p>
            <div className="space-y-0.5">
              <div><kbd className="px-1 py-0.5 bg-gray-800 rounded">Cmd/Ctrl + R</kbd> - Regenerate diagram</div>
              <div><kbd className="px-1 py-0.5 bg-gray-800 rounded">Cmd/Ctrl + +/-</kbd> - Zoom in/out</div>
              <div><kbd className="px-1 py-0.5 bg-gray-800 rounded">F</kbd> - Toggle fullscreen</div>
            </div>
          </div>
        </div>

        {/* Auto-Generation */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles size={20} className="text-blue-400" />
            Auto-Generation
          </h3>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                When adding a new repository
              </label>
              <select
                value={settings.autoGenerateOnRepoAdd || 'prompt'}
                onChange={(e) => {
                  const newSettings = {
                    ...settings,
                    autoGenerateOnRepoAdd: e.target.value as 'prompt' | 'always' | 'never',
                  };
                  setSettings(newSettings);
                  saveSettings(newSettings);
                  onSettingsChange?.(newSettings);
                }}
                className="w-full bg-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="prompt">Ask me each time</option>
                <option value="always">Always generate diagrams</option>
                <option value="never">Never generate automatically</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Controls whether to generate C4 architecture diagrams when you add a new repository.
              </p>
            </div>
          </div>
        </div>

        {/* Storage Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-100">Diagram Storage</h3>

          {storageStats && (
            <div className="space-y-3">
              {/* Storage path display */}
              <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                <HardDrive className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300">Storage Location</p>
                  <p className="text-xs text-gray-500 truncate" title={storageStats.path}>
                    {storageStats.path}
                  </p>
                </div>
              </div>

              {/* Storage size and count */}
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                <Database className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    {formatSize(storageStats.sizeBytes)} used
                  </p>
                  <p className="text-xs text-gray-500">
                    {storageStats.diagramCount} diagram{storageStats.diagramCount !== 1 ? 's' : ''} stored
                  </p>
                </div>
              </div>

              {/* Clear button */}
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={isClearing || storageStats.diagramCount === 0}
                className="w-full px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 disabled:bg-gray-700/30 disabled:cursor-not-allowed text-red-400 disabled:text-gray-500 rounded-lg transition-colors"
              >
                {isClearing ? 'Clearing...' : 'Clear All Stored Diagrams'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Clear All Diagrams?"
        description="This will delete all stored C4 diagrams. You'll need to regenerate them when needed. This action cannot be undone."
        confirmText="Clear All"
        variant="danger"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};