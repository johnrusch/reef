import React, { useState, useMemo } from 'react';
import { 
  GitBranch, Search, Plus, Trash2, ChevronRight, 
  ChevronDown, Globe, HardDrive, Check 
} from 'lucide-react';

interface Branch {
  name: string;
  current?: boolean;
  remote?: boolean;
}

interface BranchTreeViewProps {
  branches: (Branch | string)[];
  currentBranch: string;
  remotes?: any[];
  searchable?: boolean;
  onSwitchBranch: (branch: string) => Promise<void>;
  onCreateBranch: (name: string) => Promise<void>;
  onDeleteBranch: (name: string) => Promise<void>;
}

export const BranchTreeView: React.FC<BranchTreeViewProps> = ({
  branches,
  currentBranch,
  searchable = false,
  onSwitchBranch,
  onCreateBranch,
  onDeleteBranch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['local', 'remote'])
  );

  const normalizedBranches = useMemo(() => {
    return branches.map(b => {
      if (typeof b === 'string') {
        return {
          name: b,
          current: b === currentBranch,
          remote: b.includes('origin/'),
        };
      }
      return {
        ...b,
        current: b.name === currentBranch,
      };
    });
  }, [branches, currentBranch]);

  const { localBranches, remoteBranches } = useMemo(() => {
    const filtered = normalizedBranches.filter(branch =>
      !searchQuery || branch.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
      localBranches: filtered.filter(b => !b.remote && !b.name.includes('origin/')),
      remoteBranches: filtered.filter(b => b.remote || b.name.includes('origin/')),
    };
  }, [normalizedBranches, searchQuery]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    await onCreateBranch(newBranchName);
    setNewBranchName('');
    setShowCreateForm(false);
  };

  const handleSwitchBranch = async (branchName: string) => {
    if (branchName === currentBranch) return;
    await onSwitchBranch(branchName);
  };

  const renderBranch = (branch: Branch) => {
    const isRemote = branch.remote || branch.name.includes('origin/');
    const displayName = branch.name.replace('origin/', '');
    const isCurrent = branch.current || branch.name === currentBranch;

    return (
      <div
        key={branch.name}
        className={`flex items-center justify-between px-3 py-2 rounded hover:bg-gray-800 transition-colors ${
          isCurrent ? 'bg-gray-800 border-l-2 border-blue-500' : ''
        }`}
      >
        <button
          onClick={() => !isRemote && handleSwitchBranch(branch.name)}
          className="flex items-center space-x-2 flex-1 text-left"
          disabled={isRemote}
        >
          <GitBranch className={`w-4 h-4 ${isCurrent ? 'text-blue-400' : 'text-gray-400'}`} />
          <span className={`text-sm ${isCurrent ? 'text-white font-medium' : 'text-gray-300'}`}>
            {displayName}
          </span>
          {isCurrent && <Check className="w-3 h-3 text-blue-400" />}
        </button>
        
        {!isRemote && !isCurrent && (
          <button
            onClick={() => onDeleteBranch(branch.name)}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition-colors"
            title="Delete branch"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    branches: Branch[],
    sectionKey: string
  ) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="space-y-2">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center justify-between w-full px-2 py-1 hover:bg-gray-800 rounded transition-colors"
        >
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            {icon}
            <span className="text-sm font-medium text-gray-300">{title}</span>
            <span className="text-xs text-gray-500">({branches.length})</span>
          </div>
        </button>
        
        {isExpanded && (
          <div className="ml-4 space-y-1">
            {branches.length === 0 ? (
              <p className="text-xs text-gray-500 px-3 py-2">No branches</p>
            ) : (
              branches.map(renderBranch)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <GitBranch className="w-5 h-5" />
          <span>Branches</span>
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          title="Create new branch"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>

      {searchable && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches..."
            className="w-full bg-gray-800 text-white pl-9 pr-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
          />
        </div>
      )}

      {showCreateForm && (
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Branch name"
              className="flex-1 bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleCreateBranch()}
            />
            <button
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewBranchName('');
              }}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {renderSection(
          'Local Branches',
          <HardDrive className="w-4 h-4 text-gray-400" />,
          localBranches,
          'local'
        )}
        
        {renderSection(
          'Remote Branches',
          <Globe className="w-4 h-4 text-gray-400" />,
          remoteBranches,
          'remote'
        )}
      </div>
    </div>
  );
};