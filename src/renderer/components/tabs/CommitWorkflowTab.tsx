import React, { useState } from 'react';
import { EnhancedChangesPanel } from '../repository/EnhancedChangesPanel';
import { CommitComposer } from '../repository/CommitComposer';
import { CommitHistory } from '../repository/CommitHistory';
import { DiffViewer } from '../repository/DiffViewer';

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
  const [diffContent] = useState<string>('');

  const handleViewDiff = async (file: string) => {
    const diff = await onViewDiff(file);
    setSelectedDiffFile(file);
    // In a real implementation, we'd set the diff content here
    console.log('Diff content:', diff);
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
    <div className="grid grid-cols-5 gap-4 h-full p-6">
      {/* Left Panel - Changes */}
      <div className="col-span-2 space-y-4 overflow-auto">
        <EnhancedChangesPanel
          files={files}
          supportsCategorization={true}
          onStageFiles={onStageFiles}
          onUnstageFiles={onUnstageFiles}
          onDiscardChanges={onDiscardChanges}
          onViewDiff={handleViewDiff}
        />
      </div>
      
      {/* Right Panel - Commit & History */}
      <div className="col-span-3 space-y-4 overflow-auto">
        <CommitComposer
          stagedCount={stagedCount}
          conventionalCommits={true}
          onCommit={onCommit}
        />
        
        <CommitHistory
          commits={transformCommits()}
          onViewCommit={(commit) => console.log('View commit:', commit)}
        />
        
        {selectedDiffFile && diffContent && (
          <DiffViewer
            diff={diffContent}
            fileName={selectedDiffFile}
            onClose={() => setSelectedDiffFile(null)}
          />
        )}
      </div>
    </div>
  );
};