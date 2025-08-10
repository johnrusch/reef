import React, { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

interface Issue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: string;
  created_at: string;
  html_url: string;
  labels: { name: string; color: string }[];
}

interface IssuesWidgetProps {
  repoUrl: string;
  limit?: number;
}

export const IssuesWidget: React.FC<IssuesWidgetProps> = ({
  repoUrl,
  limit = 10,
}) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Parse repository URL to extract owner and repo
        const urlParts = repoUrl.replace('https://github.com/', '').split('/');
        if (urlParts.length < 2) {
          throw new Error('Invalid repository URL');
        }
        
        const owner = urlParts[0];
        const repo = urlParts[1];
        
        // Fetch issues from GitHub API
        const issuesData = await window.reef.github.getIssues(owner, repo);
        
        // Transform and limit the data
        const transformedIssues = issuesData.slice(0, limit).map((issue: any) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          author: issue.user?.login || 'unknown',
          created_at: issue.created_at,
          html_url: issue.html_url,
          labels: issue.labels?.map((label: any) => ({
            name: label.name,
            color: label.color
          })) || []
        }));
        
        setIssues(transformedIssues);
      } catch (err) {
        console.error('Failed to fetch issues:', err);
        if ((err as Error).message.includes('Not authenticated')) {
          setError('Please authenticate with GitHub to view issues');
        } else {
          setError('Failed to fetch issues');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [repoUrl, limit]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>Issues</span>
        </h4>
        <a
          href={`${repoUrl}/issues`}
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
      ) : issues.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No open issues</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-center justify-between p-2 hover:bg-gray-800 rounded transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${
                    issue.state === 'open' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-sm text-white truncate">
                    #{issue.number} {issue.title}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-xs text-gray-500">
                    by {issue.author} • {new Date(issue.created_at).toLocaleDateString()}
                  </p>
                  {issue.labels.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {issue.labels.slice(0, 3).map((label) => (
                        <span
                          key={label.name}
                          className="px-1.5 py-0.5 text-xs rounded"
                          style={{
                            backgroundColor: `#${label.color}20`,
                            color: `#${label.color}`,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <a
                href={issue.html_url}
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