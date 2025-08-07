import React from 'react';
import { Github } from 'lucide-react';

interface GitHubDashboardProps {
  repoUrl: string;
  children: React.ReactNode;
}

export const GitHubDashboard: React.FC<GitHubDashboardProps> = ({
  repoUrl,
  children,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Github className="w-5 h-5" />
            <span>GitHub Dashboard</span>
          </h3>
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Open in GitHub →
          </a>
        </div>
      </div>
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};