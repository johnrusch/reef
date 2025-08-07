import React, { useState } from 'react';
import { GitBranch, Check, Plus, Trash2, Search, X } from 'lucide-react';

interface Branch {
  name: string;
  current: boolean;
  lastCommit?: {
    hash: string;
    message: string;
    date: string;
  };
}

interface BranchPanelProps {
  branches: Branch[];
  currentBranch: string;
  onSwitchBranch: (branch: string) => Promise<void>;
  onCreateBranch: (name: string) => Promise<void>;
  onDeleteBranch: (name: string) => Promise<void>;
}

export const BranchPanel: React.FC<BranchPanelProps> = ({
  branches,
  currentBranch,
  onSwitchBranch,
  onCreateBranch,
  onDeleteBranch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSwitchBranch = async (branchName: string) => {
    if (branchName === currentBranch) return;
    setLoading(true);
    try {
      await onSwitchBranch(branchName);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    setLoading(true);
    try {
      await onCreateBranch(newBranchName);
      setNewBranchName('');
      setIsCreating(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (branchName === currentBranch) {
      alert('Cannot delete the current branch');
      return;
    }
    if (!confirm(`Are you sure you want to delete branch "${branchName}"?`)) return;
    
    setLoading(true);
    try {
      await onDeleteBranch(branchName);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center space-x-2">
            <GitBranch className="w-4 h-4" />
            <span>Branches</span>
            <span className="text-gray-500 text-sm">({branches.length})</span>
          </h3>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches..."
            className="w-full bg-gray-800 text-white pl-9 pr-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Create Branch Form */}
      {isCreating && (
        <div className="p-4 border-b border-gray-700 bg-gray-800/50">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="New branch name..."
              className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
              autoFocus
              disabled={loading}
            />
            <button
              onClick={handleCreateBranch}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              disabled={loading || !newBranchName.trim()}
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewBranchName('');
              }}
              className="p-2 hover:bg-gray-700 rounded text-gray-400"
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Branch List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredBranches.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? 'No branches found' : 'No branches'}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredBranches.map((branch) => (
              <div
                key={branch.name}
                className={`p-3 hover:bg-gray-800/50 transition-colors ${
                  branch.current ? 'bg-gray-800/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleSwitchBranch(branch.name)}
                    className="flex-1 flex items-center space-x-2 text-left"
                    disabled={loading || branch.current}
                  >
                    {branch.current && (
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                    <span className={`${branch.current ? 'text-green-400 font-semibold' : 'text-white'}`}>
                      {branch.name}
                    </span>
                  </button>
                  {!branch.current && (
                    <button
                      onClick={() => handleDeleteBranch(branch.name)}
                      className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition-colors"
                      disabled={loading}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {branch.lastCommit && (
                  <div className="mt-1 text-xs text-gray-500 truncate pl-6">
                    {branch.lastCommit.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};