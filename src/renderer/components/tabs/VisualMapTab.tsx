import React, { useState, useEffect } from 'react';
import { Map, FileCode, GitBranch, FolderTree, Settings, Play, AlertCircle, Key } from 'lucide-react';
import { PlantUMLRenderer } from '../PlantUMLRenderer';

interface VisualMapTabProps {
  repository: any;
  onNavigateToFile?: (path: string) => void;
}

type DiagramType = 'component' | 'class' | 'sequence';
type DetailLevel = 'overview' | 'detailed';
type FocusArea = 'api' | 'database' | 'business-logic' | undefined;

export const VisualMapTab: React.FC<VisualMapTabProps> = ({ repository }) => {
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [diagram, setDiagram] = useState<string>('');
  const [metadata, setMetadata] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [diagramType, setDiagramType] = useState<DiagramType>('component');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('overview');
  const [focusArea, setFocusArea] = useState<FocusArea>(undefined);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const result = await window.reef.diagram.checkConfiguration();
      setIsConfigured(result.configured);
      if (!result.configured && !process.env.ANTHROPIC_API_KEY) {
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
      await window.reef.diagram.setApiKey(apiKey);
      setIsConfigured(true);
      setShowApiKeyModal(false);
      setError(null);
    } catch (error) {
      setError('Failed to set API key');
      console.error('Failed to set API key:', error);
    }
  };

  const generateDiagram = async () => {
    if (!repository) {
      setError('No repository selected');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const extractResult = await window.reef.context.extract(repository.path, {
        maxTokens: 15000,
        includeTests: false,
        focusArea,
      });

      if (!extractResult.formattedContext) {
        throw new Error('No context extracted from repository');
      }

      const result = await window.reef.diagram.generate(extractResult.formattedContext, {
        type: diagramType,
        detailLevel,
        focusArea,
      });

      if (result.success && result.diagram) {
        setDiagram(result.diagram);
        setMetadata({
          tokensUsed: result.tokensUsed,
          generatedAt: new Date().toISOString(),
          diagramType,
          repository: repository.name,
        });
      } else {
        throw new Error(result.error || 'Failed to generate diagram');
      }
    } catch (error) {
      console.error('Diagram generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate diagram');
    } finally {
      setIsGenerating(false);
    }
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

  if (diagram) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDiagram('')}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              ← Back to Settings
            </button>
            <span className="text-sm text-gray-500">
              {repository?.name} / {diagramType} diagram
            </span>
          </div>
          
          <button
            onClick={generateDiagram}
            disabled={isGenerating}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Regenerate
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <PlantUMLRenderer content={diagram} metadata={metadata} />
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
                Diagram Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setDiagramType('component')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    diagramType === 'component'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Component
                </button>
                <button
                  onClick={() => setDiagramType('class')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    diagramType === 'class'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Class
                </button>
                <button
                  onClick={() => setDiagramType('sequence')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    diagramType === 'sequence'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Sequence
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Detail Level
              </label>
              <div className="grid grid-cols-2 gap-2">
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
              <div className="grid grid-cols-4 gap-2">
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
              onClick={generateDiagram}
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