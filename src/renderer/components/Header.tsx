import React from 'react';
import { GitPullRequest, RefreshCw, GitCommit, Search } from 'lucide-react';
import { useRepositoryStore } from '../stores/repositoryStore';

const Header: React.FC = () => {
  const { selectedRepositories, refreshAllRepositories, isLoading } = useRepositoryStore();

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search repositories, commits, branches..."
            className="pl-10 pr-4 py-2 bg-gray-800 text-gray-100 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none w-96"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {selectedRepositories.length > 0 && (
          <span className="text-sm text-gray-400">
            {selectedRepositories.length} selected
          </span>
        )}
        
        <button
          onClick={() => refreshAllRepositories()}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh all repositories"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
        
        <button
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Pull all"
        >
          <GitPullRequest size={18} />
        </button>
        
        <button
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Commit all"
        >
          <GitCommit size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;