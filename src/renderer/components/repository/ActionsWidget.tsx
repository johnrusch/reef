import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, Clock, ExternalLink, Loader2 } from 'lucide-react';

interface WorkflowRun {
  id: number;
  name: string;
  status: 'completed' | 'in_progress' | 'queued';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  created_at: string;
  html_url: string;
  run_number: number;
}

interface ActionsWidgetProps {
  repoUrl: string;
  showStatus?: boolean;
}

export const ActionsWidget: React.FC<ActionsWidgetProps> = ({
  repoUrl,
  showStatus = false,
}) => {
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, this would fetch from GitHub API
    // For now, we'll simulate with mock data
    const fetchWorkflowRuns = async () => {
      try {
        setLoading(true);
        // Simulated API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data
        setWorkflowRuns([]);
        setError(null);
      } catch (err) {
        setError('Failed to fetch workflow runs');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowRuns();
  }, [repoUrl]);

  const getStatusIcon = (status: string, conclusion?: string) => {
    if (status === 'in_progress') {
      return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
    }
    if (status === 'queued') {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
    if (conclusion === 'success') {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    if (conclusion === 'failure') {
      return <XCircle className="w-4 h-4 text-red-400" />;
    }
    return <Play className="w-4 h-4 text-gray-400" />;
  };


  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white font-medium flex items-center space-x-2">
          <Play className="w-4 h-4" />
          <span>GitHub Actions</span>
        </h4>
        <a
          href={`${repoUrl}/actions`}
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
          <XCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      ) : workflowRuns.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No workflow runs</p>
          <p className="text-xs mt-1">GitHub Actions may not be configured</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {workflowRuns.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between p-2 hover:bg-gray-800 rounded transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getStatusIcon(run.status, run.conclusion)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-white truncate">
                      {run.name} #{run.run_number}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(run.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <a
                href={run.html_url}
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

      {showStatus && workflowRuns.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-around text-xs">
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-gray-400">
                {workflowRuns.filter(r => r.conclusion === 'success').length} passed
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <XCircle className="w-3 h-3 text-red-400" />
              <span className="text-gray-400">
                {workflowRuns.filter(r => r.conclusion === 'failure').length} failed
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Loader2 className="w-3 h-3 text-yellow-400" />
              <span className="text-gray-400">
                {workflowRuns.filter(r => r.status === 'in_progress').length} running
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};