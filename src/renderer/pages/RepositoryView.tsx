import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRepositoryStore } from '../stores/repositoryStore';
import { useGitHubStore } from '../stores/githubStore';
import { RepositoryOverview } from '../components/repository/RepositoryOverview';
import { BranchPanel } from '../components/repository/BranchPanel';
import { ChangesPanel } from '../components/repository/ChangesPanel';
import { CommitHistory } from '../components/repository/CommitHistory';
import { CommitInterface } from '../components/repository/CommitInterface';
import { DiffViewer } from '../components/repository/DiffViewer';
import { GitHubPanel } from '../components/repository/GitHubPanel';
import { OperationsToolbar } from '../components/repository/OperationsToolbar';
import { Loader2 } from 'lucide-react';

const RepositoryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { 
    repositories, 
    detail,
    fetchRepositoryDetails,
    refreshStatus,
    switchBranch,
    createBranch,
    deleteBranch,
    stageFiles,
    unstageFiles,
    commitChanges,
    fetchRemote,
    pullChanges,
    pushChanges,
    getDiff,
  } = useRepositoryStore();
  
  const { isAuthenticated } = useGitHubStore();
  
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const repository = repositories.find(r => r.id === id);

  useEffect(() => {
    if (repository && id) {
      setIsLoading(true);
      fetchRepositoryDetails(id).finally(() => setIsLoading(false));
    }
  }, [id, repository, fetchRepositoryDetails]);

  useEffect(() => {
    if (repository) {
      const interval = setInterval(() => {
        refreshStatus(repository.path);
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
    return undefined;
  }, [repository, refreshStatus]);

  const handleViewDiff = async (file: string) => {
    if (!repository) return;
    const diff = await getDiff(repository.path, file);
    setDiffContent(diff);
    setSelectedDiffFile(file);
  };

  const handleStageFiles = async (files: string[]) => {
    if (!repository) return;
    await stageFiles(repository.path, files);
  };

  const handleUnstageFiles = async (files: string[]) => {
    if (!repository) return;
    await unstageFiles(repository.path, files);
  };

  const handleCommit = async (message: string) => {
    if (!repository) return;
    await commitChanges(repository.path, message);
  };

  const handleDiscardChanges = async (_files: string[]) => {
    if (!repository) return;
    // This would need a git checkout -- <files> implementation
    console.log('Discard changes not yet implemented');
  };

  if (!repository) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Repository not found</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-400">Loading repository details...</p>
        </div>
      </div>
    );
  }

  // Transform git status files into the format expected by ChangesPanel
  const transformFiles = () => {
    if (!detail.gitStatus?.files) return [];
    
    return detail.gitStatus.files.map((file: any) => ({
      path: file.path,
      status: file.working_dir === 'M' ? 'modified' : 
              file.working_dir === 'A' ? 'added' :
              file.working_dir === 'D' ? 'deleted' :
              file.working_dir === '?' ? 'untracked' : 'modified',
      staged: file.index !== ' ' && file.index !== '?',
    }));
  };

  // Transform branches for BranchPanel
  const transformBranches = () => {
    if (!detail.branches) return [];
    
    return detail.branches.map((branchName: string) => ({
      name: branchName,
      current: branchName === detail.currentBranch,
    }));
  };

  // Transform commits for CommitHistory
  const transformCommits = () => {
    if (!detail.commits) return [];
    
    return detail.commits.map((commit: any) => ({
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{repository.name}</h2>
      </div>

      {/* Operations Toolbar */}
      <OperationsToolbar
        lastFetch={repository.lastFetch}
        ahead={detail.gitStatus?.ahead || 0}
        behind={detail.gitStatus?.behind || 0}
        onFetch={() => fetchRemote(repository.path)}
        onPull={() => pullChanges(repository.path)}
        onPush={() => pushChanges(repository.path)}
        onRefresh={() => refreshStatus(repository.path)}
      />

      {/* Repository Overview */}
      <RepositoryOverview
        repository={repository}
        gitStatus={detail.gitStatus}
        remoteInfo={detail.remoteInfo}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Branches & Changes */}
        <div className="space-y-6">
          <BranchPanel
            branches={transformBranches()}
            currentBranch={detail.currentBranch}
            onSwitchBranch={(branch) => switchBranch(repository.path, branch)}
            onCreateBranch={(name) => createBranch(repository.path, name)}
            onDeleteBranch={(name) => deleteBranch(repository.path, name)}
          />
          
          <ChangesPanel
            files={transformFiles()}
            onStageFiles={handleStageFiles}
            onUnstageFiles={handleUnstageFiles}
            onDiscardChanges={handleDiscardChanges}
            onViewDiff={handleViewDiff}
          />
        </div>

        {/* Middle Column - Commit Interface & History */}
        <div className="space-y-6">
          <CommitInterface
            stagedCount={transformFiles().filter((f: any) => f.staged).length}
            onCommit={handleCommit}
          />
          
          <CommitHistory
            commits={transformCommits()}
            onViewCommit={(commit) => console.log('View commit:', commit)}
          />
        </div>

        {/* Right Column - GitHub & Diff */}
        <div className="space-y-6">
          {isAuthenticated && (
            <GitHubPanel
              repoUrl={repository.url}
              onOpenInBrowser={(url) => window.open(url, '_blank')}
            />
          )}
          
          {selectedDiffFile && (
            <DiffViewer
              diff={diffContent}
              fileName={selectedDiffFile}
              onClose={() => setSelectedDiffFile(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RepositoryView;