import React, { useState } from 'react';
import { Github, GitPullRequest, AlertCircle, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  createdAt: string;
  labels: Array<{ name: string; color: string }>;
  draft: boolean;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: string;
  createdAt: string;
  labels: Array<{ name: string; color: string }>;
  assignees: string[];
}

interface WorkflowRun {
  id: number;
  name: string;
  status: 'completed' | 'in_progress' | 'queued';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  createdAt: string;
  event: string;
  actor: string;
}

interface GitHubPanelProps {
  pullRequests?: PullRequest[];
  issues?: Issue[];
  workflowRuns?: WorkflowRun[];
  repoUrl?: string;
  onOpenInBrowser?: (url: string) => void;
}

export const GitHubPanel: React.FC<GitHubPanelProps> = ({
  pullRequests = [],
  issues = [],
  workflowRuns = [],
  repoUrl,
  onOpenInBrowser,
}) => {
  const [activeTab, setActiveTab] = useState<'prs' | 'issues' | 'actions'>('prs');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return hours === 0 ? 'Just now' : `${hours}h ago`;
    } else if (days < 30) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusIcon = (status: string, conclusion?: string) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success':
          return <CheckCircle className="w-4 h-4 text-green-400" />;
        case 'failure':
          return <XCircle className="w-4 h-4 text-red-400" />;
        case 'cancelled':
        case 'skipped':
          return <XCircle className="w-4 h-4 text-gray-400" />;
        default:
          return <Clock className="w-4 h-4 text-gray-400" />;
      }
    }
    return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
  };

  const renderPullRequests = () => {
    if (pullRequests.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <GitPullRequest className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No open pull requests</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-800">
        {pullRequests.map((pr) => (
          <div
            key={pr.id}
            className="p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
            onClick={() => onOpenInBrowser?.(`${repoUrl}/pull/${pr.number}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  {pr.state === 'open' ? (
                    <GitPullRequest className="w-4 h-4 text-green-400" />
                  ) : pr.state === 'merged' ? (
                    <CheckCircle className="w-4 h-4 text-purple-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-white font-medium">#{pr.number}</span>
                  {pr.draft && (
                    <span className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                      Draft
                    </span>
                  )}
                </div>
                <p className="text-gray-300 line-clamp-1">{pr.title}</p>
                <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                  <span>by {pr.author}</span>
                  <span>{formatDate(pr.createdAt)}</span>
                </div>
                {pr.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pr.labels.map((label) => (
                      <span
                        key={label.name}
                        className="px-2 py-0.5 text-xs rounded"
                        style={{
                          backgroundColor: `#${label.color}20`,
                          color: `#${label.color}`,
                          border: `1px solid #${label.color}40`,
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-2" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderIssues = () => {
    if (issues.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No open issues</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-800">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
            onClick={() => onOpenInBrowser?.(`${repoUrl}/issues/${issue.number}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  {issue.state === 'open' ? (
                    <AlertCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-purple-400" />
                  )}
                  <span className="text-white font-medium">#{issue.number}</span>
                </div>
                <p className="text-gray-300 line-clamp-1">{issue.title}</p>
                <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                  <span>by {issue.author}</span>
                  <span>{formatDate(issue.createdAt)}</span>
                  {issue.assignees.length > 0 && (
                    <span>Assigned to: {issue.assignees.join(', ')}</span>
                  )}
                </div>
                {issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {issue.labels.map((label) => (
                      <span
                        key={label.name}
                        className="px-2 py-0.5 text-xs rounded"
                        style={{
                          backgroundColor: `#${label.color}20`,
                          color: `#${label.color}`,
                          border: `1px solid #${label.color}40`,
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-2" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderActions = () => {
    if (workflowRuns.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No workflow runs</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-800">
        {workflowRuns.map((run) => (
          <div
            key={run.id}
            className="p-4 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(run.status, run.conclusion)}
                <div>
                  <p className="text-white font-medium">{run.name}</p>
                  <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                    <span>{run.event}</span>
                    <span>by {run.actor}</span>
                    <span>{formatDate(run.createdAt)}</span>
                  </div>
                </div>
              </div>
              {run.status === 'completed' && run.conclusion === 'failure' && (
                <button className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors">
                  Re-run
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold flex items-center space-x-2">
          <Github className="w-4 h-4" />
          <span>GitHub Integration</span>
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('prs')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'prs'
              ? 'text-white bg-gray-800 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          Pull Requests ({pullRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'issues'
              ? 'text-white bg-gray-800 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          Issues ({issues.length})
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'actions'
              ? 'text-white bg-gray-800 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          Actions ({workflowRuns.length})
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {activeTab === 'prs' && renderPullRequests()}
        {activeTab === 'issues' && renderIssues()}
        {activeTab === 'actions' && renderActions()}
      </div>
    </div>
  );
};