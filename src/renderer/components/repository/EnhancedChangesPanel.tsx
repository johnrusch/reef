import React, { useState, useMemo } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  X,
  Eye,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';

interface FileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked';
  staged: boolean;
  category?: string;
}


interface EnhancedChangesPanelProps {
  files: FileChange[];
  supportsCategorization?: boolean;
  displayMode?: 'flat' | 'categorized';
  onStageFiles: (files: string[]) => Promise<void>;
  onUnstageFiles: (files: string[]) => Promise<void>;
  onDiscardChanges?: (files: string[]) => Promise<void>;
  onViewDiff?: (file: string) => void;
}

export const EnhancedChangesPanel: React.FC<EnhancedChangesPanelProps> = ({
  files,
  supportsCategorization = false,
  displayMode = 'flat',
  onStageFiles,
  onUnstageFiles,
  onDiscardChanges,
  onViewDiff,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['staged', 'unstaged'])
  );
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const categorizeFiles = useMemo(() => {
    if (!supportsCategorization || displayMode === 'flat') {
      return {
        staged: files.filter(f => f.staged),
        unstaged: files.filter(f => !f.staged),
      };
    }

    // Future implementation for smart categorization
    return {
      staged: files.filter(f => f.staged),
      unstaged: files.filter(f => !f.staged),
    };
  }, [files, supportsCategorization, displayMode]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleFileSelection = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'text-green-400';
      case 'modified':
        return 'text-yellow-400';
      case 'deleted':
        return 'text-red-400';
      case 'untracked':
        return 'text-gray-400';
      default:
        return 'text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase();
  };

  const renderFileItem = (file: FileChange) => {
    const isSelected = selectedFiles.has(file.path);
    
    return (
      <div
        key={file.path}
        className={`flex items-center justify-between px-3 py-2 hover:bg-gray-800 rounded transition-colors ${
          isSelected ? 'bg-gray-800' : ''
        }`}
      >
        <div className="flex items-center space-x-3 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleFileSelection(file.path)}
            className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <FileText className="w-4 h-4 text-gray-400" />
          <div className="flex items-center space-x-2 flex-1">
            <span className="text-sm text-gray-300 truncate">{file.path}</span>
            <span className={`text-xs font-medium ${getStatusColor(file.status)}`}>
              {getStatusLabel(file.status)}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {onViewDiff && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDiff(file.path);
              }}
              className="p-1 hover:bg-gray-700 rounded transition-colors group"
              title="View diff"
            >
              <Eye className="w-4 h-4 text-gray-400 group-hover:text-white" />
            </button>
          )}
          {onDiscardChanges && !file.staged && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDiscardChanges([file.path]);
              }}
              className="p-1 hover:bg-gray-700 rounded transition-colors group"
              title="Discard changes"
            >
              <X className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCategory = (title: string, files: FileChange[], canStage: boolean) => {
    const isExpanded = expandedCategories.has(title.toLowerCase());
    const hasFiles = files.length > 0;
    
    if (!hasFiles) return null;
    
    return (
      <div key={title} className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => toggleCategory(title.toLowerCase())}
            className="flex items-center space-x-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>{title}</span>
            <span className="text-gray-500">({files.length})</span>
          </button>
          
          {files.length > 0 && (
            <div className="flex items-center space-x-2">
              {canStage ? (
                <button
                  onClick={() => onStageFiles(files.map(f => f.path))}
                  className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  Stage All
                </button>
              ) : (
                <button
                  onClick={() => onUnstageFiles(files.map(f => f.path))}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  Unstage All
                </button>
              )}
            </div>
          )}
        </div>
        
        {isExpanded && (
          <div className="space-y-1 ml-4">
            {files.map(renderFileItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <FolderOpen className="w-5 h-5" />
          <span>Changes</span>
        </h3>
        {supportsCategorization && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Smart Categorization</span>
            <AlertCircle className="w-3 h-3 text-gray-500" />
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        {renderCategory('Staged', categorizeFiles.staged, false)}
        {renderCategory('Unstaged', categorizeFiles.unstaged, true)}
      </div>
      
      {selectedFiles.size > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const filesToStage = Array.from(selectedFiles);
                  const stagedFiles = categorizeFiles.staged.map(f => f.path);
                  const unstagedToStage = filesToStage.filter(f => !stagedFiles.includes(f));
                  if (unstagedToStage.length > 0) {
                    onStageFiles(unstagedToStage);
                  }
                  setSelectedFiles(new Set());
                }}
                className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Stage Selected
              </button>
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};