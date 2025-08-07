import React from 'react';
import { Check, Download, Upload, AlertCircle } from 'lucide-react';

interface SyncStatusIndicatorProps {
  ahead: number;
  behind: number;
  synced?: boolean;
  error?: string | null;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  ahead,
  behind,
  synced = false,
  error,
}) => {
  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-400">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (ahead === 0 && behind === 0 && synced) {
    return (
      <div className="flex items-center space-x-2 text-green-400">
        <Check className="w-4 h-4" />
        <span className="text-sm">Up to date</span>
      </div>
    );
  }

  if (ahead > 0 || behind > 0) {
    return (
      <div className="flex items-center space-x-3">
        {behind > 0 && (
          <div className="flex items-center space-x-1 text-yellow-400">
            <Download className="w-4 h-4" />
            <span className="text-sm">{behind} behind</span>
          </div>
        )}
        {ahead > 0 && (
          <div className="flex items-center space-x-1 text-green-400">
            <Upload className="w-4 h-4" />
            <span className="text-sm">{ahead} ahead</span>
          </div>
        )}
      </div>
    );
  }

  return null;
};