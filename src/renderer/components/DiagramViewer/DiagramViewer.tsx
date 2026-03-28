import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { DiagramPanel } from './DiagramPanel';
import { DiagramControls } from './DiagramControls';
import { StalenessBadge } from './StalenessBadge';
import { DiagramBreadcrumbs } from './DiagramBreadcrumbs';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { CommandPalette } from './CommandPalette';
import { GeneratePromptCard } from './GeneratePromptCard';
import { C4HierarchyTree } from './C4HierarchyTree';
import { useNavigationStore, getNextLevel, type DiagramSearchItem } from '../../stores/navigationStore';
import { useDiagramStateStore } from '../../stores/diagramStateStore';
import { useDiagramNavigationStore } from '../../stores/diagramNavigationStore';
import { useRepositoryStore } from '../../stores/repositoryStore';
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
    elementId?: string;
    skipCache?: boolean;
  }) => Promise<void>;
  onExport: (format: 'svg' | 'png') => void;
  showChanges?: boolean;
  preRenderedSvg?: string;
  onSvgGenerated?: (svg: string) => void;
  staleLevelCount?: number;
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
  showChanges: _showChangesProp = false,
  preRenderedSvg,
  onSvgGenerated,
  staleLevelCount,
}) => {
  const [showChanges, setShowChanges] = useState<boolean>(_showChangesProp);
  const [currentOptions, setCurrentOptions] = useState({
    type: metadata.diagramType,
    detailLevel: metadata.detailLevel,
    focusArea: metadata.focusArea,
    model: metadata.model || 'haiku' as ModelType,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRegeneratingFromBadge, setIsRegeneratingFromBadge] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Subscribe to navigation store
  const navigationStore = useNavigationStore();

  // Subscribe to diagram state store
  const { getState, setState, loadStatesFromBackend } = useDiagramStateStore();

  // Get current diagram state
  const currentLevel = currentOptions.type.replace('c4-', '') as any;
  const currentElementId = navigationStore.currentLevel().elementId;
  const currentState = getState(_repository?.path || '', currentLevel, currentElementId);
  const stateEntry = useDiagramStateStore(s => s.getEntry(_repository?.path || '', currentLevel, currentElementId));

  // Derive isStale from diagramStateStore (hash-based staleness from ReefStalenessService)
  const isStale = useMemo(() => {
    if (!_repository?.path || !currentLevel) return false;
    return getState(_repository.path, currentLevel) === 'stale';
  }, [_repository?.path, currentLevel, getState]);

  // Compute highlight element IDs for SVG change visualization
  const affectedElements = useDiagramStateStore(
    s => s.getAffectedElements(_repository?.path || '', currentLevel)
  );
  const directChangedIds = useMemo(
    () => affectedElements.filter(e => e.isDirect).map(e => e.elementId),
    [affectedElements]
  );
  const inheritedChangedIds = useMemo(
    () => affectedElements.filter(e => !e.isDirect).map(e => e.elementId),
    [affectedElements]
  );

  // Compute counts for ChangeBadge display
  const directCount = directChangedIds.length;
  const inheritedCount = inheritedChangedIds.length;

  // Read changed file paths from store for tooltip display
  const changedFilePaths = useDiagramStateStore(
    s => s.getChangedFiles(_repository?.path || '', currentLevel)
  );

  const handleControlChange = (updates: Partial<typeof currentOptions>) => {
    setCurrentOptions(prev => ({ ...prev, ...updates }));
  };

  const handleRegenerate = useCallback(async () => {
    if (isGenerating) return;

    const repoPath = _repository?.path;
    const level = currentOptions.type.replace('c4-', '');
    const elementId = navigationStore.currentLevel().elementId;

    if (repoPath) {
      // Update state to generating
      await window.reef.c4Storage.updateState(repoPath, level, 'generating', elementId);
    }

    try {
      await onRegenerateDiagram({ ...currentOptions, skipCache: true });

      // Transition to 'fresh' after successful regeneration
      if (repoPath) {
        try {
          await window.reef.c4Storage.updateState(repoPath, level, 'fresh', elementId);
        } catch (e) {
          console.error('Failed to update state to fresh:', e);
        }
      }
    } catch (error) {
      console.error('Diagram generation failed:', error);

      if (repoPath) {
        // Use user-friendly message for UI (no technical details exposed)
        const userMessage = 'Could not generate diagram. Please try again.';
        await window.reef.c4Storage.updateState(repoPath, level, 'error', elementId, userMessage);
      }
    }
  }, [isGenerating, currentOptions, onRegenerateDiagram, _repository?.path, navigationStore]);

  const handleRegenerateFromBadge = useCallback(async () => {
    setIsRegeneratingFromBadge(true);

    try {
      await onRegenerateDiagram({ ...currentOptions, skipCache: true });
    } catch (error) {
      // Staleness state is driven by the store, which updates automatically
      // when the IPC c4-storage:state-changed event fires
      console.error('Regeneration failed:', error);
    } finally {
      setIsRegeneratingFromBadge(false);
    }
  }, [currentOptions, onRegenerateDiagram]);

  const handleNavigateToDiff = useCallback((filePath: string) => {
    const { setIntent } = useDiagramNavigationStore.getState();
    const { setActiveTab } = useRepositoryStore.getState();

    // Snapshot current diagram position for back navigation
    // CRITICAL: setIntent BEFORE setActiveTab to avoid race condition (Pitfall 3)
    setIntent({
      targetFile: filePath,
      returnStack: [...navigationStore.stack],
      returnLevel: currentOptions.type,
      createdAt: Date.now(),
    });

    // Switch to commit tab after intent is set
    setActiveTab('commit');
  }, [navigationStore.stack, currentOptions.type]);

  const handleBreadcrumbNavigate = useCallback(async (index: number) => {
    const targetLevel = navigationStore.stack[index];
    navigationStore.navigateTo(index);

    // Update diagram type to match navigation
    const newType = `c4-${targetLevel.level}` as DiagramType;
    handleControlChange({ type: newType });

    // Trigger regeneration with the target elementId
    await onRegenerateDiagram({
      ...currentOptions,
      type: newType,
      elementId: targetLevel.elementId,
    });
  }, [navigationStore, currentOptions, onRegenerateDiagram]);

  const handleTreeNavigate = useCallback(async (level: 'context' | 'container' | 'component' | 'code') => {
    const targetIndex = navigationStore.stack.findIndex(l => l.level === level);
    if (targetIndex >= 0) {
      // Level exists in stack — navigate breadcrumb-style
      await handleBreadcrumbNavigate(targetIndex);
    } else if (level === 'component' || level === 'code') {
      // Component/code levels require an elementId from drill-down.
      // Can't navigate directly without having drilled into a container/component first.
      return;
    } else {
      // Context/container — reset navigation and load that level
      navigationStore.reset();
      const newType = `c4-${level}` as DiagramType;
      handleControlChange({ type: newType });
      await onRegenerateDiagram({
        ...currentOptions,
        type: newType,
        elementId: undefined,
      });
    }
  }, [navigationStore, currentOptions, onRegenerateDiagram, handleBreadcrumbNavigate]);

  const handleElementClick = useCallback(async (elementId: string) => {
    // Don't process clicks during generation or for non-C4 diagrams
    if (isGenerating || !currentOptions.type.startsWith('c4-')) return;

    const currentNavLevel = navigationStore.currentLevel();
    const nextLevel = getNextLevel(currentNavLevel.level);

    // Code level: check if this element has changes — navigate to diff viewer
    if (!nextLevel) {
      const isChangedElement = directChangedIds.includes(elementId) || inheritedChangedIds.includes(elementId);
      if (isChangedElement && changedFilePaths.length > 0) {
        handleNavigateToDiff(changedFilePaths[0]);
      }
      return;
    }

    // Determine human-readable name for breadcrumb
    // The elementId is sanitized (e.g., "reef_main"), convert back to readable
    const elementName = elementId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    console.log(`Drilling down to ${nextLevel}: ${elementId} (${elementName})`);

    // Push new level to navigation stack
    navigationStore.push({
      level: nextLevel,
      elementId: elementId,
      elementName: elementName,
    });

    // Update diagram type and regenerate
    const newType = `c4-${nextLevel}` as DiagramType;
    handleControlChange({ type: newType });

    try {
      await onRegenerateDiagram({
        ...currentOptions,
        type: newType,
        elementId: elementId,
      });
    } catch (error) {
      // Revert navigation on error
      navigationStore.pop();
      console.error('Failed to drill down:', error);
    }
  }, [isGenerating, currentOptions, navigationStore, onRegenerateDiagram, directChangedIds, inheritedChangedIds, changedFilePaths, handleNavigateToDiff]);

  const handleCommandPaletteNavigate = useCallback(async (item: DiagramSearchItem) => {
    // Reset navigation to context first
    navigationStore.reset();

    // Determine the target diagram type
    const newType = `c4-${item.level}` as DiagramType;
    handleControlChange({ type: newType });

    // If navigating to a specific element (not just a level), push it to nav stack
    if (item.elementId) {
      navigationStore.push({
        level: item.level,
        elementId: item.elementId,
        elementName: item.name,
      });
    }

    // Trigger regeneration with the target elementId
    await onRegenerateDiagram({
      ...currentOptions,
      type: newType,
      elementId: item.elementId,
    });
  }, [navigationStore, currentOptions, onRegenerateDiagram]);

  const isClickableLevel = useMemo(() => {
    if (!currentOptions.type.startsWith('c4-')) return false;
    const level = currentOptions.type.replace('c4-', '');
    // Code level elements can't be drilled into
    return level !== 'code';
  }, [currentOptions.type]);

  // Initialize storage on mount
  useEffect(() => {
    // Initialize storage and run migration if needed (silent)
    window.reef.c4Storage.initialize().catch(console.error);
  }, []);

  // Load state from backend when repo changes
  useEffect(() => {
    const repoPath = _repository?.path;
    if (repoPath) {
      window.reef.c4Storage.getRepoStates(repoPath)
        .then(states => loadStatesFromBackend(states))
        .catch(console.error);
    }
  }, [_repository?.path, loadStatesFromBackend]);

  // Subscribe to state changes from main process
  useEffect(() => {
    const repoPath = _repository?.path;
    if (!repoPath) return;

    const unsubscribe = window.reef.c4Storage.onStateChanged((_, data) => {
      if (data.repoPath === repoPath) {
        setState(data.repoPath, data.level, data.state, data.elementId, data.errorMessage);

        // Phase 7: Store enriched element mapping from ChangeTrackingService
        if (data.affectedElements && data.affectedElements.length > 0) {
          const { setAffectedElements } = useDiagramStateStore.getState();
          setAffectedElements(data.repoPath, data.level, data.affectedElements);
        }

        // Phase 8: Store changed file paths for tooltip display
        if (data.changedFiles && data.changedFiles.length > 0) {
          const { setChangedFiles } = useDiagramStateStore.getState();
          setChangedFiles(data.repoPath, data.level, data.changedFiles);
        }
      }
    });

    return unsubscribe;
  }, [_repository?.path, setState]);

  // Load persisted change tracking data on mount/repo change
  useEffect(() => {
    const repoPath = _repository?.path;
    if (!repoPath) return;

    const loadChangeTracking = async () => {
      const levels: Array<'context' | 'container' | 'component' | 'code'> = ['context', 'container', 'component', 'code'];
      for (const level of levels) {
        try {
          const tracking = await window.reef.c4Storage.getChangeTracking(repoPath, level);
          if (tracking && tracking.affectedElements.length > 0) {
            const { setAffectedElements, setChangedFiles } = useDiagramStateStore.getState();
            setAffectedElements(repoPath, level, tracking.affectedElements);
            // Also load changedFiles for tooltip display
            if (tracking.changedFiles && tracking.changedFiles.length > 0) {
              setChangedFiles(repoPath, level, tracking.changedFiles);
            }
          }
        } catch (error) {
          console.error(`Error loading change tracking for ${repoPath}:${level}:`, error);
        }
      }
    };

    void loadChangeTracking();
  }, [_repository?.path]);

  // Start/stop file watcher when diagram type changes
  useEffect(() => {
    // Only watch for C4 diagram types
    if (!currentOptions.type.startsWith('c4-')) return;

    const level = currentOptions.type.replace('c4-', '');
    const repoPath = _repository?.path;

    if (!repoPath) return;

    // Start watching
    window.reef.fileWatcher.start(repoPath, level);

    return () => {
      window.reef.fileWatcher.stop(repoPath, level);
    };
  }, [currentOptions.type, _repository?.path]);

  // Reset navigation when repository changes
  useEffect(() => {
    if (_repository?.path && _repository.path !== navigationStore.repositoryPath) {
      navigationStore.setRepository(_repository.path);
    }
  }, [_repository?.path, navigationStore]);

  // Sync navigation state with diagram type changes
  useEffect(() => {
    const typeLevel = currentOptions.type.replace('c4-', '') as any;
    const currentNavLevel = navigationStore.currentLevel();

    // Only reset if navigating "up" via type selector (not via breadcrumb)
    if (typeLevel !== currentNavLevel.level && currentOptions.type.startsWith('c4-')) {
      const typeIndex = ['context', 'container', 'component', 'code'].indexOf(typeLevel);
      const navIndex = ['context', 'container', 'component', 'code'].indexOf(currentNavLevel.level);

      if (typeIndex < navIndex) {
        // User selected a higher level, truncate navigation
        const targetIndex = navigationStore.stack.findIndex(l => l.level === typeLevel);
        if (targetIndex >= 0) {
          navigationStore.navigateTo(targetIndex);
        } else {
          navigationStore.reset();
        }
      }
    }
  }, [currentOptions.type, navigationStore]);

  // Keyboard shortcuts using react-hotkeys-hook
  // Fullscreen toggle (F key)
  useHotkeys('f', () => setIsFullscreen(prev => !prev), {
    preventDefault: true,
    enableOnFormTags: false
  });

  // Exit fullscreen (Escape)
  useHotkeys('escape', () => {
    if (isFullscreen) setIsFullscreen(false);
  }, { enableOnFormTags: true }, [isFullscreen]);

  // Regenerate diagram (Cmd/Ctrl + R)
  useHotkeys('mod+r', () => handleRegenerate(), {
    preventDefault: true,
    enableOnFormTags: false
  }, [handleRegenerate]);

  // Breadcrumb navigation (arrow keys)
  useHotkeys('left', () => {
    if (navigationStore.canDrillUp() && currentOptions.type.startsWith('c4-')) {
      const currentIndex = navigationStore.stack.length - 1;
      if (currentIndex > 0) {
        handleBreadcrumbNavigate(currentIndex - 1);
      }
    }
  }, { preventDefault: true, enableOnFormTags: false }, [navigationStore, handleBreadcrumbNavigate, currentOptions.type]);

  useHotkeys('right', () => {
    // Right arrow could be used for forward navigation if we track history
    // For now, no-op since we don't have forward history
  }, { preventDefault: true, enableOnFormTags: false });

  // Open keyboard shortcuts help (Shift + ?)
  useHotkeys('shift+?', () => setShowShortcutsHelp(true), {
    preventDefault: true,
    enableOnFormTags: false
  });

  // Open command palette (Cmd/Ctrl + K)
  useHotkeys('mod+k', () => setShowCommandPalette(true), {
    preventDefault: true,
    enableOnFormTags: false
  });

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

  const renderDiagramWithOverlay = () => {
    // Show GeneratePromptCard for never-generated state
    if (currentState === 'never_generated' && !diagram) {
      return (
        <GeneratePromptCard
          repoName={_repository?.name || 'Repository'}
          onGenerate={handleRegenerate}
          isGenerating={isGenerating}
        />
      );
    }

    return (
      <>
        <DiagramPanel
          content={diagram}
          metadata={metadata}
          changedFiles={changedFiles}
          showChanges={showChanges}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onExport={onExport}
          onElementClick={handleElementClick}
          isClickable={isClickableLevel}
          diagramState={currentState}
          diagramErrorMessage={stateEntry?.errorMessage}
          onRegenerateFromBadge={handleRegenerateFromBadge}
          directChangedIds={directChangedIds}
          inheritedChangedIds={inheritedChangedIds}
          directCount={directCount}
          inheritedCount={inheritedCount}
          changedFilePaths={changedFilePaths}
          preRenderedSvg={preRenderedSvg}
          onSvgGenerated={onSvgGenerated}
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
  };

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
        isGenerating={isGenerating}
        onRegenerate={handleRegenerate}
        showChanges={showChanges}
        onToggleChanges={() => setShowChanges(prev => !prev)}
        staleLevelCount={staleLevelCount}
      />

      {currentOptions.type.startsWith('c4-') && (
        <DiagramBreadcrumbs
          stack={navigationStore.stack}
          onNavigate={handleBreadcrumbNavigate}
          disabled={isGenerating}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {currentOptions.type.startsWith('c4-') && (
          <C4HierarchyTree
            onNavigate={handleTreeNavigate}
            disabled={isGenerating}
          />
        )}
        <div className="flex-1 min-w-0 relative">
          {renderDiagramWithOverlay()}
        </div>
      </div>
      
      {error && diagram && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-800/50">
          <p className="text-sm text-red-400">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {error}
          </p>
        </div>
      )}

      {showShortcutsHelp && (
        <KeyboardShortcutsHelp
          open={showShortcutsHelp}
          onOpenChange={setShowShortcutsHelp}
        />
      )}

      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        onNavigate={handleCommandPaletteNavigate}
      />
    </div>
  );
};