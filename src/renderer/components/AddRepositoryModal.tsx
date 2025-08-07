import React, { useState } from 'react';
import { X, FolderOpen, GitBranch, AlertCircle, Loader2 } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { useRepositoryStore } from '../stores/repositoryStore';

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddRepositoryModal: React.FC<AddRepositoryModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [repoDetails, setRepoDetails] = useState<{
    name: string;
    path: string;
    branch: string;
    status: any;
  } | null>(null);
  const { addRepository, repositories } = useRepositoryStore();

  const handleSelectDirectory = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const path = await window.reef.dialog.selectDirectory();
      
      if (!path) {
        setIsLoading(false);
        return;
      }

      // Check if repository already exists
      const exists = repositories.some(repo => repo.path === path);
      if (exists) {
        setError('This repository has already been added');
        setIsLoading(false);
        return;
      }

      // Validate it's a git repository
      const status = await window.reef.git.getRepositoryStatus(path);
      
      if (!status) {
        setError('Selected directory is not a valid Git repository');
        setIsLoading(false);
        return;
      }

      setSelectedPath(path);
      setRepoDetails({
        name: path.split('/').pop() || 'Unknown',
        path,
        branch: status.branch || 'main',
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRepository = async () => {
    if (!selectedPath || !repoDetails) return;

    setIsLoading(true);
    setError(null);

    try {
      await addRepository({
        name: repoDetails.name,
        path: selectedPath,
        currentBranch: repoDetails.branch,
        status: repoDetails.status,
      });

      // Reset state and close modal
      setSelectedPath(null);
      setRepoDetails(null);
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedPath(null);
    setRepoDetails(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Add Repository</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <Tabs.Root defaultValue="local" className="w-full">
            <Tabs.List className="flex space-x-1 border-b border-gray-800 mb-6">
              <Tabs.Trigger
                value="local"
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-colors"
              >
                Local Repository
              </Tabs.Trigger>
              <Tabs.Trigger
                value="clone"
                disabled
                className="px-4 py-2 text-sm font-medium text-gray-600 cursor-not-allowed"
              >
                Clone from GitHub (Coming Soon)
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="local" className="space-y-4">
              {!selectedPath ? (
                <div className="text-center py-8">
                  <FolderOpen size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400 mb-4">
                    Select a local Git repository from your file system
                  </p>
                  <button
                    onClick={handleSelectDirectory}
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Selecting...</span>
                      </>
                    ) : (
                      <>
                        <FolderOpen size={16} />
                        <span>Browse for Repository</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <GitBranch size={20} className="text-blue-400 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{repoDetails?.name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-400 mt-1">{selectedPath}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-gray-500">
                            Branch: <span className="text-gray-300">{repoDetails?.branch || 'Unknown'}</span>
                          </span>
                          {repoDetails?.status && (
                            <>
                              <span className="text-xs text-gray-500">
                                Modified: <span className="text-yellow-400">{repoDetails.status.modified || 0}</span>
                              </span>
                              <span className="text-xs text-gray-500">
                                Staged: <span className="text-green-400">{repoDetails.status.staged || 0}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedPath(null);
                        setRepoDetails(null);
                      }}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Select Different Repository
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                  <AlertCircle size={16} className="text-red-400" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </Tabs.Content>

            <Tabs.Content value="clone">
              <div className="text-center py-8 text-gray-500">
                Clone functionality coming soon...
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-800">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddRepository}
            disabled={!selectedPath || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Adding...' : 'Add Repository'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddRepositoryModal;