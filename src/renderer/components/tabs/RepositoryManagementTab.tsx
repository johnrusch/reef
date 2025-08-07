import React from 'react';
import { BranchTreeView } from '../repository/BranchTreeView';
import { GitHubDashboard } from '../repository/GitHubDashboard';
import { PullRequestsWidget } from '../repository/PullRequestsWidget';
import { IssuesWidget } from '../repository/IssuesWidget';
import { ActionsWidget } from '../repository/ActionsWidget';

interface RepositoryManagementTabProps {
  branches: any[];
  currentBranch: string;
  remotes?: any[];
  repoUrl?: string;
  isAuthenticated: boolean;
  onSwitchBranch: (branch: string) => Promise<void>;
  onCreateBranch: (name: string) => Promise<void>;
  onDeleteBranch: (name: string) => Promise<void>;
}

export const RepositoryManagementTab: React.FC<RepositoryManagementTabProps> = ({
  branches,
  currentBranch,
  remotes,
  repoUrl,
  isAuthenticated,
  onSwitchBranch,
  onCreateBranch,
  onDeleteBranch,
}) => {
  return (
    <div className="grid grid-cols-10 gap-4 h-full p-6">
      {/* Left Panel - Branches */}
      <div className="col-span-3 overflow-auto">
        <BranchTreeView
          branches={branches}
          currentBranch={currentBranch}
          remotes={remotes}
          searchable={true}
          onSwitchBranch={onSwitchBranch}
          onCreateBranch={onCreateBranch}
          onDeleteBranch={onDeleteBranch}
        />
      </div>
      
      {/* Right Panel - GitHub Dashboard */}
      <div className="col-span-7 overflow-auto">
        {isAuthenticated ? (
          repoUrl ? (
            <GitHubDashboard repoUrl={repoUrl}>
              <PullRequestsWidget repoUrl={repoUrl} limit={10} />
              <IssuesWidget repoUrl={repoUrl} limit={10} />
              <ActionsWidget repoUrl={repoUrl} showStatus={true} />
            </GitHubDashboard>
          ) : (
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-8">
              <div className="text-center space-y-4">
                <p className="text-gray-400">
                  Repository is not connected to GitHub
                </p>
                <p className="text-sm text-gray-500">
                  To view GitHub information, ensure this repository has a remote origin configured
                </p>
                <div className="mt-4 p-4 bg-gray-800 rounded text-left">
                  <p className="text-xs text-gray-400 font-mono">
                    git remote add origin https://github.com/username/repo.git
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 text-center">
            <p className="text-gray-400">
              Connect your GitHub account to view repository details
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Go to Settings → GitHub to authenticate
            </p>
          </div>
        )}
      </div>
    </div>
  );
};