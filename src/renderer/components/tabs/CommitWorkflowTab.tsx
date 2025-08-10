import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
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
  repository,
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

  const handleRevertLines = async (lineChanges: any) => {
    if (!repository?.path) return;
    
    try {
      await window.reef.git.revertLines(repository.path, lineChanges.fileName, lineChanges);
      // Refresh the diff after reverting
      if (selectedDiffFile) {
        const newDiff = await onViewDiff(selectedDiffFile);
        setDiffContent(newDiff);
      }
    } catch (error) {
      console.error('Failed to revert lines:', error);
      // TODO: Replace with proper error toast/notification component
      // For now, just log the error - the DiffViewer handles errors internally
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
      <PanelGroup 
        direction="horizontal" 
        className="flex-1 min-h-0"
        autoSaveId="commitWorkflowPanels"
      >
        {/* Left Panel - Changes/History Toggle */}
        <Panel 
          defaultSize={40} 
          minSize={20} 
          maxSize={80}
          className="flex flex-col min-w-0"
        >
          <div className="flex flex-col h-full border-r border-gray-700">
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
            <div className="flex-1 overflow-auto p-4 min-w-0">
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
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

        {/* Right Panel - Dedicated Diff Viewer */}
        <Panel 
          defaultSize={60} 
          minSize={20} 
          maxSize={80}
          className="flex flex-col min-w-0"
        >
          <div className="h-full p-4 overflow-hidden">
            {selectedDiffFile && diffContent ? (
              <DiffViewer
                diff={diffContent}
                fileName={selectedDiffFile}
                onClose={() => {
                  setSelectedDiffFile(null);
                  setDiffContent('');
                }}
                onRevertLines={handleRevertLines}
                repoPath={repository?.path}
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
        </Panel>
      </PanelGroup>
    </div>
  );
};