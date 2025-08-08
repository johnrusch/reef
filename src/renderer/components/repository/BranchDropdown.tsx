import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  GitBranch, Search, Plus, Trash2, ChevronDown, 
  Globe, HardDrive, Check 
} from 'lucide-react';

interface Branch {
  name: string;
  current?: boolean;
  remote?: boolean;
}

interface BranchDropdownProps {
  branches: (Branch | string)[];
  currentBranch: string;
  remotes?: any[];
  onSwitchBranch: (branch: string) => Promise<void>;
  onCreateBranch: (name: string) => Promise<void>;
  onDeleteBranch: (name: string) => Promise<void>;
}

export const BranchDropdown: React.FC<BranchDropdownProps> = ({
  branches,
  currentBranch,
  onSwitchBranch,
  onCreateBranch,
  onDeleteBranch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
        setSearchQuery('');
        setNewBranchName('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    // Focus search input when dropdown opens using requestAnimationFrame for better timing
    const focusTimeout = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      cancelAnimationFrame(focusTimeout);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowCreateForm(false);
        setSearchQuery('');
        setNewBranchName('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const normalizedBranches = useMemo(() => {
    return branches.map(b => {
      if (typeof b === 'string') {
        const isRemote = b.startsWith('origin/') || b.includes('/origin/');
        return {
          name: b,
          current: b === currentBranch,
          remote: isRemote,
        };
      }
      // Ensure remote property is consistently set
      const isRemote = b.remote || b.name.startsWith('origin/') || b.name.includes('/origin/');
      return {
        ...b,
        current: b.name === currentBranch,
        remote: isRemote,
      };
    });
  }, [branches, currentBranch]);

  const { localBranches, remoteBranches } = useMemo(() => {
    const filtered = normalizedBranches.filter(branch =>
      !searchQuery || branch.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
      localBranches: filtered.filter(b => !b.remote),
      remoteBranches: filtered.filter(b => b.remote),
    };
  }, [normalizedBranches, searchQuery]);

  // Validate branch name according to Git rules
  const validateBranchName = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return 'Branch name cannot be empty';
    
    // Git branch name rules
    if (trimmed.startsWith('.') || trimmed.startsWith('-')) {
      return 'Branch name cannot start with . or -';
    }
    if (trimmed.endsWith('/') || trimmed.endsWith('.')) {
      return 'Branch name cannot end with / or .';
    }
    if (/[\s~^:?*[\]@{]/.test(trimmed)) {
      return 'Branch name contains invalid characters';
    }
    if (trimmed.includes('..') || trimmed.includes('//')) {
      return 'Branch name cannot contain .. or //';
    }
    return null;
  };

  const handleCreateBranch = async () => {
    const trimmedName = newBranchName.trim();
    const validationError = validateBranchName(trimmedName);
    
    if (validationError) {
      alert(validationError); // Using alert for now, should be replaced with toast
      return;
    }
    
    setLoading(true);
    try {
      await onCreateBranch(trimmedName);
      setNewBranchName('');
      setShowCreateForm(false);
      setIsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create branch';
      alert(`Error: ${message}`); // Using alert for now, should be replaced with toast
      console.error('Failed to create branch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    if (branchName === currentBranch) return;
    setLoading(true);
    try {
      await onSwitchBranch(branchName);
      setIsOpen(false);
      setSearchQuery('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to switch branch';
      alert(`Error: ${message}`); // Using alert for now, should be replaced with toast
      console.error('Failed to switch branch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branchName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Using native confirm for now, should be replaced with a modal component
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`Are you sure you want to delete branch "${branchName}"?`)) {
      setLoading(true);
      try {
        await onDeleteBranch(branchName);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete branch';
        alert(`Error: ${message}`); // Using alert for now, should be replaced with toast
        console.error('Failed to delete branch:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderBranch = (branch: Branch) => {
    const isRemote = branch.remote;
    const displayName = branch.name.replace(/^origin\//, '');
    const isCurrent = branch.current || branch.name === currentBranch;

    return (
      <button
        key={branch.name}
        onClick={() => !isRemote && handleSwitchBranch(branch.name)}
        disabled={isRemote || loading}
        className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-700 transition-colors ${
          isCurrent ? 'bg-gray-700' : ''
        } ${isRemote ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center space-x-2">
          <GitBranch className={`w-4 h-4 ${isCurrent ? 'text-blue-400' : 'text-gray-400'}`} />
          <span className={`text-sm ${isCurrent ? 'text-white font-medium' : 'text-gray-300'}`}>
            {displayName}
          </span>
          {isCurrent && <Check className="w-3 h-3 text-blue-400" />}
        </div>
        
        {!isRemote && !isCurrent && (
          <button
            onClick={(e) => handleDeleteBranch(branch.name, e)}
            className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition-colors"
            title="Delete branch"
            disabled={loading}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </button>
    );
  };

  const displayBranchName = currentBranch.length > 20 
    ? `${currentBranch.substring(0, 20)}...` 
    : currentBranch;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors border border-gray-700"
        disabled={loading}
      >
        <GitBranch className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-white font-medium">{displayBranchName}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search branches..."
                className="w-full bg-gray-900 text-white pl-9 pr-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Create Branch Form */}
          {showCreateForm ? (
            <div className="p-3 border-b border-gray-700 bg-gray-900">
              <div className="space-y-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="New branch name"
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateBranch()}
                  disabled={loading}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateBranch}
                    disabled={!newBranchName.trim() || loading}
                    className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewBranchName('');
                    }}
                    disabled={loading}
                    className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-700 transition-colors border-b border-gray-700"
              disabled={loading}
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400">New Branch</span>
            </button>
          )}

          {/* Branch Lists */}
          <div className="flex-1 overflow-y-auto">
            {/* Local Branches */}
            {localBranches.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-gray-900 border-b border-gray-700">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-400 uppercase">Local</span>
                    <span className="text-xs text-gray-500">({localBranches.length})</span>
                  </div>
                </div>
                <div>
                  {localBranches.map(renderBranch)}
                </div>
              </div>
            )}

            {/* Remote Branches */}
            {remoteBranches.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-gray-900 border-b border-gray-700">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-400 uppercase">Remote</span>
                    <span className="text-xs text-gray-500">({remoteBranches.length})</span>
                  </div>
                </div>
                <div>
                  {remoteBranches.map(renderBranch)}
                </div>
              </div>
            )}

            {/* No results message */}
            {localBranches.length === 0 && remoteBranches.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? 'No branches found' : 'No branches available'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};