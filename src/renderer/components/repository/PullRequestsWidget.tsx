import React, { useState, useEffect } from 'react';
import { GitPullRequest, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  created_at: string;
  html_url: string;
}

interface PullRequestsWidgetProps {
  repoUrl: string;
  limit?: number;
}

export const PullRequestsWidget: React.FC<PullRequestsWidgetProps> = ({
  repoUrl,
  limit = 10,
}) => {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, this would fetch from GitHub API
    // For now, we'll simulate with mock data
    const fetchPullRequests = async () => {
      try {
        setLoading(true);
        // Simulated API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data
        setPullRequests([]);
        setError(null);
      } catch (err) {
        setError('Failed to fetch pull requests');
      } finally {
        setLoading(false);
      }
    };

    fetchPullRequests();
  }, [repoUrl, limit]);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'open':
        return 'text-green-400 bg-green-900/30';
      case 'closed':
        return 'text-red-400 bg-red-900/30';
      case 'merged':
        return 'text-purple-400 bg-purple-900/30';
      default:
        return 'text-gray-400 bg-gray-800';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white font-medium flex items-center space-x-2">
          <GitPullRequest className="w-4 h-4" />
          <span>Pull Requests</span>
        </h4>
        <a
          href={`${repoUrl}/pulls`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View all →
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center space-x-2 text-red-400 py-4">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      ) : pullRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <GitPullRequest className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No open pull requests</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {pullRequests.map((pr) => (
            <div
              key={pr.id}
              className="flex items-center justify-between p-2 hover:bg-gray-800 rounded transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 text-xs rounded ${getStateColor(pr.state)}`}>
                    {pr.state}
                  </span>
                  <span className="text-sm text-white truncate">
                    #{pr.number} {pr.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  by {pr.author} • {new Date(pr.created_at).toLocaleDateString()}
                </p>
              </div>
              <a
                href={pr.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};