import React, { useState } from 'react';
import { FileText, Plus, Minus, Edit, AlertCircle, Check, X, Eye } from 'lucide-react';

interface FileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
  additions?: number;
  deletions?: number;
}

interface ChangesPanelProps {
  files: FileChange[];
  onStageFiles: (files: string[]) => Promise<void>;
  onUnstageFiles: (files: string[]) => Promise<void>;
  onDiscardChanges: (files: string[]) => Promise<void>;
  onViewDiff: (file: string) => void;
}

export const ChangesPanel: React.FC<ChangesPanelProps> = ({
  files,
  onStageFiles,
  onUnstageFiles,
  onDiscardChanges,
  onViewDiff,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const stagedFiles = files.filter(f => f.staged);
  const unstagedFiles = files.filter(f => !f.staged);

  const getStatusIcon = (status: FileChange['status']) => {
    switch (status) {
      case 'modified':
        return <Edit className="w-3 h-3 text-yellow-400" />;
      case 'added':
        return <Plus className="w-3 h-3 text-green-400" />;
      case 'deleted':
        return <Minus className="w-3 h-3 text-red-400" />;
      case 'renamed':
        return <AlertCircle className="w-3 h-3 text-blue-400" />;
      case 'untracked':
        return <FileText className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: FileChange['status']) => {
    switch (status) {
      case 'modified': return 'M';
      case 'added': return 'A';
      case 'deleted': return 'D';
      case 'renamed': return 'R';
      case 'untracked': return 'U';
    }
  };

  const toggleFileSelection = (path: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    setSelectedFiles(newSelection);
  };

  const handleStageAll = async () => {
    setLoading(true);
    try {
      await onStageFiles(unstagedFiles.map(f => f.path));
    } finally {
      setLoading(false);
    }
  };

  const handleUnstageAll = async () => {
    setLoading(true);
    try {
      await onUnstageFiles(stagedFiles.map(f => f.path));
    } finally {
      setLoading(false);
    }
  };

  const handleStageSelected = async () => {
    const filesToStage = Array.from(selectedFiles).filter(path =>
      unstagedFiles.some(f => f.path === path)
    );
    if (filesToStage.length === 0) return;
    
    setLoading(true);
    try {
      await onStageFiles(filesToStage);
      setSelectedFiles(new Set());
    } finally {
      setLoading(false);
    }
  };

  const handleUnstageSelected = async () => {
    const filesToUnstage = Array.from(selectedFiles).filter(path =>
      stagedFiles.some(f => f.path === path)
    );
    if (filesToUnstage.length === 0) return;
    
    setLoading(true);
    try {
      await onUnstageFiles(filesToUnstage);
      setSelectedFiles(new Set());
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardChanges = async (filePath: string) => {
    if (!confirm(`Are you sure you want to discard changes to ${filePath}?`)) return;
    
    setLoading(true);
    try {
      await onDiscardChanges([filePath]);
    } finally {
      setLoading(false);
    }
  };

  const renderFileList = (fileList: FileChange[], title: string, staged: boolean) => {
    if (fileList.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-gray-400 text-sm font-medium">
            {title} ({fileList.length})
          </h4>
          <div className="flex space-x-2">
            {selectedFiles.size > 0 && (
              <button
                onClick={staged ? handleUnstageSelected : handleStageSelected}
                className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
                disabled={loading}
              >
                {staged ? 'Unstage Selected' : 'Stage Selected'}
              </button>
            )}
            <button
              onClick={staged ? handleUnstageAll : handleStageAll}
              className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              {staged ? 'Unstage All' : 'Stage All'}
            </button>
          </div>
        </div>
        
        <div className="space-y-1">
          {fileList.map((file) => (
            <div
              key={file.path}
              className="flex items-center space-x-2 p-2 hover:bg-gray-800/50 rounded group"
            >
              <input
                type="checkbox"
                checked={selectedFiles.has(file.path)}
                onChange={() => toggleFileSelection(file.path)}
                className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                disabled={loading}
              />
              
              <div className="flex items-center space-x-1">
                {getStatusIcon(file.status)}
                <span className="text-xs font-mono text-gray-500">
                  {getStatusLabel(file.status)}
                </span>
              </div>
              
              <span className="flex-1 text-sm text-gray-300 truncate" title={file.path}>
                {file.path}
              </span>
              
              {file.additions !== undefined && file.deletions !== undefined && (
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-green-400">+{file.additions}</span>
                  <span className="text-red-400">-{file.deletions}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onViewDiff(file.path)}
                  className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                  title="View diff"
                  disabled={loading}
                >
                  <Eye className="w-3 h-3" />
                </button>
                {!staged && (
                  <>
                    <button
                      onClick={() => onStageFiles([file.path])}
                      className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-green-400"
                      title="Stage file"
                      disabled={loading}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDiscardChanges(file.path)}
                      className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"
                      title="Discard changes"
                      disabled={loading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                )}
                {staged && (
                  <button
                    onClick={() => onUnstageFiles([file.path])}
                    className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-yellow-400"
                    title="Unstage file"
                    disabled={loading}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
        <FileText className="w-4 h-4" />
        <span>Changes</span>
      </h3>
      
      {files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No changes in working tree</p>
        </div>
      ) : (
        <>
          {renderFileList(stagedFiles, 'Staged Changes', true)}
          {renderFileList(unstagedFiles, 'Changes', false)}
        </>
      )}
    </div>
  );
};