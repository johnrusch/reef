import React from 'react';
import { GitBranch, FileText, AlertCircle, Clock, Link2 } from 'lucide-react';
import { Repository } from '../../stores/workspaceStore';

interface RepositoryOverviewProps {
  repository: Repository;
  gitStatus: any;
  remoteInfo?: {
    url?: string;
    connected: boolean;
  };
}

export const RepositoryOverview: React.FC<RepositoryOverviewProps> = ({
  repository,
  gitStatus,
  remoteInfo,
}) => {
  const formatLastFetch = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Branch Information */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-400">
            <GitBranch className="w-4 h-4" />
            <span className="text-sm font-medium">Branch</span>
          </div>
          <div>
            <p className="text-white font-semibold">{gitStatus?.currentBranch || 'Unknown'}</p>
            {gitStatus?.tracking && (
              <p className="text-sm text-gray-500 mt-1">Tracking: {gitStatus.tracking}</p>
            )}
          </div>
          
          {/* Sync Status */}
          <div className="flex space-x-4 text-sm">
            {gitStatus?.ahead > 0 && (
              <span className="text-green-400">↑ {gitStatus.ahead} ahead</span>
            )}
            {gitStatus?.behind > 0 && (
              <span className="text-yellow-400">↓ {gitStatus.behind} behind</span>
            )}
            {gitStatus?.ahead === 0 && gitStatus?.behind === 0 && (
              <span className="text-gray-500">✓ Up to date</span>
            )}
          </div>
        </div>

        {/* Working Tree Status */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-400">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Working Tree</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Modified</span>
              <span className="text-yellow-400 font-medium">{gitStatus?.modified || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Staged</span>
              <span className="text-green-400 font-medium">{gitStatus?.staged || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Untracked</span>
              <span className="text-blue-400 font-medium">{gitStatus?.untracked || 0}</span>
            </div>
          </div>
          
          {/* Clean/Dirty Indicator */}
          <div className="pt-2 border-t border-gray-800">
            {(gitStatus?.modified || 0) + (gitStatus?.staged || 0) + (gitStatus?.untracked || 0) === 0 ? (
              <span className="text-green-400 text-sm">✓ Clean working tree</span>
            ) : (
              <span className="text-yellow-400 text-sm">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {(gitStatus?.modified || 0) + (gitStatus?.staged || 0) + (gitStatus?.untracked || 0)} pending changes
              </span>
            )}
          </div>
        </div>

        {/* Repository Info */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-400">
            <Link2 className="w-4 h-4" />
            <span className="text-sm font-medium">Repository</span>
          </div>
          <div className="space-y-2">
            {remoteInfo?.url && (
              <div>
                <p className="text-gray-400 text-sm">Remote</p>
                <p className="text-white text-xs truncate" title={remoteInfo.url}>
                  {remoteInfo.url}
                </p>
              </div>
            )}
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-gray-400">Last fetch:</span>
              <span className="text-gray-300">{formatLastFetch(repository.lastFetch)}</span>
            </div>
            <div className="pt-2 border-t border-gray-800">
              <p className="text-gray-400 text-xs truncate" title={repository.path}>
                {repository.path}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};