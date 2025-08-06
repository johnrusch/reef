import React from 'react';
import { GitBranch, GitCommit, AlertCircle, Clock } from 'lucide-react';
import { useRepositoryStore } from '../stores/repositoryStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import RepositoryCard from '../components/RepositoryCard';

const Dashboard: React.FC = () => {
  const { repositories } = useRepositoryStore();
  const { activeWorkspace } = useWorkspaceStore();

  const workspaceRepos = activeWorkspace
    ? repositories.filter(r => activeWorkspace.repositories.includes(r.id))
    : repositories;

  const stats = {
    totalRepos: workspaceRepos.length,
    modifiedRepos: workspaceRepos.filter(r => r.status && r.status.modified > 0).length,
    behindRepos: workspaceRepos.filter(r => r.status && r.status.behind > 0).length,
    uncommittedChanges: workspaceRepos.reduce((acc, r) => 
      acc + (r.status ? r.status.modified + r.status.untracked : 0), 0
    ),
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          {activeWorkspace ? activeWorkspace.name : 'All Repositories'}
        </h2>
        {activeWorkspace && activeWorkspace.description && (
          <p className="text-gray-400">{activeWorkspace.description}</p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Repositories</p>
              <p className="text-2xl font-bold text-white">{stats.totalRepos}</p>
            </div>
            <GitBranch className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Modified</p>
              <p className="text-2xl font-bold text-white">{stats.modifiedRepos}</p>
            </div>
            <GitCommit className="text-yellow-500" size={24} />
          </div>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Behind Remote</p>
              <p className="text-2xl font-bold text-white">{stats.behindRepos}</p>
            </div>
            <AlertCircle className="text-orange-500" size={24} />
          </div>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Uncommitted</p>
              <p className="text-2xl font-bold text-white">{stats.uncommittedChanges}</p>
            </div>
            <Clock className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaceRepos.length === 0 ? (
          <div className="col-span-full bg-gray-900 p-8 rounded-lg border border-gray-700 text-center">
            <GitBranch className="mx-auto text-gray-600 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No repositories</h3>
            <p className="text-gray-500">
              Add repositories to get started with Reef
            </p>
          </div>
        ) : (
          workspaceRepos.map(repo => (
            <RepositoryCard key={repo.id} repository={repo} />
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;