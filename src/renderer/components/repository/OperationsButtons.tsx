import React, { useState } from 'react';
import { Download, Upload, RefreshCw, Loader2, Check } from 'lucide-react';

interface OperationsButtonsProps {
  onFetch: () => Promise<void>;
  onPull: () => Promise<void>;
  onPush: () => Promise<void>;
  ahead: number;
  behind: number;
  disabled?: boolean;
}

export const OperationsButtons: React.FC<OperationsButtonsProps> = ({
  onFetch,
  onPull,
  onPush,
  ahead,
  behind,
  disabled = false,
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleOperation = async (
    operation: string,
    handler: () => Promise<void>
  ) => {
    setLoading(operation);
    setSuccess(null);
    
    try {
      await handler();
      setSuccess(operation);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error(`${operation} failed:`, err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Fetch */}
      <button
        onClick={() => handleOperation('fetch', onFetch)}
        disabled={disabled || loading !== null}
        className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-800 rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Fetch changes from remote"
      >
        {loading === 'fetch' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : success === 'fetch' ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        <span className="text-sm">Fetch</span>
      </button>

      {/* Pull */}
      <button
        onClick={() => handleOperation('pull', onPull)}
        disabled={disabled || loading !== null || behind === 0}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          behind > 0 
            ? 'bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-800/50' 
            : 'bg-gray-800 hover:bg-gray-700'
        }`}
        title={`Pull changes from remote${behind > 0 ? ` (${behind} commits behind)` : ''}`}
      >
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
      </button>

      {/* Push */}
      <button
        onClick={() => handleOperation('push', onPush)}
        disabled={disabled || loading !== null || ahead === 0}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          ahead > 0 
            ? 'bg-green-900/30 hover:bg-green-900/50 border border-green-800/50' 
            : 'bg-gray-800 hover:bg-gray-700'
        }`}
        title={`Push changes to remote${ahead > 0 ? ` (${ahead} commits ahead)` : ''}`}
      >
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
      </button>
    </div>
  );
};