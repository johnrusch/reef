import React from 'react';
import { Info, Clock, DollarSign, Zap, Database, RefreshCw, GitBranch } from 'lucide-react';
import type { DiagramMetadata } from './DiagramViewer';

interface DiagramInfoProps {
  metadata: DiagramMetadata;
  changedFilesCount?: number;
  onRefreshFromCache?: () => void;
}

export const DiagramInfo: React.FC<DiagramInfoProps> = ({
  metadata,
  changedFilesCount = 0,
  onRefreshFromCache,
}) => {
  const getModelDisplayName = (model: string): string => {
    const modelNames = {
      'haiku': 'Claude 3 Haiku',
      'sonnet': 'Claude 3.5 Sonnet',
      'opus': 'Claude 3 Opus',
    };
    return modelNames[model as keyof typeof modelNames] || model;
  };

  const formatGenerationTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatCost = (cost: number): string => {
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  const formatTokens = (tokens?: { input: number; output: number }): string => {
    if (!tokens) return 'N/A';
    const total = tokens.input + tokens.output;
    if (total > 1000) {
      return `${(total / 1000).toFixed(1)}k`;
    }
    return total.toString();
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Diagram Information
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-xs">Model</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-300">{getModelDisplayName(metadata.model)}</p>
                <p className="text-xs text-gray-500">{metadata.diagramType} diagram</p>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4 text-green-400" />
                <span className="text-xs">Generation Time</span>
              </div>
              <p className="text-sm text-gray-300">{formatGenerationTime(metadata.generationTime)}</p>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <span className="text-xs">Estimated Cost</span>
              </div>
              <p className="text-sm text-gray-300">{formatCost(metadata.estimatedCost)}</p>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Database className="w-4 h-4 text-purple-400" />
                <span className="text-xs">Tokens Used</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-300">{formatTokens(metadata.tokensUsed)}</p>
                {metadata.tokensUsed && (
                  <p className="text-xs text-gray-500">
                    {metadata.tokensUsed.input} in / {metadata.tokensUsed.output} out
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span className="text-xs">Cache Status</span>
              </div>
              <div className="text-right">
                {metadata.cached ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-900/30 text-green-400">
                    Cached
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-900/30 text-blue-400">
                    Fresh
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Generated</span>
              <span className="text-gray-400">{getTimeAgo(metadata.generatedAt)}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Last Updated</span>
              <span className="text-gray-400">{getTimeAgo(metadata.lastUpdated)}</span>
            </div>

            {changedFilesCount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Changed Files</span>
                <span className="text-orange-400">{changedFilesCount}</span>
              </div>
            )}
          </div>
        </div>

        {metadata.cached && onRefreshFromCache && (
          <div className="border-t border-gray-700 pt-3">
            <button
              onClick={onRefreshFromCache}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh from Cache
            </button>
          </div>
        )}

        <div className="border-t border-gray-700 pt-3">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Metrics Explained</h4>
            
            <div className="space-y-1">
              <details className="group">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400">
                  What are tokens?
                </summary>
                <p className="mt-1 text-xs text-gray-600 pl-2">
                  Tokens are chunks of text the AI processes. ~750 words ≈ 1000 tokens.
                </p>
              </details>
              
              <details className="group">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400">
                  How is cost calculated?
                </summary>
                <p className="mt-1 text-xs text-gray-600 pl-2">
                  Based on model pricing: Haiku (~$0.25/M tokens), Sonnet (~$3/M tokens), Opus (~$15/M tokens).
                </p>
              </details>
              
              <details className="group">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400">
                  What does cached mean?
                </summary>
                <p className="mt-1 text-xs text-gray-600 pl-2">
                  Cached diagrams are stored locally and load instantly without API calls.
                </p>
              </details>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <GitBranch className="w-3 h-3" />
            <span>Repository: {metadata.repository}</span>
          </div>
        </div>
      </div>
    </div>
  );
};