import React from 'react';
import { Map, FileCode, GitBranch, FolderTree } from 'lucide-react';

interface VisualMapTabProps {
  repository: any;
  onNavigateToFile?: (path: string) => void;
}

export const VisualMapTab: React.FC<VisualMapTabProps> = () => {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="relative">
          <Map className="w-24 h-24 text-gray-600 mx-auto" />
          <div className="absolute -top-2 -right-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
            Beta
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-gray-300">
            Visual Repository Map
          </h3>
          <p className="text-gray-500 leading-relaxed">
            Interactive repository visualization coming soon. This feature will display your 
            codebase structure using PlantUML diagrams, making it easier to understand 
            complex project architectures at a glance.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <FileCode className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <h4 className="text-sm font-medium text-gray-300 mb-1">Code Structure</h4>
            <p className="text-xs text-gray-500">
              Visualize classes, functions, and dependencies
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <GitBranch className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h4 className="text-sm font-medium text-gray-300 mb-1">Git Flow</h4>
            <p className="text-xs text-gray-500">
              See branch relationships and commit history
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <FolderTree className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <h4 className="text-sm font-medium text-gray-300 mb-1">File Explorer</h4>
            <p className="text-xs text-gray-500">
              Navigate through your project hierarchy
            </p>
          </div>
        </div>

        <div className="pt-6">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">In Development</span>
          </div>
        </div>
      </div>
    </div>
  );
};