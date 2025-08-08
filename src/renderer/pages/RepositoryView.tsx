import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRepositoryStore } from '../stores/repositoryStore';
import { useGitHubStore } from '../stores/githubStore';
import { RepositoryTabs } from '../components/repository/RepositoryTabs';
import { OperationsButtons } from '../components/repository/OperationsButtons';
import { SyncStatusIndicator } from '../components/repository/SyncStatusIndicator';
import { BranchDropdown } from '../components/repository/BranchDropdown';
import { CommitWorkflowTab } from '../components/tabs/CommitWorkflowTab';
import { RepositoryManagementTab } from '../components/tabs/RepositoryManagementTab';
import { VisualMapTab } from '../components/tabs/VisualMapTab';
import { Loader2 } from 'lucide-react';

const RepositoryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { 
    repositories, 
    detail,
    activeTab,
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
    setActiveTab,
  } = useRepositoryStore();
  
  const { isAuthenticated } = useGitHubStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [operationError, setOperationError] = useState<string | null>(null);
  
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

  // Keyboard shortcuts for tab navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        const tabs: ('commit' | 'management' | 'visualmap')[] = ['commit', 'management', 'visualmap'];
        if (tabs[tabIndex]) {
          setActiveTab(tabs[tabIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setActiveTab]);

  const handleViewDiff = async (file: string) => {
    if (!repository) return '';
    return await getDiff(repository.path, file);
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

  const handleFetch = async () => {
    if (!repository) return;
    try {
      setOperationError(null);
      await fetchRemote(repository.path);
    } catch (error) {
      setOperationError((error as Error).message);
    }
  };

  const handlePull = async () => {
    if (!repository) return;
    try {
      setOperationError(null);
      await pullChanges(repository.path);
    } catch (error) {
      setOperationError((error as Error).message);
    }
  };

  const handlePush = async () => {
    if (!repository) return;
    try {
      setOperationError(null);
      await pushChanges(repository.path);
    } catch (error) {
      setOperationError((error as Error).message);
    }
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'commit':
        return (
          <CommitWorkflowTab
            repository={repository}
            gitStatus={detail.gitStatus}
            branches={detail.branches}
            commits={detail.commits}
            onStageFiles={handleStageFiles}
            onUnstageFiles={handleUnstageFiles}
            onCommit={handleCommit}
            onViewDiff={handleViewDiff}
            onDiscardChanges={handleDiscardChanges}
          />
        );
      
      case 'management':
        return (
          <RepositoryManagementTab
            repoUrl={detail.remoteInfo?.url || repository.url}
            isAuthenticated={isAuthenticated}
          />
        );
      
      case 'visualmap':
        return (
          <VisualMapTab
            repository={repository}
            onNavigateToFile={(path) => console.log('Navigate to:', path)}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">{repository.name}</h2>
          <div className="h-6 w-px bg-gray-700" />
          <BranchDropdown
            branches={detail.branches}
            currentBranch={detail.currentBranch}
            remotes={detail.remoteInfo?.remotes}
            onSwitchBranch={(branch) => switchBranch(repository.path, branch)}
            onCreateBranch={(name) => createBranch(repository.path, name)}
            onDeleteBranch={(name) => deleteBranch(repository.path, name)}
          />
        </div>
        <div className="flex items-center space-x-4">
          <OperationsButtons
            onFetch={handleFetch}
            onPull={handlePull}
            onPush={handlePush}
            ahead={detail.gitStatus?.ahead || 0}
            behind={detail.gitStatus?.behind || 0}
          />
          <SyncStatusIndicator
            ahead={detail.gitStatus?.ahead || 0}
            behind={detail.gitStatus?.behind || 0}
            synced={detail.gitStatus?.ahead === 0 && detail.gitStatus?.behind === 0}
            error={operationError}
          />
        </div>
      </div>

      {/* Tab Navigation and Content */}
      <div className="flex-1 overflow-hidden">
        <RepositoryTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {renderTabContent()}
        </RepositoryTabs>
      </div>
    </div>
  );
};

export default RepositoryView;