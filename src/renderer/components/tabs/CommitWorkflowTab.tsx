import React, { useState } from 'react';
import { EnhancedChangesPanel } from '../repository/EnhancedChangesPanel';
import { CommitComposer } from '../repository/CommitComposer';
import { CommitHistory } from '../repository/CommitHistory';
import { DiffViewer } from '../repository/DiffViewer';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CommitWorkflowTabProps {
  repository: any;
  gitStatus: any;
  branches: any[];
  commits: any[];
  onStageFiles: (files: string[]) => Promise<void>;
  onUnstageFiles: (files: string[]) => Promise<void>;
  onCommit: (message: string, type?: string) => Promise<void>;
  onViewDiff: (file: string) => Promise<string>;
  onDiscardChanges: (files: string[]) => Promise<void>;
}

export const CommitWorkflowTab: React.FC<CommitWorkflowTabProps> = ({
  gitStatus,
  commits,
  onStageFiles,
  onUnstageFiles,
  onCommit,
  onViewDiff,
  onDiscardChanges,
}) => {
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string>('');
  const [leftPanelView, setLeftPanelView] = useState<'changes' | 'history'>('changes');
  const [isCommitPanelExpanded, setIsCommitPanelExpanded] = useState(false);

  const handleViewDiff = async (file: string) => {
    try {
      const diff = await onViewDiff(file);
      setSelectedDiffFile(file);
      setDiffContent(diff);
    } catch (error) {
      console.error('Failed to load diff:', error);
      setSelectedDiffFile(file);
      setDiffContent('Error loading diff. Please try again.');
    }
  };

  const transformFiles = () => {
    if (!gitStatus?.files) return [];
    
    return gitStatus.files.map((file: any) => ({
      path: file.path,
      status: file.working_dir === 'M' ? 'modified' : 
              file.working_dir === 'A' ? 'added' :
              file.working_dir === 'D' ? 'deleted' :
              file.working_dir === '?' ? 'untracked' : 'modified',
      staged: file.index !== ' ' && file.index !== '?',
    }));
  };

  const transformCommits = () => {
    if (!commits) return [];
    
    return commits.map((commit: any) => ({
      hash: commit.hash,
      author: {
        name: commit.author_name || 'Unknown',
        email: commit.author_email || '',
      },
      date: commit.date,
      message: commit.message,
      refs: commit.refs,
      body: commit.body,
    }));
  };

  const files = transformFiles();
  const stagedCount = files.filter((f: any) => f.staged).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Collapsible Commit Panel at Top */}
      <div className={`flex-shrink-0 border-b border-gray-700 transition-all duration-300 ${
        isCommitPanelExpanded ? 'max-h-[600px]' : 'max-h-12'
      } overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-3 bg-gray-800 cursor-pointer"
             onClick={() => setIsCommitPanelExpanded(!isCommitPanelExpanded)}>
          <div className="flex items-center space-x-2">
            <span className="text-white font-medium">Commit Message</span>
            {stagedCount > 0 && (
              <span className="text-sm text-green-400">
                ({stagedCount} file{stagedCount !== 1 ? 's' : ''} staged)
              </span>
            )}
          </div>
          {isCommitPanelExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
        {isCommitPanelExpanded && (
          <div className="px-6 py-4">
            <CommitComposer
              stagedCount={stagedCount}
              conventionalCommits={true}
              onCommit={onCommit}
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden" style={{ width: '100%' }}>
        {/* Left Panel (2/5 width) - Changes/History Toggle */}
        <div className="w-2/5 border-r border-gray-700 flex flex-col flex-shrink-0">
          {/* Tab Switcher */}
          <div className="flex border-b border-gray-700">
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                leftPanelView === 'changes'
                  ? 'text-white bg-gray-800 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              onClick={() => setLeftPanelView('changes')}
            >
              Changes
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                leftPanelView === 'history'
                  ? 'text-white bg-gray-800 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              onClick={() => setLeftPanelView('history')}
            >
              History
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {leftPanelView === 'changes' ? (
              <EnhancedChangesPanel
                files={files}
                supportsCategorization={true}
                onStageFiles={onStageFiles}
                onUnstageFiles={onUnstageFiles}
                onDiscardChanges={onDiscardChanges}
                onViewDiff={handleViewDiff}
              />
            ) : (
              <CommitHistory
                commits={transformCommits()}
                onViewCommit={(commit) => console.log('View commit:', commit)}
              />
            )}
          </div>
        </div>

        {/* Right Panel (3/5 width) - Dedicated Diff Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ maxWidth: '60%', minWidth: 0 }}>
          <div className="h-full w-full p-4" style={{ overflow: 'hidden' }}>
            {selectedDiffFile && diffContent ? (
              <DiffViewer
                diff={diffContent}
                fileName={selectedDiffFile}
                onClose={() => {
                  setSelectedDiffFile(null);
                  setDiffContent('');
                }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-500 mb-2">No file selected</div>
                  <div className="text-sm text-gray-600">
                    Select a file from the Changes panel to view its diff
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};