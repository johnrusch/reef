import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AlertCircle, Key } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';
import plantumlEncoder from 'plantuml-encoder';
import { DiagramViewer, DiagramMetadata, DiagramType, DetailLevel, FocusArea, ModelType } from '../DiagramViewer/DiagramViewer';
import { useDiagramStateStore } from '../../stores/diagramStateStore';
import { GeneratePromptCard } from '../DiagramViewer/GeneratePromptCard';
import { DiagramStateBadge } from '../DiagramViewer/DiagramStateBadge';

interface VisualMapTabProps {
  repository: any;
  onNavigateToFile?: (path: string) => void;
}

export const VisualMapTab: React.FC<VisualMapTabProps> = ({ repository }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [diagram, setDiagram] = useState<string>('');
  const [metadata, setMetadata] = useState<DiagramMetadata | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showChanges] = useState<boolean>(false);
  const [changedFiles, setChangedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'diagram'>('diagram');

  const [diagramType, setDiagramType] = useState<DiagramType>('c4-context');
  const [detailLevel] = useState<DetailLevel>('overview');
  const [focusArea] = useState<FocusArea | undefined>(undefined);
  const [modelType] = useState<ModelType>('haiku');
  const [elementId, setElementId] = useState<string | undefined>(undefined);
  const [svgContent, setSvgContent] = useState<string>('');

  // Prevents Pitfall 5: double-load race when loadDiagram sets state before useEffect fires
  const skipLoadEffect = useRef(false);

  const { getState, setState, loadStatesFromBackend } = useDiagramStateStore();
  const { addToast } = useToastStore();

  const staleLevels = useMemo(() => {
    if (!repository?.path) return [];
    const levels = ['context', 'container'] as const;
    return levels.filter(level => getState(repository.path, level as any) === 'stale');
  }, [repository?.path, getState]);

  // Show "Generate All" in toolbar when context or container has never been generated
  const showGenerateAll = useMemo(() => {
    if (!repository?.path) return false;
    const levels = ['context', 'container'] as const;
    return levels.some(level => getState(repository.path, level as any) === 'never_generated');
  }, [repository?.path, getState]);

  useEffect(() => {
    checkConfiguration();
  }, []);

  useEffect(() => {
    // Reset elementId when switching to Context or Container diagram types
    if (diagramType === 'c4-context' || diagramType === 'c4-container') {
      setElementId(undefined);
    }
  }, [diagramType]);

  // Load persisted diagram from storage on mount or repo/type change
  useEffect(() => {
    if (!repository) return;

    // Guard against Pitfall 5: if loadDiagram already handled this update, skip
    if (skipLoadEffect.current) {
      skipLoadEffect.current = false;
      return;
    }

    const loadPersistedDiagram = async () => {
      try {
        // Get current level from diagramType
        const level = diagramType.replace('c4-', '');

        // NEW: Check for pre-rendered SVG first (PERF-01 fast path)
        const storedSvg = await window.reef.c4Storage.getSvg(
          repository.path,
          level,
          elementId
        );
        if (storedSvg) {
          setSvgContent(storedSvg);
          setDiagram(''); // Clear PlantUML text -- not needed when SVG is cached
          setMetadata({
            tokensUsed: undefined,
            generatedAt: new Date().toISOString(),
            diagramType: diagramType,
            detailLevel: detailLevel,
            focusArea: focusArea,
            repository: repository.name,
            model: modelType,
            generationTime: 0,
            estimatedCost: 0,
            cached: true,
            lastUpdated: new Date().toISOString(),
          });
          setViewMode('diagram');
          // Still load states
          const states = await window.reef.c4Storage.getRepoStates(repository.path);
          loadStatesFromBackend(states);
          return;
        }

        // Existing: fall back to PlantUML source
        const storedDiagram = await window.reef.c4Storage.getDiagram(
          repository.path,
          level,
          elementId
        );

        if (storedDiagram) {
          setDiagram(storedDiagram.diagramContent);
          setMetadata({
            tokensUsed: storedDiagram.tokensUsed
              ? { input: storedDiagram.tokensUsed, output: 0 }
              : undefined,
            generatedAt: storedDiagram.createdAt || new Date().toISOString(),
            diagramType: diagramType,
            detailLevel: detailLevel,
            focusArea: focusArea,
            repository: repository.name,
            model: (storedDiagram.modelUsed || 'haiku') as ModelType,
            generationTime: 0,
            estimatedCost: storedDiagram.generationCost || 0,
            cached: true,
            lastUpdated: storedDiagram.updatedAt || new Date().toISOString(),
          });
          setViewMode('diagram');
        }

        // Load all states for this repo
        const states = await window.reef.c4Storage.getRepoStates(repository.path);
        loadStatesFromBackend(states);
      } catch (error) {
        console.error('Failed to load persisted diagram:', error);
      }
    };

    loadPersistedDiagram();
  }, [repository, diagramType, elementId, loadStatesFromBackend]);

  // Subscribe to state changes from main process (needed for pre-DiagramViewer states)
  useEffect(() => {
    if (!repository) return;

    const unsubscribe = window.reef.c4Storage.onStateChanged((_, data) => {
      if (data.repoPath === repository.path) {
        setState(data.repoPath, data.level, data.state, data.elementId, data.errorMessage);
      }
    });

    return unsubscribe;
  }, [repository, setState]);

  const checkConfiguration = async () => {
    try {
      const result = await window.reef.diagram.checkConfiguration();
      if (!result.configured) {
        setShowApiKeyModal(true);
      }
    } catch (error) {
      console.error('Failed to check configuration:', error);
    }
  };

  const handleSetApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter a valid API key');
      return;
    }

    try {
      const result = await window.reef.diagram.setApiKey(apiKey);
      if (result.success) {
        setShowApiKeyModal(false);
        setError(null);
      } else {
        setError(result.error || 'Failed to set API key');
      }
    } catch (error) {
      setError('Failed to set API key');
      console.error('Failed to set API key:', error);
    }
  };

  const detectChangedFiles = useCallback(async () => {
    try {
      const status = await window.reef.git.getRepositoryStatus(repository.path);

      // Handle the status object structure
      const changed = [];

      // The status object might have files property or direct arrays
      if (status.files) {
        // If status has a files array
        changed.push(...status.files.filter((f: any) => f.working_dir !== ' ').map((f: any) => f.path));
      } else {
        // If status has individual arrays
        if (Array.isArray(status.modified)) changed.push(...status.modified);
        if (Array.isArray(status.not_added)) changed.push(...status.not_added);
        if (Array.isArray(status.created)) changed.push(...status.created);
      }

      setChangedFiles(changed);
    } catch (error) {
      console.error('Failed to get changed files:', error);
      setChangedFiles([]);
    }
  }, [repository]);

  useEffect(() => {
    if (repository && viewMode === 'diagram') {
      detectChangedFiles();
    }
  }, [repository, viewMode, detectChangedFiles]);

  // NAV-01 / NAV-02: Cache-first load function — read-only, never generates or writes
  const loadDiagram = useCallback(async (options: {
    type: DiagramType;
    elementId?: string;
  }): Promise<boolean> => {
    if (!repository) return false;
    const level = options.type.replace('c4-', '');

    // 1. SVG cache (LRU -> SQLite) — fastest path
    try {
      const cachedSvg = await window.reef.c4Storage.getSvg(
        repository.path, level, options.elementId
      );
      if (cachedSvg) {
        skipLoadEffect.current = true;
        setSvgContent(cachedSvg);
        setDiagram('');
        setDiagramType(options.type);
        setElementId(options.elementId);
        setMetadata({
          tokensUsed: undefined,
          generatedAt: new Date().toISOString(),
          diagramType: options.type,
          detailLevel,
          focusArea,
          repository: repository.name,
          model: modelType,
          generationTime: 0,
          estimatedCost: 0,
          cached: true,
          lastUpdated: new Date().toISOString(),
        });
        setIsGenerating(false);
        return true;
      }
    } catch (err) {
      console.error('SVG cache lookup failed:', err);
    }

    // 2. PlantUML source fallback (SQLite only)
    try {
      const storedDiagram = await window.reef.c4Storage.getDiagram(
        repository.path, level, options.elementId
      );
      if (storedDiagram) {
        skipLoadEffect.current = true;
        setSvgContent('');
        setDiagram(storedDiagram.diagramContent);
        setDiagramType(options.type);
        setElementId(options.elementId);
        setMetadata({
          tokensUsed: storedDiagram.tokensUsed
            ? { input: storedDiagram.tokensUsed, output: 0 }
            : undefined,
          generatedAt: storedDiagram.createdAt || new Date().toISOString(),
          diagramType: options.type,
          detailLevel,
          focusArea,
          repository: repository.name,
          model: (storedDiagram.modelUsed || 'haiku') as ModelType,
          generationTime: 0,
          estimatedCost: storedDiagram.generationCost || 0,
          cached: true,
          lastUpdated: storedDiagram.updatedAt || new Date().toISOString(),
        });
        setIsGenerating(false);
        return true;
      }
    } catch (err) {
      console.error('PlantUML storage lookup failed:', err);
    }

    // 3. Cache miss — caller decides whether to generate
    return false;
  }, [repository, detailLevel, focusArea, modelType]);

  // Subscribe to generation queue events for Generate All progress and completion
  // Must be declared AFTER loadDiagram (used in the completion handler)
  useEffect(() => {
    if (!repository) return;

    const unsubProgress = window.reef.c4Generation.onProgress((_, data) => {
      if (data.repoPath === repository.path) {
        // Keep isGenerating true while progress events arrive
        setIsGenerating(true);
      }
    });

    const unsubComplete = window.reef.c4Generation.onComplete((_, data) => {
      if (data.repoPath === repository.path) {
        setIsGenerating(false);

        if (data.success) {
          addToast({
            type: 'success',
            message: `Generated ${data.completedLevels.length} diagram level${data.completedLevels.length === 1 ? '' : 's'}`,
            duration: 4000,
          });
        } else {
          setError(data.errorMessage || 'Generation failed');
          addToast({
            type: 'error',
            message: data.errorMessage || 'Diagram generation failed',
            duration: 6000,
          });
        }

        // Reload states and display context diagram
        window.reef.c4Storage.getRepoStates(repository.path)
          .then(states => loadStatesFromBackend(states))
          .catch(console.error);

        // Load context diagram into view using the loadDiagram function from Plan 01
        loadDiagram({ type: 'c4-context', elementId: undefined }).catch(console.error);
      }
    });

    return () => {
      unsubProgress();
      unsubComplete();
    };
  }, [repository, loadStatesFromBackend, loadDiagram, addToast]);

  const handleSvgGenerated = useCallback(async (svg: string) => {
    if (!repository) return;
    const level = diagramType.replace('c4-', '');
    try {
      await window.reef.c4Storage.storeSvg(repository.path, level, svg, elementId);
    } catch (err) {
      console.error('Failed to store SVG:', err);
    }
  }, [repository, diagramType, elementId]);

  const generateDiagram = async (options?: {
    type?: DiagramType;
    detailLevel?: DetailLevel;
    focusArea?: FocusArea;
    model?: ModelType;
    elementId?: string;
    skipCache?: boolean;
  }) => {
    if (!repository) {
      setError('No repository selected');
      return;
    }

    setIsGenerating(true);
    setError(null);

    const finalOptions = {
      type: options?.type || diagramType,
      detailLevel: options?.detailLevel || detailLevel,
      focusArea: options?.focusArea !== undefined ? options.focusArea : focusArea,
      model: options?.model || modelType,
    };

    // Prefer elementId from options (drill-down click) over local state
    const finalElementId = options?.elementId ?? elementId;

    // Sync local state so persisted diagram loading and state tracking use the correct value
    if (options?.elementId && options.elementId !== elementId) {
      setElementId(options.elementId);
    }

    // Sync diagramType state for subsequent effect dependencies
    if (finalOptions.type !== diagramType) {
      setDiagramType(finalOptions.type as DiagramType);
    }

    // Get current level for state tracking
    const level = finalOptions.type.replace('c4-', '');

    // Check SVG cache for instant display (navigation/drill-down fast path)
    if (!options?.skipCache) {
      try {
        const cachedSvg = await window.reef.c4Storage.getSvg(
          repository.path,
          level,
          finalElementId
        );
        if (cachedSvg) {
          setSvgContent(cachedSvg);
          setDiagram('');
          setMetadata({
            tokensUsed: undefined,
            generatedAt: new Date().toISOString(),
            diagramType: finalOptions.type,
            detailLevel: finalOptions.detailLevel,
            focusArea: finalOptions.focusArea,
            repository: repository.name,
            model: finalOptions.model,
            generationTime: 0,
            estimatedCost: 0,
            cached: true,
            lastUpdated: new Date().toISOString(),
          });
          setViewMode('diagram');
          setIsGenerating(false);
          return;
        }
      } catch (err) {
        console.error('SVG cache lookup failed, proceeding with generation:', err);
      }

      // Check stored PlantUML source (generated but SVG not yet cached)
      try {
        const storedDiagram = await window.reef.c4Storage.getDiagram(
          repository.path,
          level,
          finalElementId
        );
        if (storedDiagram) {
          setSvgContent('');
          setDiagram(storedDiagram.diagramContent);
          setMetadata({
            tokensUsed: storedDiagram.tokensUsed
              ? { input: storedDiagram.tokensUsed, output: 0 }
              : undefined,
            generatedAt: storedDiagram.createdAt || new Date().toISOString(),
            diagramType: finalOptions.type,
            detailLevel: finalOptions.detailLevel,
            focusArea: finalOptions.focusArea,
            repository: repository.name,
            model: (storedDiagram.modelUsed || 'haiku') as ModelType,
            generationTime: 0,
            estimatedCost: storedDiagram.generationCost || 0,
            cached: true,
            lastUpdated: storedDiagram.updatedAt || new Date().toISOString(),
          });
          setViewMode('diagram');
          setIsGenerating(false);
          return;
        }
      } catch (err) {
        console.error('PlantUML storage lookup failed, proceeding with generation:', err);
      }
    }

    // Update state to 'generating'
    try {
      await window.reef.c4Storage.updateState(
        repository.path,
        level,
        'generating',
        finalElementId
      );
    } catch (e) {
      console.error('Failed to update state to generating:', e);
    }

    try {
      const startTime = Date.now();

      // Map DetailLevel to the expected format for the API
      const apiDetailLevel = finalOptions.detailLevel === 'architectural' ? 'detailed' : finalOptions.detailLevel;

      // Map FocusArea to the expected format for the API (exclude 'auth' as it's not supported in the API yet)
      const apiFocusArea = finalOptions.focusArea === 'auth' ? 'business-logic' : finalOptions.focusArea;

      let result;

      // C4 diagrams use static analysis and don't need pre-extracted context
      // They analyze the repository directly using ts-morph
      if (finalOptions.type.startsWith('c4-')) {
        result = await window.reef.diagram.generate(repository.path, {
          type: finalOptions.type,
          detailLevel: apiDetailLevel as 'overview' | 'detailed',
          focusArea: apiFocusArea as 'api' | 'database' | 'business-logic' | undefined,
          elementId: finalElementId,
        });
      } else {
        // Traditional UML diagrams use pre-extracted context
        // Map FocusArea for context extraction (API doesn't support 'auth' yet)
        const extractFocusArea = finalOptions.focusArea === 'auth' ? 'business-logic' : finalOptions.focusArea;

        const extractResult = await window.reef.context.extract(repository.path, {
          maxTokens: finalOptions.model === 'opus' ? 30000 : finalOptions.model === 'sonnet' ? 20000 : 15000,
          includeTests: false,
          focusArea: extractFocusArea as 'api' | 'database' | 'business-logic' | undefined,
        });

        if (!extractResult.formattedContext) {
          throw new Error('No context extracted from repository');
        }

        result = await window.reef.diagram.generate(extractResult.formattedContext, {
          type: finalOptions.type,
          detailLevel: apiDetailLevel as 'overview' | 'detailed',
          focusArea: apiFocusArea as 'api' | 'database' | 'business-logic' | undefined,
        });
      }

      const generationTime = Date.now() - startTime;

      if (result.success && result.diagram) {
        setSvgContent(''); // Clear cached SVG; PlantUMLRenderer will render from source
        setDiagram(result.diagram);

        const estimatedCost = calculateEstimatedCost(
          result.tokensUsed,
          finalOptions.model
        );

        const newMetadata: DiagramMetadata = {
          tokensUsed: result.tokensUsed,
          generatedAt: new Date().toISOString(),
          diagramType: finalOptions.type,
          detailLevel: finalOptions.detailLevel,
          focusArea: finalOptions.focusArea,
          repository: repository.name,
          model: finalOptions.model,
          generationTime,
          estimatedCost,
          cached: false,
          lastUpdated: new Date().toISOString(),
        };

        setMetadata(newMetadata);
        setViewMode('diagram');
        await detectChangedFiles();

        // Update state to 'fresh' after successful generation
        try {
          await window.reef.c4Storage.updateState(
            repository.path,
            level,
            'fresh',
            finalElementId
          );
        } catch (e) {
          console.error('Failed to update state to fresh:', e);
        }
      } else {
        throw new Error(result.error || 'Failed to generate diagram');
      }
    } catch (error) {
      console.error('Diagram generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate diagram');

      // Update state to 'error'
      try {
        await window.reef.c4Storage.updateState(
          repository.path,
          finalOptions.type.replace('c4-', ''),
          'error',
          finalElementId,
          'Could not generate diagram. Please try again.'
        );
      } catch (e) {
        console.error('Failed to update state to error:', e);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAllDiagrams = async () => {
    if (!repository) {
      setError('No repository selected');
      return;
    }

    // When stale levels exist, delegate to the stale-aware regeneration flow (D-08)
    if (staleLevels.length > 0) {
      return regenerateStaleLevels();
    }

    setIsGenerating(true);
    setError(null);

    // Delegate to generationQueueService — handles all 4 levels with elementId discovery
    try {
      await window.reef.c4Generation.enqueue(repository.path, repository.name);
    } catch (err) {
      console.error('Failed to enqueue generation:', err);
      setError('Failed to start diagram generation');
      setIsGenerating(false);
    }
  };

  const regenerateStaleLevels = async () => {
    if (!repository) return;
    const levelsToRegenerate = staleLevels.length > 0 ? staleLevels : ['context', 'container'] as const;

    setIsGenerating(true);
    setError(null);
    const completedLevels: string[] = [];
    const failedLevels: string[] = [];

    for (const level of levelsToRegenerate) {
      try {
        await window.reef.c4Storage.updateState(repository.path, level, 'generating');
        await window.reef.diagram.generate(repository.path, {
          type: `c4-${level}` as DiagramType,
          detailLevel: 'overview',
        });
        await window.reef.c4Storage.updateState(repository.path, level, 'fresh');
        completedLevels.push(level);
      } catch (err) {
        console.error(`Failed to regenerate ${level}:`, err);
        failedLevels.push(level);
        try {
          await window.reef.c4Storage.updateState(
            repository.path, level, 'error', undefined,
            'Could not regenerate diagram. Please try again.'
          );
        } catch (_) { /* ignore */ }
      }
    }

    // Load updated states
    try {
      const states = await window.reef.c4Storage.getRepoStates(repository.path);
      loadStatesFromBackend(states);
    } catch (_) { /* ignore */ }

    // Per D-12: Toast on completion
    if (completedLevels.length > 0 && failedLevels.length === 0) {
      addToast({
        type: 'success',
        message: `Regenerated ${completedLevels.length} level${completedLevels.length === 1 ? '' : 's'} — .reef/ updated`,
        duration: 4000,
      });
    }
    // Per D-14: Partial failure
    if (failedLevels.length > 0) {
      addToast({
        type: 'error',
        message: `Failed to regenerate: ${failedLevels.join(', ')}`,
        duration: 6000,
      });
    }

    // Reload current diagram display
    setDiagramType(diagramType); // trigger re-fetch via useEffect
    setIsGenerating(false);
  };

  const calculateEstimatedCost = (
    tokens: { input: number; output: number } | undefined,
    model: ModelType
  ): number => {
    if (!tokens) return 0;

    const costs = {
      haiku: { input: 0.25, output: 1.25 },
      sonnet: { input: 3, output: 15 },
      opus: { input: 15, output: 75 },
    };

    const modelCost = costs[model];
    const inputCost = (tokens.input / 1000000) * modelCost.input;
    const outputCost = (tokens.output / 1000000) * modelCost.output;

    return inputCost + outputCost;
  };

  const handleExport = (format: 'svg' | 'png') => {
    if (!diagram) return;

    const encoded = plantumlEncoder.encode(diagram);
    const serverUrl = localStorage.getItem('plantUmlServerUrl') ||
                     'http://localhost:8080/plantuml';

    const url = `${serverUrl}/${format}/${encoded}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${repository.name}-${metadata?.diagramType || 'diagram'}-${Date.now()}.${format}`;
    link.click();
  };

  if (showApiKeyModal) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
          <div className="flex items-center mb-4">
            <Key className="w-6 h-6 text-blue-400 mr-2" />
            <h3 className="text-lg font-semibold">Configure Anthropic API</h3>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            To use AI-powered diagram generation, please provide your Anthropic API key.
            You can get one from{' '}
            <a
              href="https://console.anthropic.com/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              console.anthropic.com
            </a>
          </p>

          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api..."
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm mb-4"
          />

          {error && (
            <div className="flex items-center text-red-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSetApiKey}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
            >
              Save API Key
            </button>
            <button
              onClick={() => setShowApiKeyModal(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get current diagram state for the selected level
  const currentLevel = diagramType.replace('c4-', '') as any;
  const currentState = getState(repository?.path || '', currentLevel, elementId);

  if (viewMode === 'diagram' && (diagram || svgContent) && metadata) {
    return (
      <DiagramViewer
        repository={repository}
        diagram={diagram || ''}
        metadata={metadata}
        isGenerating={isGenerating}
        error={error}
        changedFiles={changedFiles}
        onRegenerateDiagram={generateDiagram}
        onLoadDiagram={loadDiagram}
        onExport={handleExport}
        showChanges={showChanges}
        preRenderedSvg={svgContent || undefined}
        onSvgGenerated={handleSvgGenerated}
        staleLevelCount={staleLevels.length}
        showGenerateAll={showGenerateAll}
        onGenerateAll={generateAllDiagrams}
      />
    );
  }

  // Show GeneratePromptCard when no diagram has ever been generated for this level
  if (currentState === 'never_generated' && !diagram) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <GeneratePromptCard
          repoName={repository?.name || 'Repository'}
          onGenerate={generateAllDiagrams}
          isGenerating={isGenerating}
        />
      </div>
    );
  }

  // Show generating indicator during first-time generation (no diagram exists yet)
  if (currentState === 'generating' && !diagram) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="flex flex-col items-center gap-6">
          <DiagramStateBadge
            state="generating"
            onRegenerate={() => {}}
          />
          <p className="text-gray-400 text-sm">Analyzing repository with AI...</p>
        </div>
      </div>
    );
  }

  // Fallback: show GeneratePromptCard for any unmatched state
  return (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <GeneratePromptCard
        repoName={repository?.name || 'Repository'}
        onGenerate={generateAllDiagrams}
        isGenerating={isGenerating}
      />
    </div>
  );
};
