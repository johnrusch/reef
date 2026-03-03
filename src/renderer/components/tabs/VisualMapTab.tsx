import React, { useState, useEffect, useCallback } from 'react';
import { Map, FileCode, GitBranch, FolderTree, Settings, Play, AlertCircle, Key, FileText } from 'lucide-react';
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
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [diagram, setDiagram] = useState<string>('');
  const [metadata, setMetadata] = useState<DiagramMetadata | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showChanges, setShowChanges] = useState<boolean>(false);
  const [changedFiles, setChangedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'settings' | 'diagram' | 'tree'>('settings');
  
  const [diagramType, setDiagramType] = useState<DiagramType>('c4-context');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('overview');
  const [focusArea, setFocusArea] = useState<FocusArea | undefined>(undefined);
  const [modelType, setModelType] = useState<ModelType>('haiku');
  const [elementId, setElementId] = useState<string | undefined>(undefined);
  const [availableContainers, setAvailableContainers] = useState<string[]>([]);
  const [availableComponents, setAvailableComponents] = useState<string[]>([]);
  const [loadingElements, setLoadingElements] = useState<boolean>(false);
  const [svgContent, setSvgContent] = useState<string>('');

  const { getState, setState, loadStatesFromBackend } = useDiagramStateStore();

  useEffect(() => {
    checkConfiguration();
  }, []);

  useEffect(() => {
    // Reset elementId when switching to Context or Container diagram types
    if (diagramType === 'c4-context' || diagramType === 'c4-container') {
      setElementId(undefined);
    }
  }, [diagramType]);

  // Fetch available containers when switching to Component level
  useEffect(() => {
    if (diagramType === 'c4-component' && repository) {
      fetchAvailableContainers();
    }
  }, [diagramType, repository]);

  // Fetch available components when switching to Code level
  useEffect(() => {
    if (diagramType === 'c4-code' && repository) {
      fetchAvailableComponents();
    }
  }, [diagramType, repository]);

  // Load persisted diagram from storage on mount or repo/type change
  useEffect(() => {
    if (!repository) return;

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

  const fetchAvailableContainers = async () => {
    if (!repository) return;

    setLoadingElements(true);
    try {
      const result = await window.reef.diagram.getAvailableContainers(repository.path);
      if (result.success && result.containers.length > 0) {
        setAvailableContainers(result.containers);
        // Auto-select first container if none selected
        if (!elementId) {
          setElementId(result.containers[0]);
        }
      } else {
        setAvailableContainers([]);
        console.warn('No containers found for repository');
      }
    } catch (error) {
      console.error('Failed to fetch available containers:', error);
      setAvailableContainers([]);
    } finally {
      setLoadingElements(false);
    }
  };

  const fetchAvailableComponents = async () => {
    if (!repository) return;

    setLoadingElements(true);
    try {
      const result = await window.reef.diagram.getAvailableComponents(repository.path);
      if (result.success && result.components.length > 0) {
        setAvailableComponents(result.components);
        // Auto-select first component if none selected
        if (!elementId) {
          setElementId(result.components[0].toLowerCase());
        }
      } else {
        setAvailableComponents([]);
        console.warn('No components found for repository');
      }
    } catch (error) {
      console.error('Failed to fetch available components:', error);
      setAvailableComponents([]);
    } finally {
      setLoadingElements(false);
    }
  };

  const checkConfiguration = async () => {
    try {
      const result = await window.reef.diagram.checkConfiguration();
      setIsConfigured(result.configured);
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
        setIsConfigured(true);
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
        onExport={handleExport}
        onShowChanges={setShowChanges}
        showChanges={showChanges}
        preRenderedSvg={svgContent || undefined}
        onSvgGenerated={handleSvgGenerated}
      />
    );
  }

  // Show GeneratePromptCard when no diagram has ever been generated for this level
  if (currentState === 'never_generated' && !diagram) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <GeneratePromptCard
          repoName={repository?.name || 'Repository'}
          onGenerate={() => generateDiagram()}
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

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="max-w-3xl w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <Map className="w-20 h-20 text-gray-600" />
            <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              AI
            </div>
          </div>
          
          <h3 className="text-2xl font-semibold text-gray-300">
            AI-Powered Visual Map
          </h3>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Generate architectural diagrams of your codebase using Claude AI and PlantUML.
            Visualize your project structure, dependencies, and relationships.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="text-lg font-medium mb-4">Diagram Settings</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                C4 Architecture Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setDiagramType('c4-context')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    diagramType === 'c4-context'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <div>
                    <div className="font-medium">Context</div>
                    <div className="text-xs opacity-75">System boundaries</div>
                  </div>
                </button>
                <button
                  onClick={() => setDiagramType('c4-container')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    diagramType === 'c4-container'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <div>
                    <div className="font-medium">Container</div>
                    <div className="text-xs opacity-75">Deployable units</div>
                  </div>
                </button>
                <button
                  onClick={() => setDiagramType('c4-component')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    diagramType === 'c4-component'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <div>
                    <div className="font-medium">Component</div>
                    <div className="text-xs opacity-75">Code structure</div>
                  </div>
                </button>
                <button
                  onClick={() => setDiagramType('c4-code')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    diagramType === 'c4-code'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <div>
                    <div className="font-medium">Code</div>
                    <div className="text-xs opacity-75">Class details</div>
                  </div>
                </button>
              </div>
            </div>

            {diagramType === 'c4-component' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Select Container to Analyze
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Choose which container (deployable unit) to analyze in detail
                </p>
                {loadingElements ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-gray-400">Loading containers...</span>
                  </div>
                ) : availableContainers.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableContainers.map((container) => (
                      <button
                        key={container}
                        onClick={() => setElementId(container)}
                        className={`px-3 py-2 rounded text-sm transition-colors ${
                          elementId === container
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {container}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 py-2">
                    No containers found in this repository
                  </div>
                )}
              </div>
            )}

            {diagramType === 'c4-code' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Select Component to Analyze
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Choose which component to drill down into for class-level details
                </p>
                {loadingElements ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-gray-400">Loading components...</span>
                  </div>
                ) : availableComponents.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableComponents.map((component) => (
                      <button
                        key={component}
                        onClick={() => setElementId(component.toLowerCase())}
                        className={`px-3 py-2 rounded text-sm transition-colors ${
                          elementId === component.toLowerCase()
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {component}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 py-2">
                    No components found in this repository
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Detail Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setDetailLevel('overview')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    detailLevel === 'overview'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setDetailLevel('architectural')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    detailLevel === 'architectural'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Architectural
                </button>
                <button
                  onClick={() => setDetailLevel('detailed')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    detailLevel === 'detailed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Detailed
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Focus Area (Optional)
              </label>
              <div className="grid grid-cols-5 gap-2">
                <button
                  onClick={() => setFocusArea(undefined)}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    focusArea === undefined
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  None
                </button>
                <button
                  onClick={() => setFocusArea('api')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    focusArea === 'api'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  API
                </button>
                <button
                  onClick={() => setFocusArea('database')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    focusArea === 'database'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Database
                </button>
                <button
                  onClick={() => setFocusArea('business-logic')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    focusArea === 'business-logic'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Business Logic
                </button>
                <button
                  onClick={() => setFocusArea('auth')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    focusArea === 'auth'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Auth
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                AI Model
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setModelType('haiku')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    modelType === 'haiku'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <div>
                    <div className="font-medium">Haiku</div>
                    <div className="text-xs opacity-75">Fast & Cheap</div>
                  </div>
                </button>
                <button
                  onClick={() => setModelType('sonnet')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    modelType === 'sonnet'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <div>
                    <div className="font-medium">Sonnet</div>
                    <div className="text-xs opacity-75">Balanced</div>
                  </div>
                </button>
                <button
                  onClick={() => setModelType('opus')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    modelType === 'opus'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <div>
                    <div className="font-medium">Opus</div>
                    <div className="text-xs opacity-75">Most Capable</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConfigured ? (
                <span className="text-xs text-green-400">✓ API Configured</span>
              ) : (
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  <Settings className="w-4 h-4 inline mr-1" />
                  Configure API
                </button>
              )}
            </div>

            <button
              onClick={() => generateDiagram()}
              disabled={!isConfigured || isGenerating || !repository}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Generate Diagram
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setViewMode('tree')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            Traditional File Tree
          </button>
          <span className="text-xs text-gray-500">or generate an AI-powered diagram</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <FileCode className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <h4 className="text-sm font-medium text-gray-300 mb-1">Smart Analysis</h4>
            <p className="text-xs text-gray-500">
              AI extracts key components from your code
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <GitBranch className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h4 className="text-sm font-medium text-gray-300 mb-1">PlantUML Diagrams</h4>
            <p className="text-xs text-gray-500">
              Industry-standard diagram notation
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <FolderTree className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <h4 className="text-sm font-medium text-gray-300 mb-1">Cost Efficient</h4>
            <p className="text-xs text-gray-500">
              Uses Claude 3 Haiku for low-cost generation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};