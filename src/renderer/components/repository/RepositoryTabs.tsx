import React from 'react';
import { GitCommit, GitBranch, Map } from 'lucide-react';

interface Tab {
  id: 'commit' | 'management' | 'visualmap';
  label: string;
  icon: React.ElementType;
  beta?: boolean;
}

interface RepositoryTabsProps {
  activeTab: 'commit' | 'management' | 'visualmap';
  onTabChange: (tab: 'commit' | 'management' | 'visualmap') => void;
  children: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'commit', label: 'Commit Workflow', icon: GitCommit },
  { id: 'management', label: 'Repository', icon: GitBranch },
  { id: 'visualmap', label: 'Visual Map', icon: Map, beta: true },
];

export const RepositoryTabs: React.FC<RepositoryTabsProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-gray-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-500 text-white bg-gray-800/50'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
              {tab.beta && (
                <span className="px-1.5 py-0.5 text-xs bg-blue-600/20 text-blue-400 rounded">
                  Beta
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};