import React, { useState } from 'react';
import { 
  Download, Upload, RefreshCw, Archive, 
  AlertCircle, Check, Loader2 
} from 'lucide-react';

interface OperationsToolbarProps {
  lastFetch?: Date;
  ahead: number;
  behind: number;
  onFetch: () => Promise<void>;
  onPull: () => Promise<void>;
  onPush: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onStash?: () => Promise<void>;
  onStashPop?: () => Promise<void>;
  stashCount?: number;
}

export const OperationsToolbar: React.FC<OperationsToolbarProps> = ({
  lastFetch,
  ahead,
  behind,
  onFetch,
  onPull,
  onPush,
  onRefresh,
  onStash,
  onStashPop,
  stashCount = 0,
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatLastFetch = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleOperation = async (
    operation: string,
    handler: () => Promise<void>
  ) => {
    setLoading(operation);
    setError(null);
    setSuccess(null);
    
    try {
      await handler();
      setSuccess(operation);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(`${operation} failed: ${(err as Error).message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Git Operations */}
        <div className="flex items-center space-x-2">
          {/* Fetch */}
          <button
            onClick={() => handleOperation('fetch', onFetch)}
            disabled={loading !== null}
            className="relative group"
          >
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors">
              {loading === 'fetch' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : success === 'fetch' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="text-sm">Fetch</span>
            </div>
            <div className="absolute -bottom-6 left-0 text-xs text-gray-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Last: {formatLastFetch(lastFetch)}
            </div>
          </button>

          {/* Pull */}
          <button
            onClick={() => handleOperation('pull', onPull)}
            disabled={loading !== null || behind === 0}
            className="relative"
          >
            <div className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
              behind > 0 
                ? 'bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-800/50' 
                : 'bg-gray-800 hover:bg-gray-700'
            }`}>
              {loading === 'pull' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : success === 'pull' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="text-sm">Pull</span>
              {behind > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-yellow-800/50 rounded">
                  {behind}
                </span>
              )}
            </div>
          </button>

          {/* Push */}
          <button
            onClick={() => handleOperation('push', onPush)}
            disabled={loading !== null || ahead === 0}
            className="relative"
          >
            <div className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
              ahead > 0 
                ? 'bg-green-900/30 hover:bg-green-900/50 border border-green-800/50' 
                : 'bg-gray-800 hover:bg-gray-700'
            }`}>
              {loading === 'push' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : success === 'push' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="text-sm">Push</span>
              {ahead > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-green-800/50 rounded">
                  {ahead}
                </span>
              )}
            </div>
          </button>

          {/* Stash Dropdown */}
          {(onStash || onStashPop) && (
            <div className="relative group">
              <button className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors">
                <Archive className="w-4 h-4" />
                <span className="text-sm">Stash</span>
                {stashCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-800/50 rounded">
                    {stashCount}
                  </span>
                )}
              </button>
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                {onStash && (
                  <button
                    onClick={() => handleOperation('stash', onStash)}
                    disabled={loading !== null}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors whitespace-nowrap"
                  >
                    Stash changes
                  </button>
                )}
                {onStashPop && stashCount > 0 && (
                  <button
                    onClick={() => handleOperation('stash-pop', onStashPop)}
                    disabled={loading !== null}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors whitespace-nowrap"
                  >
                    Pop latest stash
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={() => handleOperation('refresh', onRefresh)}
            disabled={loading !== null}
            className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
            title="Refresh repository status"
          >
            {loading === 'refresh' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : success === 'refresh' ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-4 text-sm">
          {loading && (
            <div className="flex items-center space-x-2 text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-3 h-3" />
              <span>{error}</span>
            </div>
          )}
          
          {!loading && !error && (ahead === 0 && behind === 0) && (
            <div className="flex items-center space-x-2 text-green-400">
              <Check className="w-3 h-3" />
              <span>Up to date</span>
            </div>
          )}
          
          {!loading && !error && (ahead > 0 || behind > 0) && (
            <div className="flex items-center space-x-3">
              {behind > 0 && (
                <div className="flex items-center space-x-1 text-yellow-400">
                  <Download className="w-3 h-3" />
                  <span>{behind} behind</span>
                </div>
              )}
              {ahead > 0 && (
                <div className="flex items-center space-x-1 text-green-400">
                  <Upload className="w-3 h-3" />
                  <span>{ahead} ahead</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};