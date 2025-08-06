import React from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, GitCommit, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import type { Repository } from '../stores/workspaceStore';
import { useRepositoryStore } from '../stores/repositoryStore';

interface RepositoryCardProps {
  repository: Repository;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({ repository }) => {
  const { toggleRepositorySelection, selectedRepositories } = useRepositoryStore();
  const isSelected = selectedRepositories.includes(repository.id);

  return (
    <div 
      className={`bg-gray-900 rounded-lg border transition-all ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleRepositorySelection(repository.id)}
              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <div>
              <Link 
                to={`/repository/${repository.id}`}
                className="font-semibold text-white hover:text-blue-400 transition-colors"
              >
                {repository.name}
              </Link>
              <p className="text-xs text-gray-500 mt-1">{repository.path}</p>
            </div>
          </div>
          <Link
            to={`/repository/${repository.id}`}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink size={16} />
          </Link>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <GitBranch size={14} className="text-gray-400" />
            <span className="text-gray-300">{repository.currentBranch || 'main'}</span>
          </div>
          
          {repository.status && (
            <>
              {repository.status.behind > 0 && (
                <div className="flex items-center space-x-1">
                  <AlertCircle size={14} className="text-orange-500" />
                  <span className="text-orange-400">{repository.status.behind} behind</span>
                </div>
              )}
              
              {repository.status.ahead > 0 && (
                <div className="flex items-center space-x-1">
                  <GitCommit size={14} className="text-green-500" />
                  <span className="text-green-400">{repository.status.ahead} ahead</span>
                </div>
              )}
            </>
          )}
        </div>

        {repository.status && (repository.status.modified > 0 || repository.status.untracked > 0) && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="flex items-center space-x-4 text-xs">
              {repository.status.modified > 0 && (
                <span className="text-yellow-400">
                  {repository.status.modified} modified
                </span>
              )}
              {repository.status.staged > 0 && (
                <span className="text-green-400">
                  {repository.status.staged} staged
                </span>
              )}
              {repository.status.untracked > 0 && (
                <span className="text-gray-400">
                  {repository.status.untracked} untracked
                </span>
              )}
            </div>
          </div>
        )}

        {repository.lastFetch && (
          <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
            <Clock size={12} />
            <span>Last fetched: {new Date(repository.lastFetch).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepositoryCard;