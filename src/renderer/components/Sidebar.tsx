import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GitBranch, FolderGit2, Settings, Grid3x3, Plus } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useRepositoryStore } from '../stores/repositoryStore';
import AddRepositoryModal from './AddRepositoryModal';
import { isMacOS } from '../utils/platform';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { workspaces, activeWorkspace } = useWorkspaceStore();
  const { repositories } = useRepositoryStore();
  const [isAddRepoModalOpen, setIsAddRepoModalOpen] = useState(false);

  // Listen for menu events
  useEffect(() => {
    const handleAddRepository = () => {
      setIsAddRepoModalOpen(true);
    };

    window.reef.ipc.on('add-repository', handleAddRepository);

    return () => {
      window.reef.ipc.off('add-repository', handleAddRepository);
    };
  }, []);

  const navItems = [
    { path: '/', icon: Grid3x3, label: 'Dashboard' },
    { path: '/workspaces', icon: FolderGit2, label: 'Workspaces' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
      <div className={`p-4 border-b border-gray-800 ${isMacOS() ? 'pt-10' : ''}`}>
        <h1 className="text-xl font-bold text-blue-400">Reef</h1>
        {activeWorkspace && (
          <p className="text-sm text-gray-400 mt-1">{activeWorkspace.name}</p>
        )}
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Repositories
            </h3>
            <button
              className="text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsAddRepoModalOpen(true)}
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {repositories.length === 0 ? (
              <p className="text-sm text-gray-500 px-3 py-2">No repositories added</p>
            ) : (
              repositories.slice(0, 10).map((repo) => (
                <Link
                  key={repo.id}
                  to={`/repository/${repo.id}`}
                  className="flex items-center space-x-2 px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <GitBranch size={14} />
                  <span className="truncate">{repo.name}</span>
                  {repo.status && (repo.status.modified > 0 || repo.status.staged > 0) && (
                    <span className="w-2 h-2 bg-yellow-500 rounded-full ml-auto"></span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          {repositories.length} repositories • {workspaces.length} workspaces
        </div>
      </div>

      <AddRepositoryModal
        isOpen={isAddRepoModalOpen}
        onClose={() => setIsAddRepoModalOpen(false)}
      />
    </div>
  );
};

export default Sidebar;