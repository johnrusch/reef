import React, { useState, useEffect, useCallback } from 'react';
import { DiagramPanel } from './DiagramPanel';
import { DiagramControls } from './DiagramControls';
import { DiagramInfo } from './DiagramInfo';
import { StalenessBadge } from './StalenessBadge';
import { Loader2, AlertCircle } from 'lucide-react';

export type DiagramType = 'component' | 'class' | 'sequence' | 'c4-context' | 'c4-container' | 'c4-component' | 'c4-code';
export type DetailLevel = 'overview' | 'architectural' | 'detailed';
export type FocusArea = 'api' | 'database' | 'business-logic' | 'auth' | undefined;
export type ModelType = 'haiku' | 'sonnet' | 'opus';

export interface DiagramMetadata {
  tokensUsed?: {
    input: number;
    output: number;
  };
  generatedAt: string;
  diagramType: DiagramType;
  detailLevel: DetailLevel;
  focusArea?: FocusArea;
  repository: string;
  model: ModelType;
  generationTime: number;
  estimatedCost: number;
  cached: boolean;
  lastUpdated: string;
}

interface DiagramViewerProps {
  repository: any;
  diagram: string;
  metadata: DiagramMetadata;
  isGenerating: boolean;
  error: string | null;
  changedFiles?: string[];
  onRegenerateDiagram: (options: {
    type: DiagramType;
    detailLevel: DetailLevel;
    focusArea?: FocusArea;
    model?: ModelType;
  }) => Promise<void>;
  onExport: (format: 'svg' | 'png') => void;
  onShowChanges?: (enabled: boolean) => void;
  showChanges?: boolean;
}

export const DiagramViewer: React.FC<DiagramViewerProps> = ({
  repository: _repository,
  diagram,
  metadata,
  isGenerating,
  error,
  changedFiles = [],
  onRegenerateDiagram,
  onExport,
  onShowChanges,
  showChanges = false,
}) => {
  const [currentOptions, setCurrentOptions] = useState({
    type: metadata.diagramType,
    detailLevel: metadata.detailLevel,
    focusArea: metadata.focusArea,
    model: metadata.model || 'haiku' as ModelType,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [isRegeneratingFromBadge, setIsRegeneratingFromBadge] = useState(false);

  const handleControlChange = (updates: Partial<typeof currentOptions>) => {
    setCurrentOptions(prev => ({ ...prev, ...updates }));
  };

  const handleRegenerate = useCallback(async () => {
    if (isGenerating) return;
    await onRegenerateDiagram(currentOptions);
  }, [isGenerating, currentOptions, onRegenerateDiagram]);

  const handleRegenerateFromBadge = useCallback(async () => {
    setIsRegeneratingFromBadge(true);
    setIsStale(false); // Optimistic UI update

    try {
      await onRegenerateDiagram({ ...currentOptions });
    } catch (error) {
      // Restore stale state on error
      setIsStale(true);
      console.error('Regeneration failed:', error);
    } finally {
      setIsRegeneratingFromBadge(false);
    }
  }, [currentOptions, onRegenerateDiagram]);

  const handleForceRegenerate = useCallback(async () => {
    await onRegenerateDiagram({ ...currentOptions });
  }, [currentOptions, onRegenerateDiagram]);

  // Subscribe to staleness events from main process
  useEffect(() => {
    const handleStaleEvent = (_event: any, data: { repoPath: string; level: string }) => {
      // Check if this event is for current diagram
      const currentLevel = currentOptions.type.replace('c4-', '');
      if (data.level === currentLevel) {
        setIsStale(true);
      }
    };

    window.reef.ipc.on('diagram:stale', handleStaleEvent);

    return () => {
      window.reef.ipc.off('diagram:stale', handleStaleEvent);
    };
  }, [currentOptions.type]);

  // Start/stop file watcher when diagram type changes
  useEffect(() => {
    // Only watch for C4 diagram types
    if (!currentOptions.type.startsWith('c4-')) return;

    const level = currentOptions.type.replace('c4-', '');
    const repoPath = _repository?.path;

    if (!repoPath) return;

    // Start watching
    window.reef.fileWatcher.start(repoPath, level);

    // Check staleness on mount
    window.reef.fileWatcher.checkStaleness(repoPath, level).then(stale => {
      if (stale) setIsStale(true);
    });

    return () => {
      window.reef.fileWatcher.stop(repoPath, level);
    };
  }, [currentOptions.type, _repository?.path]);

  // Clear staleness when diagram is regenerated
  useEffect(() => {
    if (metadata.generatedAt) {
      setIsStale(false);
    }
  }, [metadata.generatedAt]);

  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Fullscreen toggle (F)
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
      
      // Exit fullscreen (Escape)
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      
      // Regenerate diagram (Cmd/Ctrl + R)
      if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleRegenerate();
      }
      
      // Zoom controls (Cmd/Ctrl + Plus/Minus)
      if ((e.key === '+' || e.key === '=') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // This would be handled by PlantUMLRenderer internally
      }
      if (e.key === '-' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // This would be handled by PlantUMLRenderer internally
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [isFullscreen, handleRegenerate]);

  if (error && !diagram) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center space-y-4 p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-300">Diagram Generation Failed</h3>
          <p className="text-sm text-gray-500 max-w-md">{error}</p>
          <button
            onClick={handleRegenerate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
          >
            Retry Generation
          </button>
        </div>
      </div>
    );
  }

  const renderDiagramWithOverlay = () => (
    <>
      <DiagramPanel
        content={diagram}
        metadata={metadata}
        changedFiles={changedFiles}
        showChanges={showChanges}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onExport={onExport}
      />
      <StalenessBadge
        isStale={isStale}
        isRegenerating={isRegeneratingFromBadge || isGenerating}
        onClick={handleRegenerateFromBadge}
      />
      {isGenerating && (
        <div className="absolute inset-0 bg-gray-900/75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-xl">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <div className="text-center">
                <p className="text-gray-300 font-medium">Regenerating Diagram</p>
                <p className="text-gray-500 text-sm mt-1">Analyzing repository with {currentOptions.model}...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900">
        {renderDiagramWithOverlay()}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <DiagramControls
        currentType={currentOptions.type}
        currentDetailLevel={currentOptions.detailLevel}
        currentFocusArea={currentOptions.focusArea}
        showChanges={showChanges}
        isGenerating={isGenerating}
        hasChangedFiles={changedFiles.length > 0}
        onTypeChange={(type) => handleControlChange({ type })}
        onDetailLevelChange={(detailLevel) => handleControlChange({ detailLevel })}
        onFocusAreaChange={(focusArea) => handleControlChange({ focusArea })}
        onShowChangesToggle={onShowChanges}
        onRegenerate={handleRegenerate}
        onForceRegenerate={handleForceRegenerate}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {renderDiagramWithOverlay()}
        </div>
        
        <DiagramInfo
          metadata={metadata}
          changedFilesCount={changedFiles.length}
          onRefreshFromCache={() => onRegenerateDiagram({ ...currentOptions })}
        />
      </div>
      
      {error && diagram && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-800/50">
          <p className="text-sm text-red-400">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
};